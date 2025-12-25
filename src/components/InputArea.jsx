import React, { useState } from 'react';

const InputArea = ({ onGuess, disabled }) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) {
            onGuess(value);
            setValue('');
        }
    };

    return (
        <form onSubmit={handleSubmit} class='input-wrapper'>
            <input
                type="text"
                class='guess-input'
                placeholder="Type a word..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                disabled={disabled}
            />
            <button type="submit" class='submit-btn' disabled={disabled}>
                Enter
            </button>
        </form>
    );
};

export default InputArea;
