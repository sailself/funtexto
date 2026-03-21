import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db/index.js';
import logger from './utils/logger.js';
import {
  countRelatedWordsForGame,
  getGameByIdOrLatest,
  getRelatedWordForGame,
} from './utils/gameRepository.js';

const hasGoogleApiKey = Boolean(process.env.GOOGLE_API_KEY?.trim());
const genAI = hasGoogleApiKey ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
const primaryModelName = process.env.EMBEDDING_MODEL || 'text-embedding-004';
const fallbackModelName = 'text-embedding-004';
const embeddingCache = new Map();

const selectPlayStmt = db.prepare(`
  SELECT id, status
  FROM play_history
  WHERE user_id = ? AND game_id = ?
  ORDER BY id DESC
  LIMIT 1
`);
const insertPlayStmt = db.prepare(`
  INSERT INTO play_history (user_id, game_id)
  VALUES (?, ?)
`);
const selectDuplicateGuessStmt = db.prepare(`
  SELECT rank, similarity
  FROM guesses
  WHERE play_id = ? AND word = ?
  ORDER BY timestamp DESC, rowid DESC
  LIMIT 1
`);
const insertGuessStmt = db.prepare(`
  INSERT INTO guesses (play_id, word, rank, similarity)
  VALUES (?, ?, ?, ?)
`);
const incrementGuessCountStmt = db.prepare(`
  UPDATE play_history
  SET guesses_count = guesses_count + 1
  WHERE id = ?
`);
const markPlayWonStmt = db.prepare(`
  UPDATE play_history
  SET status = 'won', finished_at = CURRENT_TIMESTAMP
  WHERE id = ? AND status = 'playing'
`);

function createEmbeddingModel(modelName) {
  if (!genAI) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  return genAI.getGenerativeModel({ model: modelName });
}

async function getEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  const tryEmbedding = async (modelName) => {
    const model = createEmbeddingModel(modelName);
    const result = await model.embedContent(text);
    return result.embedding.values;
  };

  try {
    const embedding = await tryEmbedding(primaryModelName);
    if (embeddingCache.size > 1000) {
      embeddingCache.clear();
    }
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    if (primaryModelName !== fallbackModelName) {
      const fallbackEmbedding = await tryEmbedding(fallbackModelName);
      if (embeddingCache.size > 1000) {
        embeddingCache.clear();
      }
      embeddingCache.set(text, fallbackEmbedding);
      return fallbackEmbedding;
    }

    throw error;
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < vecA.length; index += 1) {
    dotProduct += vecA[index] * vecB[index];
    normA += vecA[index] * vecA[index];
    normB += vecB[index] * vecB[index];
  }

  if (!normA || !normB) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRank(similarity) {
  if (similarity >= 0.999) {
    return 1;
  }

  const baseRank = Math.floor(Math.exp(17 * (1 - similarity)));
  return Math.max(2, baseRank);
}

function normalizeGuess(rawGuess) {
  return typeof rawGuess === 'string' ? rawGuess.trim().toLowerCase() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const guess = normalizeGuess(req.body?.guess);
  if (!guess) {
    return res.status(400).json({ error: 'Guess is required' });
  }

  if (guess.length > 64) {
    return res.status(400).json({ error: 'Guess is too long' });
  }

  try {
    const game = getGameByIdOrLatest(req.body?.gameId);
    if (!game) {
      return res.status(404).json({ error: 'No active game found' });
    }

    const userId = req.user?.id ?? null;
    let play = userId ? selectPlayStmt.get(userId, game.id) : null;

    if (userId && !play) {
      const insertResult = insertPlayStmt.run(userId, game.id);
      play = {
        id: insertResult.lastInsertRowid,
        status: 'playing',
      };
    }

    const relatedWordCount = countRelatedWordsForGame(game.id);
    if (play) {
      const duplicateGuess = selectDuplicateGuessStmt.get(play.id, guess);
      if (duplicateGuess) {
        return res.status(200).json({
          word: guess,
          rank: duplicateGuess.rank,
          similarity: duplicateGuess.similarity,
          cached: duplicateGuess.rank <= relatedWordCount + 1,
          duplicate: true,
          gameId: game.id,
          gameNumber: game.game_number,
        });
      }
    }

    let rank = 1;
    let similarity = 1;
    let cached = false;

    if (guess !== game.target_word.toLowerCase()) {
      const cachedWord = getRelatedWordForGame(game.id, guess);
      if (cachedWord) {
        rank = cachedWord.rank;
        similarity = cachedWord.similarity;
        cached = true;
      } else {
        const [targetEmbedding, guessEmbedding] = await Promise.all([
          getEmbedding(game.target_word.toLowerCase()),
          getEmbedding(guess),
        ]);

        similarity = cosineSimilarity(targetEmbedding, guessEmbedding);
        rank = calculateRank(similarity) + relatedWordCount + 1;
      }
    }

    if (play) {
      const recordGuess = db.transaction(() => {
        insertGuessStmt.run(play.id, guess, rank, similarity);
        incrementGuessCountStmt.run(play.id);

        if (rank === 1) {
          markPlayWonStmt.run(play.id);
        }
      });

      recordGuess();
    }

    return res.status(200).json({
      word: guess,
      rank,
      similarity,
      cached,
      duplicate: false,
      gameId: game.id,
      gameNumber: game.game_number,
    });
  } catch (error) {
    const statusCode = error.message.includes('GOOGLE_API_KEY') ? 503 : 500;
    logger.error('Guess processing failed', {
      error: error.message,
      guess,
    });

    return res.status(statusCode).json({
      error: 'Failed to process guess',
      details: error.message,
    });
  }
}
