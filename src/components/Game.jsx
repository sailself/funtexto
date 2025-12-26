import React, { useState, useEffect, useRef } from 'react';
import InputArea from './InputArea';
import GuessList from './GuessList';
import Menu from './Menu';
import { checkGuess, saveGame, loadGame, getDailyGameId, getRandomGameId, getHint, updateStats, resetGame, getSecretWord } from '../game/gameLogic';

const Game = () => {
  const [guesses, setGuesses] = useState([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState('');
  const [targetWord, setTargetWord] = useState(''); // Revealed only on win/giveup

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('funtexto_settings');
    return saved ? JSON.parse(saved) : { theme: 'light', language: 'en' };
  });

  const [gameId, setGameId] = useState(() => {
    // Check if we have a saved game state, if so, continue that game (even if random)
    // Otherwise default to daily
    const saved = loadGame();
    return saved ? saved.gameId : getDailyGameId();
  });

  // Apply Theme
  useEffect(() => {
    document.body.className = settings.theme === 'dark' ? 'dark-mode' : '';
    localStorage.setItem('funtexto_settings', JSON.stringify(settings));
  }, [settings]);

  // Load Game state ... (rest of useEffect)

  // Translations
  const t = {
    en: { hint: "💡 Hint", giveUp: "🏳️ Give Up", gameOver: "Game Over", secretWas: "The secret word was indeed...", reset: "Reset / New Game", next: "Next Game (Tomorrow)", found: "Found!" },
    es: { hint: "💡 Pista", giveUp: "🏳️ Rendirse", gameOver: "Fin del Juego", secretWas: "La palabra secreta era...", reset: "Reiniciar / Nuevo Juego", next: "Siguiente Juego (Mañana)", found: "¡Encontrada!" },
    pt: { hint: "💡 Dica", giveUp: "🏳️ Desistir", gameOver: "Fim de Jogo", secretWas: "A palavra secreta era...", reset: "Reiniciar / Novo Jogo", next: "Próximo Jogo (Amanhã)", found: "Encontrada!" }
  };
  const txt = t[settings.language] || t.en;

  useEffect(() => {
    const saved = loadGame();
    if (saved && saved.gameId === gameId) {
      setGuesses(saved.guesses);
      setFinished(saved.won);
      // If loaded finished game, we might want to ensure stats were synced, but typically we sync on finish event.
    } else {
      // New day or first game
      setGuesses([]);
      setFinished(false);
    }
  }, [gameId]);

  // ... (handleGuess, handleHint, handleGiveUp, handleNewGame unchanged in logic, keeping existing references)

  // Need to verify where handleHint/GiveUp etc are in the file to properly replace surrounding code if I use replace_file_content heavily.
  // Actually, I should just modify the parts I need.

  // NOTE: I will skip re-declaring the handles here in the replacement block if they are not changing, 
  // BUT I need to replace the RETURN statement to use `txt` and the `Menu` prop.

  // The tool `replace_file_content` works best with contiguous blocks.
  // I will split this into two edits:
  // 1. Top of component (State setup).
  // 2. Bottom of component (Return statement).


  const handleGuess = async (word) => {
    if (finished || loading) return;
    if (guesses.some(g => g.word.toLowerCase() === word.trim().toLowerCase())) return;

    setLoading(true);
    setErrorHeader('');

    // Optimistic UI update or loading spinner could go here...

    const result = await checkGuess(word, gameId);
    setLoading(false);

    if (!result) {
      setErrorHeader('Connection Error: check API Key');
      return;
    }

    const newGuesses = [...guesses, result];
    const isWin = result.rank === 1;

    setGuesses(newGuesses);
    if (isWin) {
      setFinished(true);
      setTargetWord(result.word);
      updateStats(gameId, true);
    }

    saveGame(newGuesses, isWin, gameId);
  };

  const handleHint = async () => {
    setLoading(true);
    // Find best guess so far
    const bestGuess = guesses.length > 0
      ? guesses.reduce((prev, curr) => (prev.rank < curr.rank ? prev : curr))
      : null;
    const bestWord = bestGuess ? bestGuess.word : null;

    const hintWord = await getHint(bestWord, gameId);
    setLoading(false);
    if (hintWord) {
      // Auto-submit the hint as a guess
      handleGuess(hintWord);
    }
  };

  const handleGiveUp = async () => {
    setFinished(true);
    // Fetch the actual secret word
    const secret = await getSecretWord(gameId);
    setTargetWord(secret);
    updateStats(gameId, false);
    saveGame(guesses, true, gameId); // Mark as 'done' so it persists as finished
  };

  const handleNewGame = () => {
    setGameId(getRandomGameId());
    // Auto-reset happens in useEffect when gameId changes
  };

  return (
    <div className='app-container'>
      <Menu settings={settings} onSettingsChange={setSettings} />

      <div className='header'>
        <h1>funtexto</h1>
        <div className='game-info'>Game #{gameId} • Guesses: {guesses.length}</div>
        {errorHeader && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errorHeader}</div>}
      </div>

      {finished && (
        <div className='win-message'>
          <h3>{txt.gameOver}</h3>
          <p>{txt.secretWas} <strong>{targetWord || txt.found}</strong></p>
          <div className='action-buttons' style={{ justifyContent: 'center' }}>
            <button className='secondary-btn' onClick={handleNewGame}>{txt.reset}</button>
          </div>
        </div>
      )}

      {/* Main Gameplay Area */}
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <InputArea onGuess={handleGuess} disabled={finished || loading} />

        {!finished && (
          <div className='action-buttons' style={{ justifyContent: 'center', marginBottom: '10px' }}>
            <button className='secondary-btn' onClick={handleHint} disabled={loading}>
              {txt.hint}
            </button>
            <button className='secondary-btn' onClick={handleGiveUp} disabled={loading}>
              {txt.giveUp}
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '10px', opacity: 0.5 }}>Thinking...</div>}

        <GuessList guesses={guesses} />
      </div>
    </div>
  );
};

export default Game;

