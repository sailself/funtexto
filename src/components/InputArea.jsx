import { useEffect, useRef, useState } from 'react';

export default function InputArea({ onGuess, disabled }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    onGuess(normalizedValue);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="input-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="guess-input"
        placeholder="Type a word..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus
        disabled={disabled}
      />
      <button type="submit" className="submit-btn" disabled={disabled}>
        Enter
      </button>
    </form>
  );
}
