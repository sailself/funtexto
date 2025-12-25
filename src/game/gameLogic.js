import wordsData from './words.json';

const TARGET_WORD = wordsData.target;
const RANKINGS = wordsData.rankings;

export const checkGuess = (guess) => {
  const normalizedGuess = guess.trim().toLowerCase();

  // If exact match
  if (normalizedGuess === TARGET_WORD) {
    return { word: normalizedGuess, rank: 1, dist: 0 };
  }

  // Get rank from predefined list
  let rank = RANKINGS[normalizedGuess];

  // If not in top list, generate a pseudo-rank based on length/randomness 
  // to simulate a "cold" word, but keep it deterministic for the same word.
  if (!rank) {
    // Hash function to get consistent rank for unknown words
    let hash = 0;
    for (let i = 0; i < normalizedGuess.length; i++) {
      hash = ((hash << 5) - hash) + normalizedGuess.charCodeAt(i);
      hash |= 0;
    }
    // Map to range 1001 - 50000
    rank = 1001 + (Math.abs(hash) % 49000);
  }

  return { word: normalizedGuess, rank };
};

export const getTargetWord = () => TARGET_WORD;

export const saveGame = (guesses, won, gameId) => {
  localStorage.setItem('funtexto_game_state', JSON.stringify({
    guesses,
    won,
    gameId,
    timestamp: Date.now()
  }));
};

export const loadGame = () => {
  const saved = localStorage.getItem('funtexto_game_state');
  if (saved) return JSON.parse(saved);
  return null;
};
