import React from 'react';
import GuessRow from './GuessRow';

const GuessList = ({ guesses }) => {
    // Sort guesses by rank (ascending), so best guesses are at the top
    const sortedGuesses = [...guesses].sort((a, b) => a.rank - b.rank);

    return (
        <div style={{ width: '100%' }}>
            {sortedGuesses.map((guess, index) => (
                <GuessRow key={`${guess.word}-${index}`} guess={guess} />
            ))}
        </div>
    );
};

export default GuessList;
