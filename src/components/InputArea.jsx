import React, { useState } from 'react';

const InputArea = ({ onGuess, disabled }) => {
    const [value, setValue] = useState('');
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [disabled]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) {
            onGuess(value);
            setValue('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className='input-wrapper'>
            <input
                ref={inputRef}
                type="text"
                className='guess-input'
                placeholder="Type a word..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                disabled={disabled}
            />
            <button type="submit" className='submit-btn' disabled={disabled}>
                Enter
            </button>
        </form>
    );
};

export default InputArea;
