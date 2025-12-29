import logger from './utils/logger.js';
import { getTarget } from './utils/target.js';
import { getWordList } from './utils/wordCache.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { gameId } = req.query;
    const target = getTarget(gameId);

    try {
        const wordList = await getWordList(target);

        if (!wordList) {
            return res.status(200).json({ list: [] });
        }

        // Format for frontend: { word, rank }
        // The list is ordered by rank (closest first).
        // Index 0 = Rank 2 (since Rank 1 is the target itself)
        const formattedList = wordList.map((word, index) => ({
            word,
            rank: index + 2
        }));

        // Add the target itself as Rank 1
        formattedList.unshift({ word: target, rank: 1 });

        return res.status(200).json({ list: formattedList });

    } catch (error) {
        logger.error('Nearby list fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch list' });
    }
}
