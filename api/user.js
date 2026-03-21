
import { Router } from 'express';
import db from './db/index.js';
import logger from './utils/logger.js';

const router = Router();

// Set Display Name
router.post('/name', (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || typeof name !== 'string' || name.length > 50) {
        return res.status(400).json({ error: 'Invalid name' });
    }

    try {
        const stmt = db.prepare('UPDATE users SET display_name = ? WHERE id = ?');
        stmt.run(name, userId);
        res.json({ success: true, name });
    } catch (e) {
        logger.error('Failed to update name', { error: e.message });
        res.status(500).json({ error: 'Failed to update name' });
    }
});

// Get History
router.get('/history', (req, res) => {
    const userId = req.user.id;

    try {
        // Get all plays for this user
        const stmt = db.prepare(`
            SELECT 
                p.id as play_id, 
                p.status, 
                p.guesses_count, 
                p.finished_at,
                g.game_number,
                g.target_word, -- Maybe hide this if game is active? Or only show if status is 'won'/'given_up'?
                g.created_at as game_date
            FROM play_history p
            JOIN games g ON p.game_id = g.id
            WHERE p.user_id = ?
            ORDER BY g.id DESC
        `);

        const history = stmt.all(userId);

        // Hide target word if not won/given up (actually, if they are fetching history, maybe they want to see it? 
        // But if they are just loading history on another device, we shouldn't spoil active games?
        // But usually history implies past games. If it's the current game, we should probably return 'active' state)

        // Let's safe guard:
        const safeHistory = history.map(h => {
            if (h.status === 'playing') {
                return { ...h, target_word: null };
            }
            return h;
        });

        res.json({ history: safeHistory, userId });
    } catch (e) {
        logger.error('Failed to get history', { error: e.message });
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Restore Identity
router.post('/restore', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }

    // Verify user exists
    const stmt = db.prepare('SELECT id FROM users WHERE id = ?');
    const user = stmt.get(userId);

    if (user) {
        // Set cookie
        res.cookie('funtexto_uid', user.id, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        res.json({ success: true, userId: user.id });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

export default router;
