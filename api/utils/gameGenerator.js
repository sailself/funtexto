import db from '../db/index.js';
import logger from './logger.js';
import { DEFAULT_GAME_GENERATION_INTERVAL, parseGameGenerationIntervalMs } from './gameSchedule.js';
import { generateWordListForGame } from './wordCache.js';

const latestGameWithTimestampStmt = db.prepare(`
  SELECT id, target_word, game_number, strftime('%s', created_at) * 1000 AS created_ts
  FROM games
  ORDER BY id DESC
  LIMIT 1
`);
const usedTargetsStmt = db.prepare('SELECT target_word FROM games');
const nextGameNumberStmt = db.prepare('SELECT COALESCE(MAX(game_number), 0) + 1 AS next_game_number FROM games');
const insertGameStmt = db.prepare('INSERT INTO games (target_word, game_number) VALUES (?, ?)');
const deleteRelatedWordsStmt = db.prepare('DELETE FROM related_words WHERE game_id = ?');
const deleteGameStmt = db.prepare('DELETE FROM games WHERE id = ?');

async function loadTargets() {
  const { default: targets } = await import('../targets.json', { with: { type: 'json' } });
  return targets;
}

async function pickNextTarget() {
  const targets = await loadTargets();
  const usedTargets = new Set(usedTargetsStmt.all().map((row) => row.target_word));
  const availableTargets = targets.filter((target) => !usedTargets.has(target));

  if (availableTargets.length > 0) {
    return availableTargets[Math.floor(Math.random() * availableTargets.length)];
  }

  const latestGame = latestGameWithTimestampStmt.get();
  const recyclableTargets = latestGame
    ? targets.filter((target) => target !== latestGame.target_word)
    : targets;

  return recyclableTargets[Math.floor(Math.random() * recyclableTargets.length)];
}

export async function generateNewGameIfNeeded() {
  const intervalLabel = process.env.GAME_GENERATION_INTERVAL || DEFAULT_GAME_GENERATION_INTERVAL;
  const intervalMs = parseGameGenerationIntervalMs(intervalLabel);
  const latestGame = latestGameWithTimestampStmt.get();

  if (!latestGame) {
    logger.info('No games found. Creating the first game.');
    await createNewGame();
    return;
  }

  const timeSinceLatestGame = Date.now() - latestGame.created_ts;
  logger.info('Checked game generation interval', {
    latestGameId: latestGame.id,
    latestGameNumber: latestGame.game_number,
    timeSinceLatestGame,
    intervalMs,
  });

  if (timeSinceLatestGame >= intervalMs) {
    await createNewGame();
  }
}

async function createNewGame(retryCount = 0) {
  if (retryCount >= 5) {
    throw new Error('Max retries reached while generating a new game');
  }

  const target = await pickNextTarget();
  const nextGameNumber = nextGameNumberStmt.get().next_game_number;
  let gameId = null;

  try {
    const insertResult = insertGameStmt.run(target, nextGameNumber);
    gameId = insertResult.lastInsertRowid;

    logger.info(`Created game #${nextGameNumber}`, { gameId, target });
    await generateWordListForGame(gameId, target);
  } catch (error) {
    logger.error('Failed to create game', {
      error: error.message,
      retryCount,
      target,
      gameId,
    });

    if (gameId) {
      deleteRelatedWordsStmt.run(gameId);
      deleteGameStmt.run(gameId);
    }

    await createNewGame(retryCount + 1);
  }
}
