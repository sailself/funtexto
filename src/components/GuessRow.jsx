import React, { useEffect, useState } from 'react';

const GuessRow = ({ guess }) => {
    const { word, rank } = guess;
    const [animatedWidth, setAnimatedWidth] = useState(0);

    // Calculate color based on rank
    let barColor = 'var(--rank-red)';
    if (rank <= 300) barColor = 'var(--rank-green)';
    else if (rank <= 1500) barColor = 'var(--rank-yellow)';

    // Logarithmic scale for width
    let targetWidth = Math.max(5, 100 - (Math.log(rank) / Math.log(10000)) * 100);
    if (rank === 1) targetWidth = 100;

    useEffect(() => {
        // Trigger animation frame after mount
        const timer = setTimeout(() => {
            setAnimatedWidth(targetWidth);
        }, 50);
        return () => clearTimeout(timer);
    }, [targetWidth]);

    return (
        <div className='guess-row'>
            <div
                className='progress-bar'
                style={{
                    width: `${animatedWidth}%`,
                    backgroundColor: barColor
                }}
            />
            <div className='word-content'>{word}</div>
            <div className='rank-content'>{rank}</div>
        </div>
    );
};

export default GuessRow;
