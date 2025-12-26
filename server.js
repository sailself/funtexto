import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import guessHandler from './api/guess.js';
import hintHandler from './api/hint.js';
import revealHandler from './api/reveal.js';
import logger from './api/utils/logger.js';

const app = express();
app.use(express.json());
app.use(cors());

// Use morgan for HTTP request logging, piping to winston
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Shim for Vercel req/res style if needed, but Express is mostly compatible
// We just need to wrap the async handler
const wrap = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (e) {
        logger.error(e.message, { stack: e.stack });
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.post('/api/guess', wrap(guessHandler));
app.post('/api/hint', wrap(hintHandler));
app.get('/api/reveal', wrap(revealHandler));
app.post('/api/reveal', wrap(revealHandler));

const PORT = 3000;
app.listen(PORT, () => {
    logger.info(`API Server running on http://localhost:${PORT}`);
});
