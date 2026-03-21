import { useEffect, useMemo, useState } from 'react';
import InputArea from './InputArea';
import GuessList from './GuessList';
import Menu from './Menu';
import { PreviousGamesModal, RankingModal } from './Modals';
import {
  checkGuess,
  getCurrentGame,
  getHint,
  getNearbyWords,
  getPreviousGames,
  getSecretWord,
  loadGame,
  loadSettings,
  resetGame,
  saveGame,
  saveSettings,
  updateStats,
} from '../game/gameLogic';

const translations = {
  en: {
    hint: 'Hint',
    giveUp: 'Give Up',
    gameOver: 'Game Over',
    secretWas: 'The secret word was',
    replay: 'Replay Current Game',
    nextGame: 'Check for New Game',
    found: 'Found',
    showRank: 'Show Closest Words',
    share: 'Share Results',
    thinking: 'Thinking...',
    copied: 'Results copied to clipboard.',
    shareFailed: 'Clipboard access is not available in this browser.',
    loadingGames: 'Loading games...',
    duplicateGuess: 'You already tried that word.',
    missingGame: 'No active game is available right now.',
    invalidGuess: 'Could not score that guess. Try another word.',
    hintUnavailable: 'Could not find a hint right now.',
    previousGames: 'Previous Games',
    headerStatus: 'Guesses',
  },
  es: {
    hint: 'Pista',
    giveUp: 'Rendirse',
    gameOver: 'Fin del juego',
    secretWas: 'La palabra secreta era',
    replay: 'Repetir juego actual',
    nextGame: 'Buscar juego nuevo',
    found: 'Encontrada',
    showRank: 'Ver palabras cercanas',
    share: 'Compartir resultados',
    thinking: 'Pensando...',
    copied: 'Resultados copiados al portapapeles.',
    shareFailed: 'El portapapeles no est\u00e1 disponible en este navegador.',
    loadingGames: 'Cargando juegos...',
    duplicateGuess: 'Ya intentaste esa palabra.',
    missingGame: 'No hay un juego activo disponible.',
    invalidGuess: 'No se pudo evaluar esa palabra. Intenta otra.',
    hintUnavailable: 'No se pudo conseguir una pista ahora mismo.',
    previousGames: 'Juegos anteriores',
    headerStatus: 'Intentos',
  },
  pt: {
    hint: 'Dica',
    giveUp: 'Desistir',
    gameOver: 'Fim de jogo',
    secretWas: 'A palavra secreta era',
    replay: 'Rejogar partida atual',
    nextGame: 'Buscar novo jogo',
    found: 'Encontrada',
    showRank: 'Ver palavras pr\u00f3ximas',
    share: 'Compartilhar resultados',
    thinking: 'Pensando...',
    copied: 'Resultados copiados para a \u00e1rea de transfer\u00eancia.',
    shareFailed: 'A \u00e1rea de transfer\u00eancia n\u00e3o est\u00e1 dispon\u00edvel neste navegador.',
    loadingGames: 'Carregando jogos...',
    duplicateGuess: 'Voc\u00ea j\u00e1 tentou essa palavra.',
    missingGame: 'Nenhum jogo ativo est\u00e1 dispon\u00edvel agora.',
    invalidGuess: 'N\u00e3o foi poss\u00edvel avaliar essa palavra. Tente outra.',
    hintUnavailable: 'N\u00e3o foi poss\u00edvel obter uma dica agora.',
    previousGames: 'Jogos anteriores',
    headerStatus: 'Tentativas',
  },
};

function buildSavedGameState(gameId, guesses, finished, outcome, targetWord) {
  return {
    gameId,
    guesses,
    finished,
    outcome,
    targetWord,
  };
}

export default function Game() {
  const [gameId, setGameId] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [finished, setFinished] = useState(false);
  const [targetWord, setTargetWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [rankingList, setRankingList] = useState([]);
  const [previousGamesModalOpen, setPreviousGamesModalOpen] = useState(false);
  const [previousGames, setPreviousGames] = useState([]);
  const [settings, setSettings] = useState(loadSettings);

  const text = useMemo(
    () => translations[settings.language] || translations.en,
    [settings.language],
  );

  function switchToGame(nextGameId) {
    const savedGame = loadGame(nextGameId);
    setRankingList([]);
    setErrorMessage('');
    setCopyMessage('');
    setGameId(nextGameId);

    if (savedGame) {
      setGuesses(savedGame.guesses);
      setFinished(savedGame.finished);
      setTargetWord(savedGame.targetWord);
      return;
    }

    setGuesses([]);
    setFinished(false);
    setTargetWord('');
  }

  useEffect(() => {
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    let ignore = false;

    async function initializeGame() {
      setLoading(true);
      setErrorMessage('');

      const currentGameId = await getCurrentGame();
      if (ignore) {
        return;
      }

      if (!currentGameId) {
        setLoading(false);
        setErrorMessage(text.missingGame);
        return;
      }

      switchToGame(currentGameId);
      setLoading(false);
    }

    void initializeGame();

    return () => {
      ignore = true;
    };
  }, [text.missingGame]);

  const guessCount = guesses.length;

  async function handleGuess(rawWord) {
    const normalizedWord = rawWord.trim();
    if (!normalizedWord || finished || loading || !gameId) {
      return;
    }

    if (guesses.some((guess) => guess.word.toLowerCase() === normalizedWord.toLowerCase())) {
      setErrorMessage(text.duplicateGuess);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setCopyMessage('');

    const result = await checkGuess(normalizedWord, gameId);
    setLoading(false);

    if (!result) {
      setErrorMessage(text.invalidGuess);
      return;
    }

    const nextGuess = {
      ...result,
      guessNumber: guessCount + 1,
    };

    const nextGuesses = [...guesses, nextGuess];
    const didWin = result.rank === 1;

    setGuesses(nextGuesses);
    setFinished(didWin);
    setTargetWord(didWin ? result.word : '');

    if (didWin) {
      updateStats(gameId, 'won');
    }

    saveGame(buildSavedGameState(gameId, nextGuesses, didWin, didWin ? 'won' : null, didWin ? result.word : ''));
  }

  async function handleHint() {
    if (finished || loading || !gameId) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setCopyMessage('');

    const bestGuess =
      guesses.length > 0
        ? guesses.reduce((best, current) => (current.rank < best.rank ? current : best))
        : null;

    const hintWord = await getHint(bestGuess?.word ?? null, gameId, settings.hintDifficulty);

    if (!hintWord) {
      setLoading(false);
      setErrorMessage(text.hintUnavailable);
      return;
    }

    setLoading(false);
    await handleGuess(hintWord);
  }

  async function handleGiveUp() {
    if (finished || loading || !gameId) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setCopyMessage('');

    const secretWord = await getSecretWord(gameId, { giveUp: true });
    setLoading(false);

    setFinished(true);
    setTargetWord(secretWord);
    updateStats(gameId, 'given_up');
    saveGame(buildSavedGameState(gameId, guesses, true, 'given_up', secretWord));
  }

  function handleReplayCurrentGame() {
    if (!gameId) {
      return;
    }

    resetGame(gameId);
    setGuesses([]);
    setFinished(false);
    setTargetWord('');
    setRankingList([]);
    setErrorMessage('');
    setCopyMessage('');
  }

  async function handleCheckForNewGame() {
    if (!gameId) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setCopyMessage('');

    const currentGameId = await getCurrentGame();
    setLoading(false);

    if (currentGameId && currentGameId !== gameId) {
      switchToGame(currentGameId);
      return;
    }

    const shouldReplay = window.confirm('No new game is available yet. Replay this one from scratch?');
    if (!shouldReplay) {
      return;
    }

    handleReplayCurrentGame();
  }

  async function handleShowRanking() {
    if (!gameId) {
      return;
    }

    if (rankingList.length === 0) {
      setLoading(true);
      const words = await getNearbyWords(gameId);
      setRankingList(words);
      setLoading(false);
    }

    setRankingModalOpen(true);
  }

  async function handleShowPreviousGames() {
    setLoading(true);
    setErrorMessage('');

    const games = await getPreviousGames();
    setPreviousGames(games);
    setLoading(false);
    setPreviousGamesModalOpen(true);
  }

  async function handleShare() {
    if (!gameId || guesses.length === 0) {
      return;
    }

    const green = guesses.filter((guess) => guess.rank <= 300).length;
    const yellow = guesses.filter((guess) => guess.rank > 300 && guess.rank <= 1500).length;
    const red = guesses.filter((guess) => guess.rank > 1500).length;

    const summary = [
      `Funtexto #${gameId}`,
      `${guesses.length} guesses`,
      `Green: ${green}`,
      `Yellow: ${yellow}`,
      `Red: ${red}`,
      window.location.origin,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopyMessage(text.copied);
    } catch (error) {
      console.error('Failed to copy share text', error);
      setCopyMessage(text.shareFailed);
    }
  }

  return (
    <div className="app-container">
      <Menu
        settings={settings}
        onSettingsChange={setSettings}
        onShowPreviousGames={handleShowPreviousGames}
      />

      <header className="header">
        <h1>funtexto</h1>
        <div className="game-info">
          Game #{gameId ?? '--'} | {text.headerStatus}: {guessCount}
        </div>
        {errorMessage ? <p className="header-message header-message-error">{errorMessage}</p> : null}
        {!errorMessage && copyMessage ? <p className="header-message">{copyMessage}</p> : null}
      </header>

      {finished ? (
        <section className="win-message">
          <h3>{text.gameOver}</h3>
          <p>
            {text.secretWas} <strong>{targetWord || text.found}</strong>
          </p>
          <div className="action-buttons">
            <button className="secondary-btn" type="button" onClick={handleCheckForNewGame}>
              {text.nextGame}
            </button>
            <button className="secondary-btn" type="button" onClick={handleShowRanking}>
              {text.showRank}
            </button>
            <button className="secondary-btn" type="button" onClick={handleShare}>
              {text.share}
            </button>
            <button className="secondary-btn" type="button" onClick={handleReplayCurrentGame}>
              {text.replay}
            </button>
          </div>
        </section>
      ) : null}

      <div className="game-panel">
        <InputArea onGuess={handleGuess} disabled={finished || loading || !gameId} />

        {!finished ? (
          <div className="action-buttons">
            <button className="secondary-btn" type="button" onClick={handleHint} disabled={loading || !gameId}>
              {text.hint}
            </button>
            <button className="secondary-btn" type="button" onClick={handleGiveUp} disabled={loading || !gameId}>
              {text.giveUp}
            </button>
          </div>
        ) : null}

        {loading ? <div className="loading-message">{text.thinking}</div> : null}

        {!gameId && !loading && !errorMessage ? (
          <div className="loading-message">{text.loadingGames}</div>
        ) : null}

        <GuessList guesses={guesses} sortBy={settings.sortBy} />
      </div>

      <RankingModal
        isOpen={rankingModalOpen}
        onClose={() => setRankingModalOpen(false)}
        words={rankingList}
        targetWord={targetWord}
      />

      <PreviousGamesModal
        isOpen={previousGamesModalOpen}
        onClose={() => setPreviousGamesModalOpen(false)}
        games={previousGames}
        onSelectGame={switchToGame}
      />
    </div>
  );
}
