import React, { useState, useEffect } from 'react';
import InputArea from './InputArea';
import GuessList from './GuessList';
import { checkGuess, saveGame, loadGame, getTargetWord } from '../game/gameLogic';

const Game = () => {
    const [guesses, setGuesses] = useState([]);
    const [finished, setFinished] = useState(false);
    const [gameId] = useState(1); // Static ID for this "Lite" version

    useEffect(() => {
        const saved = loadGame();
        if (saved && saved.gameId === gameId) {
            setGuesses(saved.guesses);
            setFinished(saved.won);
        }
    }, [gameId]);

    const handleGuess = (word) => {
        // Prevent duplicate processing if already won
        if (finished) return;

        // Check if already guessed
        if (guesses.some(g => g.word.toLowerCase() === word.trim().toLowerCase())) {
            // Could add a toast here for "Already guessed"
            return;
        }

        const result = checkGuess(word);

        const newGuesses = [...guesses, result];
        const isWin = result.rank === 1;

        setGuesses(newGuesses);
        if (isWin) {
            setFinished(true);
        }

        saveGame(newGuesses, isWin, gameId);
    };

    return (
        <div class='app-container'>
            <div class='header'>
                <h1>funtexto</h1>
                <div class='game-info'>Game #{gameId} • Guesses: {guesses.length}</div>
            </div>

            {finished && (
                <div class='win-message'>
                    <h3>You found it!</h3>
                    <p>The secret word was <strong>{getTargetWord()}</strong>.</p>
                </div>
            )}

            <InputArea onGuess={handleGuess} disabled={finished} />

            <GuessList guesses={guesses} />
        </div>
    );
};

export default Game;
