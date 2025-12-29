import React from 'react';
import GuessRow from './GuessRow';

const GuessList = ({ guesses, sortBy = 'similarity' }) => {
    // Sort guesses
    const sortedGuesses = [...guesses].sort((a, b) => {
        if (sortBy === 'order') {
            // Newest first? Or oldest first? Context usually shows history.
            // If "Order", usually newest on top or bottom.
            // Let's assume Newest on Top for easy reading, or Oldest on Top?
            // Contexto default "Order" usually means chronological.
            // Let's do Newest First (index-based or timestamp).
            // But guesses array is pushed, so index 0 is oldest.
            // If I want newest first: b - a (if index tracked) or reverse.
            // But checking Contexto: "Order" usually puts recent guess at top or bottom.
            // I'll stick to a simple reverse of the array if needed, but the array is chronological.
            // Let's assume Newest First for the UI so user sees their input.
            // Actually, let's look at `guesses` in Game.jsx: `[...guesses, result]`.
            // So `guesses` is Oldest -> Newest.
            // Visual list: usually Newest at top.
            return -1; // Reverse order (Newest first)
        }
        // Similarity (Rank) - Best rank (lowest number) first
        return a.rank - b.rank;
    });

    return (
        <div style={{ width: '100%' }}>
            {sortedGuesses.map((guess, index) => (
                <GuessRow key={`${guess.word}-${index}`} guess={guess} />
            ))}
        </div>
    );
};

export default GuessList;
