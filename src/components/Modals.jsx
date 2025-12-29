import React from 'react';

export const Modal = ({ title, children, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const StatsModal = ({ isOpen, onClose, stats }) => {
    if (!isOpen) return null;
    return (
        <Modal title="Statistics" onClose={onClose}>
            <div className="stats-grid">
                <div className="stat-item">
                    <span className="stat-val">{stats.played || 0}</span>
                    <span className="stat-label">Games</span>
                </div>
                <div className="stat-item">
                    <span className="stat-val">{stats.won || 0}</span>
                    <span className="stat-label">Wins</span>
                </div>
            </div>
        </Modal>
    );
};

export const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;

    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <Modal title="Settings" onClose={onClose}>
            <div className="setting-row">
                <span>Theme</span>
                <select
                    className="setting-select"
                    value={settings.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>
            <div className="setting-row">
                <span>Language (UI Only)</span>
                <select
                    className="setting-select"
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                </select>
            </div>
            <div className="setting-row">
                <span>Hint Difficulty</span>
                <select
                    className="setting-select"
                    value={settings.hintDifficulty || 'medium'}
                    onChange={(e) => handleChange('hintDifficulty', e.target.value)}
                >
                    <option value="easy">Easy (Rank / 2)</option>
                    <option value="medium">Medium (Rank - 1)</option>
                    <option value="hard">Hard (Random better)</option>
                </select>
            </div>
            <div className="setting-row">
                <span>Sort History By</span>
                <select
                    className="setting-select"
                    value={settings.sortBy || 'similarity'}
                    onChange={(e) => handleChange('sortBy', e.target.value)}
                >
                    <option value="similarity">Similarity (Rank)</option>
                    <option value="order">Order (Newest First)</option>
                </select>
            </div>
        </Modal>
    );
};

export const RankingModal = ({ isOpen, onClose, words, targetWord }) => {
    if (!isOpen) return null;

    return (
        <Modal title="Closest Words" onClose={onClose}>
            <div className="ranking-header">
                <p>Today's word was: <strong>{targetWord}</strong></p>
                <p>These were the top words:</p>
            </div>
            <div className="ranking-list">
                {words.map((item, index) => (
                    <div key={index} className="ranking-item">
                        <span className="ranking-word">{item.word}</span>
                        <span className="ranking-val">{item.rank}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export const PreviousGamesModal = ({ isOpen, onClose, games, onSelectGame }) => {
    if (!isOpen) return null;

    return (
        <Modal title="Previous Games" onClose={onClose}>
            <div className="ranking-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {games.map((game) => (
                    <div
                        key={game.id}
                        className="ranking-item"
                        style={{ cursor: 'pointer', justifyContent: 'center' }}
                        onClick={() => { onSelectGame(game.id); onClose(); }}
                    >
                        <span className="ranking-word">{game.title}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
