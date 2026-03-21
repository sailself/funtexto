const GAME_STATE_KEY = 'funtexto_game_states';
const LEGACY_GAME_STATE_KEY = 'funtexto_game_state';
const SETTINGS_KEY = 'funtexto_settings';
const STATS_KEY = 'funtexto_stats';
const MAX_SAVED_GAMES = 20;

const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'en',
  hintDifficulty: 'medium',
  sortBy: 'similarity',
};

const DEFAULT_STATS = {
  played: 0,
  won: 0,
  resultsByGame: {},
};

function parseStoredJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`Failed to parse ${key}`, error);
    return fallbackValue;
  }
}

function normalizeSavedGame(savedGame) {
  if (!savedGame || typeof savedGame !== 'object') {
    return null;
  }

  const guesses = Array.isArray(savedGame.guesses)
    ? savedGame.guesses
        .filter((guess) => guess && typeof guess.word === 'string' && Number.isFinite(guess.rank))
        .map((guess, index) => ({
          word: guess.word,
          rank: guess.rank,
          similarity: Number.isFinite(guess.similarity) ? guess.similarity : null,
          guessNumber: Number.isFinite(guess.guessNumber) ? guess.guessNumber : index + 1,
        }))
    : [];

  const gameId = Number(savedGame.gameId);
  if (!Number.isFinite(gameId)) {
    return null;
  }

  return {
    gameId,
    guesses,
    finished: Boolean(savedGame.finished ?? savedGame.won),
    outcome: savedGame.outcome ?? (savedGame.won ? 'won' : null),
    targetWord: typeof savedGame.targetWord === 'string' ? savedGame.targetWord : '',
    updatedAt: Number(savedGame.updatedAt ?? savedGame.timestamp ?? Date.now()),
  };
}

function readSavedGameMap() {
  const parsedValue = parseStoredJson(GAME_STATE_KEY, null);

  if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
    return Object.entries(parsedValue).reduce((accumulator, [gameId, savedGame]) => {
      const normalizedGame = normalizeSavedGame({ ...savedGame, gameId });
      if (normalizedGame) {
        accumulator[gameId] = normalizedGame;
      }
      return accumulator;
    }, {});
  }

  const legacyGame = normalizeSavedGame(parseStoredJson(LEGACY_GAME_STATE_KEY, null));
  return legacyGame ? { [legacyGame.gameId]: legacyGame } : {};
}

function writeSavedGameMap(savedGames) {
  const trimmedEntries = Object.values(savedGames)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_SAVED_GAMES)
    .map((savedGame) => [savedGame.gameId, savedGame]);

  const trimmedGames = Object.fromEntries(trimmedEntries);

  if (trimmedEntries.length === 0) {
    localStorage.removeItem(GAME_STATE_KEY);
  } else {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(trimmedGames));
  }

  localStorage.removeItem(LEGACY_GAME_STATE_KEY);
}

function normalizeStats(rawStats) {
  if (!rawStats || typeof rawStats !== 'object') {
    return { ...DEFAULT_STATS };
  }

  const resultsByGame =
    rawStats.resultsByGame && typeof rawStats.resultsByGame === 'object'
      ? Object.entries(rawStats.resultsByGame).reduce((accumulator, [gameId, outcome]) => {
          if (outcome === 'won' || outcome === 'given_up') {
            accumulator[gameId] = outcome;
          }
          return accumulator;
        }, {})
      : {};

  return {
    played: Number.isFinite(rawStats.played) ? rawStats.played : 0,
    won: Number.isFinite(rawStats.won) ? rawStats.won : 0,
    resultsByGame,
  };
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

export function loadSettings() {
  const savedSettings = parseStoredJson(SETTINGS_KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...(savedSettings && typeof savedSettings === 'object' ? savedSettings : {}),
  };
}

export function saveSettings(settings) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      ...(settings && typeof settings === 'object' ? settings : {}),
    }),
  );
}

export async function getCurrentGame() {
  try {
    const game = await requestJson('/api/games/latest');
    return game?.id ?? null;
  } catch (error) {
    console.error('Failed to get current game', error);
    return null;
  }
}

export async function checkGuess(guess, gameId) {
  try {
    const data = await requestJson('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess, gameId }),
    });

    return {
      word: data.word,
      rank: data.rank,
      similarity: data.similarity,
      cached: Boolean(data.cached),
      duplicate: Boolean(data.duplicate),
      gameId: data.gameId,
      gameNumber: data.gameNumber,
    };
  } catch (error) {
    console.error('Guess check failed', error);
    return null;
  }
}

export async function getHint(currentBestGuess, gameId, difficulty = 'medium') {
  try {
    const data = await requestJson('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentBestGuess, gameId, difficulty }),
    });

    return typeof data?.hint === 'string' && data.hint.trim() ? data.hint.trim() : null;
  } catch (error) {
    console.error('Hint request failed', error);
    return null;
  }
}

export async function getPreviousGames() {
  try {
    const data = await requestJson('/api/games');
    return Array.isArray(data?.games)
      ? data.games.map((game) => ({
          id: game.id,
          title: `Game #${game.game_number || game.id} (${new Date(game.created_at).toLocaleDateString()})`,
          date: new Date(game.created_at).toLocaleDateString(),
        }))
      : [];
  } catch (error) {
    console.error('Failed to load previous games', error);
    return [];
  }
}

export async function getSecretWord(gameId, options = {}) {
  const isGiveUp = Boolean(options.giveUp);

  try {
    if (isGiveUp) {
      const data = await requestJson('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, giveUp: true }),
      });

      return data?.word ?? 'Unknown';
    }

    const params = new URLSearchParams({ gameId: String(gameId) });
    const data = await requestJson(`/api/reveal?${params.toString()}`);
    return data?.word ?? 'Unknown';
  } catch (error) {
    console.error('Reveal failed', error);
    return 'Unknown';
  }
}

export function loadGame(gameId) {
  const savedGames = readSavedGameMap();
  const savedGame = savedGames[String(gameId)];
  return savedGame ? { ...savedGame } : null;
}

export function saveGame(savedGame) {
  const normalizedGame = normalizeSavedGame(savedGame);
  if (!normalizedGame) {
    return;
  }

  const savedGames = readSavedGameMap();
  savedGames[String(normalizedGame.gameId)] = {
    ...normalizedGame,
    updatedAt: Date.now(),
  };

  writeSavedGameMap(savedGames);
}

export function resetGame(gameId) {
  if (gameId === undefined || gameId === null) {
    localStorage.removeItem(GAME_STATE_KEY);
    localStorage.removeItem(LEGACY_GAME_STATE_KEY);
    return;
  }

  const savedGames = readSavedGameMap();
  delete savedGames[String(gameId)];
  writeSavedGameMap(savedGames);
}

export function getStats() {
  return normalizeStats(parseStoredJson(STATS_KEY, DEFAULT_STATS));
}

export function updateStats(gameId, outcome) {
  if (!Number.isFinite(Number(gameId)) || (outcome !== 'won' && outcome !== 'given_up')) {
    return getStats();
  }

  const stats = getStats();
  const key = String(gameId);
  const previousOutcome = stats.resultsByGame[key];

  if (previousOutcome === outcome) {
    return stats;
  }

  if (!previousOutcome) {
    stats.played += 1;
  }

  if (previousOutcome === 'won' && outcome !== 'won') {
    stats.won = Math.max(0, stats.won - 1);
  }

  if (previousOutcome !== 'won' && outcome === 'won') {
    stats.won += 1;
  }

  stats.resultsByGame[key] = outcome;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export async function getNearbyWords(gameId) {
  try {
    const params = new URLSearchParams({ gameId: String(gameId) });
    const data = await requestJson(`/api/nearby?${params.toString()}`);
    return Array.isArray(data?.list) ? data.list : [];
  } catch (error) {
    console.error('Failed to fetch nearby words', error);
    return [];
  }
}
