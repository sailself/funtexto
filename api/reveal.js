import { getTarget } from './utils/target.js';

export default function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Support both GET query and POST body for gameId
    const gameId = req.method === 'GET' ? req.query.gameId : req.body?.gameId;
    const secretOverride = req.body?.secretOverride;

    const target = secretOverride || getTarget(gameId);

    return res.status(200).json({ word: target });
}
