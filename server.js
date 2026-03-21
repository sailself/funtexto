import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import db from './api/db/index.js';
import guessHandler from './api/guess.js';
import hintHandler from './api/hint.js';
import nearbyHandler from './api/nearby.js';
import revealHandler from './api/reveal.js';
import userRouter from './api/user.js';
import { generateNewGameIfNeeded } from './api/utils/gameGenerator.js';
import logger from './api/utils/logger.js';
import { DEFAULT_GAME_GENERATION_INTERVAL, parseGameGenerationIntervalMs } from './api/utils/gameSchedule.js';

const app = express();
const allowedCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ensureUserStmt = db.prepare(`
  INSERT OR IGNORE INTO users (id, display_name)
  VALUES (?, ?)
`);
const selectAllGamesStmt = db.prepare(`
  SELECT id, game_number, created_at
  FROM games
  ORDER BY id DESC
`);
const selectLatestGameStmt = db.prepare(`
  SELECT id, game_number, created_at
  FROM games
  ORDER BY id DESC
  LIMIT 1
`);

function resolveCorsOrigin(origin, callback) {
  if (!origin || allowedCorsOrigins.length === 0 || allowedCorsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  logger.warn('Blocked request from disallowed CORS origin', { origin });
  callback(new Error('Origin not allowed by CORS'));
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      logger.error('Unhandled route error', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  }),
);

app.use((req, res, next) => {
  let userId = req.cookies.funtexto_uid;
  if (!userId) {
    userId = uuidv4();
    res.cookie('funtexto_uid', userId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  try {
    ensureUserStmt.run(userId, 'Anonymous');
  } catch (error) {
    logger.error('Failed to ensure user exists', { error: error.message });
  }

  req.user = { id: userId };
  next();
});

morgan.token('user-id', (req) => req.user?.id || 'anon');
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms [user=:user-id]', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

app.post('/api/guess', wrap(guessHandler));
app.post('/api/hint', wrap(hintHandler));
app.get('/api/reveal', wrap(revealHandler));
app.post('/api/reveal', wrap(revealHandler));
app.get('/api/nearby', wrap(nearbyHandler));

app.get(
  '/api/games',
  wrap(async (_req, res) => {
    res.json({ games: selectAllGamesStmt.all() });
  }),
);

app.get(
  '/api/games/latest',
  wrap(async (_req, res) => {
    const game = selectLatestGameStmt.get();
    if (!game) {
      res.status(404).json({ error: 'No games found' });
      return;
    }

    res.json(game);
  }),
);

app.use('/api/user', userRouter);

const port = Number(process.env.PORT) || 3000;
const intervalLabel = process.env.GAME_GENERATION_INTERVAL || DEFAULT_GAME_GENERATION_INTERVAL;
const intervalMs = parseGameGenerationIntervalMs(intervalLabel);

let generationCheckPromise = null;

async function runGenerationCheck() {
  if (generationCheckPromise) {
    return generationCheckPromise;
  }

  generationCheckPromise = (async () => {
    try {
      await generateNewGameIfNeeded();
    } catch (error) {
      logger.error('Game generation check failed', { error: error.message });
    } finally {
      generationCheckPromise = null;
    }
  })();

  return generationCheckPromise;
}

app.listen(port, async () => {
  logger.info(`API Server running on http://localhost:${port}`);
  logger.info('Game generation schedule configured', {
    intervalLabel,
    intervalMs,
  });

  await runGenerationCheck();
  setInterval(() => {
    void runGenerationCheck();
  }, intervalMs);
});
