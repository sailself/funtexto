import React, { useState } from 'react';
import { StatsModal, SettingsModal } from './Modals';

const Menu = ({ settings, onSettingsChange, onShowPreviousGames }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    // Load stats from local storage for display
    const stats = JSON.parse(localStorage.getItem('funtexto_stats') || '{}');

    return (
        <>
            <button className="menu-btn" onClick={toggleMenu}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="menu-overlay" onClick={() => setIsOpen(false)} />
                    <div className="menu-drawer">
                        <div className="menu-header">
                            <h2>funtexto</h2>
                            <button className="close-btn" onClick={() => setIsOpen(false)}>&times;</button>
                        </div>
                        <ul className="menu-list">
                            <li onClick={() => { onShowPreviousGames(); setIsOpen(false); }}>Previous Games</li>
                            <li onClick={() => { setShowSettings(true); setIsOpen(false); }}>Settings</li>
                            <li onClick={() => { setShowStats(true); setIsOpen(false); }}>History / Stats</li>
                            <li><a href="https://contexto.me" target="_blank" rel="noopener noreferrer">Original Game</a></li>
                        </ul>
                    </div>
                </>
            )}

            <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} />
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSettingsChange={onSettingsChange}
            />
        </>
    );
};

export default Menu;
