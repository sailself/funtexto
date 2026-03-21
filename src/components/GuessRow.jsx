import { useEffect, useState } from 'react';

export default function GuessRow({ guess }) {
  const { word, rank } = guess;
  const [animatedWidth, setAnimatedWidth] = useState(0);

  let barColor = 'var(--rank-red)';
  if (rank <= 300) {
    barColor = 'var(--rank-green)';
  } else if (rank <= 1500) {
    barColor = 'var(--rank-yellow)';
  }

  let targetWidth = Math.max(5, 100 - (Math.log(rank) / Math.log(10000)) * 100);
  if (rank === 1) {
    targetWidth = 100;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnimatedWidth(targetWidth);
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [targetWidth]);

  return (
    <div className="guess-row">
      <div
        className="progress-bar"
        style={{
          width: `${animatedWidth}%`,
          backgroundColor: barColor,
        }}
      />
      <div className="word-content">{word}</div>
      <div className="rank-content">{rank}</div>
    </div>
  );
}
