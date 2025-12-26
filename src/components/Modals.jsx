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
        </Modal>
    );
};
