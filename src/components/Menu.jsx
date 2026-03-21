import { useState } from 'react';
import { getStats } from '../game/gameLogic';
import { SettingsModal, StatsModal } from './Modals';

export default function Menu({ settings, onSettingsChange, onShowPreviousGames }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const stats = getStats();

  return (
    <>
      <button className="menu-btn" type="button" onClick={() => setIsOpen((open) => !open)}>
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div className="menu-overlay" onClick={() => setIsOpen(false)} />
          <div className="menu-drawer">
            <div className="menu-header">
              <h2>funtexto</h2>
              <button className="close-btn" type="button" onClick={() => setIsOpen(false)}>
                &times;
              </button>
            </div>

            <div className="menu-list">
              <button
                className="menu-action"
                type="button"
                onClick={() => {
                  onShowPreviousGames();
                  setIsOpen(false);
                }}
              >
                Previous Games
              </button>
              <button
                className="menu-action"
                type="button"
                onClick={() => {
                  setShowSettings(true);
                  setIsOpen(false);
                }}
              >
                Settings
              </button>
              <button
                className="menu-action"
                type="button"
                onClick={() => {
                  setShowStats(true);
                  setIsOpen(false);
                }}
              >
                History / Stats
              </button>
              <a
                className="menu-link"
                href="https://contexto.me"
                target="_blank"
                rel="noopener noreferrer"
              >
                Original Game
              </a>
            </div>
          </div>
        </>
      ) : null}

      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </>
  );
}
