import db from './db/index.js';
import { getGameByIdOrLatest } from './utils/gameRepository.js';

const markGameGivenUpStmt = db.prepare(`
  UPDATE play_history
  SET status = 'given_up', finished_at = CURRENT_TIMESTAMP
  WHERE user_id = ? AND game_id = ? AND status = 'playing'
`);

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const input = req.method === 'GET' ? req.query : req.body;
  const game = getGameByIdOrLatest(input?.gameId);
  const secretOverride = input?.secretOverride;

  if (!game && !secretOverride) {
    return res.status(404).json({ error: 'No active game found' });
  }

  if (input?.giveUp && req.user?.id && game) {
    markGameGivenUpStmt.run(req.user.id, game.id);
  }

  return res.status(200).json({
    word: secretOverride || game.target_word,
    gameId: game?.id ?? null,
    gameNumber: game?.game_number ?? null,
  });
}
