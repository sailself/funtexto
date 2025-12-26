export const getDailyGameId = () => {
  const startDate = new Date('2024-01-01').getTime();
  const today = new Date().getTime();
  return Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
};

export const getRandomGameId = () => {
  // Generate a reasonably large random integer for an ID
  return Math.floor(Math.random() * 100000);
};

export const checkGuess = async (guess, gameId) => {
  try {
    const response = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess, gameId })
    });

    if (!response.ok) {
      throw new Error('API Error');
    }

    const data = await response.json();
    // API returns { rank, similarity, word }
    // We add a 'dist' for compatibility if needed, though rank is primary
    return {
      word: data.word,
      rank: data.rank,
      similarity: data.similarity
    };
  } catch (error) {
    console.error("Guess check failed:", error);
    return null;
  }
};

export const getHint = async (bestGuessWord, gameId) => {
  try {
    const response = await fetch('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentBestGuess: bestGuessWord, gameId })
    });
    const data = await response.json();
    return data.hint;
  } catch (error) {
    console.error("Hint failed:", error);
    return null;
  }
};

export const getSecretWord = async (gameId) => {
  try {
    const response = await fetch(`/api/reveal?gameId=${gameId}`);
    const data = await response.json();
    return data.word;
  } catch (e) {
    console.error("Reveal failed", e);
    return "Unknown";
  }
};

export const saveGame = (guesses, won, gameId) => {
  localStorage.setItem('funtexto_game_state', JSON.stringify({
    guesses,
    won,
    gameId,
    timestamp: Date.now()
  }));
};

export const updateStats = (gameId, won) => {
  const stats = JSON.parse(localStorage.getItem('funtexto_stats') || '{"played":0,"won":0,"lastGameId":null}');

  // Only update if we haven't tracked this game yet
  if (stats.lastGameId !== gameId) {
    stats.played += 1;
    if (won) stats.won += 1;
    stats.lastGameId = gameId;
    localStorage.setItem('funtexto_stats', JSON.stringify(stats));
  } else if (won && !stats.won_this_game_flag_check) {
    // Edge case: maybe they played but didn't win, then came back and won? 
    // Simpler for now: just track lastGameId. 
    // If we want to be robust: lastGameId should map to a status.
    // For this MVP, let's just increment won if we hadn't already. But 'won' is passed when finished.
    // Let's rely on the caller to call this ONLY when the game finishes.
  }
};

export const loadGame = () => {
  const saved = localStorage.getItem('funtexto_game_state');
  if (saved) return JSON.parse(saved);
  return null;
};

export const resetGame = () => {
  localStorage.removeItem('funtexto_game_state');
};
