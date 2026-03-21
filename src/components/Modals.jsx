import { useEffect } from 'react';

function Modal({ title, children, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function StatsModal({ isOpen, onClose, stats }) {
  if (!isOpen) {
    return null;
  }

  const played = stats?.played || 0;
  const won = stats?.won || 0;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

  return (
    <Modal title="Statistics" onClose={onClose}>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-val">{played}</span>
          <span className="stat-label">Games</span>
        </div>
        <div className="stat-item">
          <span className="stat-val">{won}</span>
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-item">
          <span className="stat-val">{winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>
      </div>
    </Modal>
  );
}

export function SettingsModal({ isOpen, onClose, settings, onSettingsChange }) {
  if (!isOpen) {
    return null;
  }

  function handleChange(key, value) {
    onSettingsChange({ ...settings, [key]: value });
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="setting-row">
        <span>Theme</span>
        <select
          className="setting-select"
          value={settings.theme}
          onChange={(event) => handleChange('theme', event.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="setting-row">
        <span>Language</span>
        <select
          className="setting-select"
          value={settings.language}
          onChange={(event) => handleChange('language', event.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Espa\u00f1ol</option>
          <option value="pt">Portugu\u00eas</option>
        </select>
      </div>
      <div className="setting-row">
        <span>Hint Difficulty</span>
        <select
          className="setting-select"
          value={settings.hintDifficulty || 'medium'}
          onChange={(event) => handleChange('hintDifficulty', event.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div className="setting-row">
        <span>Sort History By</span>
        <select
          className="setting-select"
          value={settings.sortBy || 'similarity'}
          onChange={(event) => handleChange('sortBy', event.target.value)}
        >
          <option value="similarity">Similarity (best first)</option>
          <option value="order">Order (newest first)</option>
        </select>
      </div>
    </Modal>
  );
}

export function RankingModal({ isOpen, onClose, words, targetWord }) {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal title="Closest Words" onClose={onClose}>
      <div className="ranking-header">
        <p>
          Secret word: <strong>{targetWord || 'Hidden'}</strong>
        </p>
        <p>These are the closest ranked words for this game.</p>
      </div>
      <div className="ranking-list">
        {words.map((item) => (
          <div key={`${item.word}-${item.rank}`} className="ranking-item">
            <span className="ranking-word">{item.word}</span>
            <span className="ranking-val">{item.rank}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function PreviousGamesModal({ isOpen, onClose, games, onSelectGame }) {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal title="Previous Games" onClose={onClose}>
      <div className="ranking-list previous-games-list">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            className="ranking-item ranking-button"
            onClick={() => {
              onSelectGame(game.id);
              onClose();
            }}
          >
            <span className="ranking-word">{game.title}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
