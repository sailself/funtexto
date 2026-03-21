import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../db/index.js';
import logger from './logger.js';

const hasGoogleApiKey = Boolean(process.env.GOOGLE_API_KEY?.trim());
const genAI = hasGoogleApiKey ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
const generationPromises = new Map();

const clearRelatedWordsStmt = db.prepare('DELETE FROM related_words WHERE game_id = ?');
const insertRelatedWordStmt = db.prepare(`
  INSERT INTO related_words (game_id, word, rank, similarity)
  VALUES (?, ?, ?, ?)
`);

function getModel() {
  if (!genAI) {
    throw new Error('GOOGLE_API_KEY is required to generate related words');
  }

  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });
}

function normalizeGeneratedWords(text, target) {
  return [...new Set(
    text
      .split(/[\n,]+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word && word !== target.toLowerCase() && !word.includes(' '))
  )];
}

export function getWordListFromDB(gameId) {
  return db
    .prepare('SELECT word, rank, similarity FROM related_words WHERE game_id = ? ORDER BY rank ASC')
    .all(gameId);
}

export async function generateWordListForGame(gameId, target) {
  const generationKey = `${gameId}:${target.toLowerCase()}`;
  if (generationPromises.has(generationKey)) {
    return generationPromises.get(generationKey);
  }

  const generationPromise = (async () => {
    logger.info(`Generating related words for game ${gameId}`, { target });

    const prompt = `
      Generate a list of 200 unique single words that are semantically related to "${target}".
      Sort them by closeness to "${target}" with the closest words first.
      Do not include "${target}" itself.
      Do not include phrases or punctuation.
      Output only the comma-separated word list.
    `;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const generatedWords = normalizeGeneratedWords(result.response.text(), target);

    if (generatedWords.length < 25) {
      throw new Error(`Generated word list for "${target}" was too short`);
    }

    const storeWordList = db.transaction((words) => {
      clearRelatedWordsStmt.run(gameId);

      words.forEach((word, index) => {
        const rank = index + 2;
        const similarity = Math.max(0.4, 0.99 - index * 0.001);
        insertRelatedWordStmt.run(gameId, word, rank, similarity);
      });
    });

    storeWordList(generatedWords);
    logger.info(`Stored ${generatedWords.length} related words for game ${gameId}`, { target });

    return generatedWords;
  })();

  generationPromises.set(generationKey, generationPromise);

  try {
    return await generationPromise;
  } finally {
    generationPromises.delete(generationKey);
  }
}
