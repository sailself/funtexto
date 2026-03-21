import logger from './utils/logger.js';
import { getGameByIdOrLatest, getRelatedWordsForGame } from './utils/gameRepository.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const game = getGameByIdOrLatest(req.query?.gameId);
    if (!game) {
      return res.status(404).json({ error: 'No active game found' });
    }

    const list = [
      { word: game.target_word, rank: 1, similarity: 1 },
      ...getRelatedWordsForGame(game.id).map((row) => ({
        word: row.word,
        rank: row.rank,
        similarity: row.similarity,
      })),
    ];

    return res.status(200).json({
      list,
      gameId: game.id,
      gameNumber: game.game_number,
    });
  } catch (error) {
    logger.error('Nearby list fetch failed', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch list' });
  }
}
