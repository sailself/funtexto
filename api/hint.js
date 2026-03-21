import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './utils/logger.js';
import { getGameByIdOrLatest, getRelatedWordsForGame } from './utils/gameRepository.js';

const hasGoogleApiKey = Boolean(process.env.GOOGLE_API_KEY?.trim());
const genAI = hasGoogleApiKey ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

function normalizeWord(word) {
  return typeof word === 'string' ? word.trim().toLowerCase() : '';
}

function pickHintFromList(wordList, currentBestGuess, difficulty) {
  if (wordList.length === 0) {
    return null;
  }

  const normalizedGuess = normalizeWord(currentBestGuess);
  const normalizedDifficulty = difficulty || 'medium';

  if (!normalizedGuess) {
    const starterIndexByDifficulty = {
      easy: 10,
      medium: 35,
      hard: 80,
    };

    const starterIndex = starterIndexByDifficulty[normalizedDifficulty] ?? starterIndexByDifficulty.medium;
    return wordList[Math.min(wordList.length - 1, starterIndex)] || null;
  }

  const currentIndex = wordList.indexOf(normalizedGuess);
  if (currentIndex === -1) {
    return wordList[wordList.length - 1] || null;
  }

  if (currentIndex === 0) {
    return null;
  }

  let hintIndex = currentIndex - 1;
  if (normalizedDifficulty === 'easy') {
    hintIndex = Math.max(0, Math.floor(currentIndex / 2));
  } else if (normalizedDifficulty === 'hard') {
    hintIndex = Math.max(0, currentIndex - Math.max(1, Math.ceil(currentIndex * 0.15)));
  }

  if (hintIndex >= currentIndex) {
    hintIndex = currentIndex - 1;
  }

  return wordList[hintIndex] || null;
}

async function generateModelHint(targetWord, currentBestGuess) {
  if (!genAI) {
    return null;
  }

  const condition = currentBestGuess
    ? `My best guess so far is "${currentBestGuess}". Give me one single word that is semantically closer to "${targetWord}" than "${currentBestGuess}".`
    : `Give me one single word that is semantically related to "${targetWord}".`;

  const prompt = `
    The secret word is "${targetWord}".
    ${condition}
    Do not return the secret word itself.
    Output only one lowercase word with no punctuation.
  `;

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim().toLowerCase();
  const sanitizedHint = rawText.replace(/[^a-z-]/g, ' ').split(/\s+/).find(Boolean) || null;

  if (!sanitizedHint || sanitizedHint === targetWord.toLowerCase()) {
    return null;
  }

  return sanitizedHint;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const game = getGameByIdOrLatest(req.body?.gameId);
    if (!game) {
      return res.status(404).json({ error: 'No active game found' });
    }

    const wordList = getRelatedWordsForGame(game.id).map((row) => row.word);
    const listHint = pickHintFromList(wordList, req.body?.currentBestGuess, req.body?.difficulty);

    if (listHint) {
      return res.status(200).json({ hint: listHint });
    }

    const generatedHint = await generateModelHint(game.target_word, req.body?.currentBestGuess);
    return res.status(200).json({ hint: generatedHint });
  } catch (error) {
    logger.error('Hint generation failed', {
      error: error.message,
    });

    return res.status(500).json({ error: 'Failed to generate hint' });
  }
}
