import React from 'react';

const GuessRow = ({ guess }) => {
    const { word, rank } = guess;

    // Calculate color and width based on rank
    let barColor = 'var(--rank-red)';
    if (rank <= 300) barColor = 'var(--rank-green)';
    else if (rank <= 1500) barColor = 'var(--rank-yellow)';

    // Inverse width: Rank 1 = 100%, Rank 5000+ = minimal
    // Logarithmic scale often looks better for wide ranges
    // Simple linear approximation for visual effect:
    // 1 -> 100%
    // 1000 -> ~50%
    // 10000 -> ~5%
    let widthPercent = Math.max(5, 100 - (Math.log(rank) / Math.log(10000)) * 100);
    if (rank === 1) widthPercent = 100;

    return (
        <div className='guess-row'>
            <div
                className='progress-bar'
                style={{
                    width: `${widthPercent}%`,
                    backgroundColor: barColor
                }}
            />
            <div className='word-content'>{word}</div>
            <div className='rank-content'>{rank}</div>
        </div>
    );
};

export default GuessRow;
