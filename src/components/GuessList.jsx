import GuessRow from './GuessRow';

export default function GuessList({ guesses, sortBy = 'similarity' }) {
  const sortedGuesses =
    sortBy === 'order'
      ? [...guesses].sort((left, right) => right.guessNumber - left.guessNumber)
      : [...guesses].sort((left, right) => {
          if (left.rank !== right.rank) {
            return left.rank - right.rank;
          }

          return right.guessNumber - left.guessNumber;
        });

  return (
    <div className="guess-list">
      {sortedGuesses.map((guess) => (
        <GuessRow key={`${guess.word}-${guess.guessNumber}`} guess={guess} />
      ))}
    </div>
  );
}
