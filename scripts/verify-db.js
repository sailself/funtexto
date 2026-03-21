import { v4 as uuidv4 } from 'uuid';
import db from '../api/db/index.js';
import { generateNewGameIfNeeded } from '../api/utils/gameGenerator.js';

const selectLatestGameStmt = db.prepare('SELECT * FROM games ORDER BY id DESC LIMIT 1');
const insertGameStmt = db.prepare('INSERT INTO games (target_word, game_number) VALUES (?, ?)');
const insertRelatedWordStmt = db.prepare(`
  INSERT OR IGNORE INTO related_words (game_id, word, rank, similarity)
  VALUES (?, ?, ?, ?)
`);

async function ensureGameExists() {
  let game = selectLatestGameStmt.get();
  if (game) {
    return game;
  }

  if (process.env.GOOGLE_API_KEY?.trim()) {
    await generateNewGameIfNeeded();
    return selectLatestGameStmt.get();
  }

  const { default: fallbackWords } = await import('../src/game/words.json', { with: { type: 'json' } });
  const insertResult = insertGameStmt.run(fallbackWords.target, 1);
  const gameId = insertResult.lastInsertRowid;

  Object.entries(fallbackWords.rankings).forEach(([word, rank]) => {
    if (rank === 1) {
      return;
    }

    insertRelatedWordStmt.run(gameId, word, rank, Math.max(0.4, 1 - rank / 10000));
  });

  return selectLatestGameStmt.get();
}

async function verify() {
  console.log('--- Starting Verification ---');

  const game = await ensureGameExists();
  console.log('Current Game:', game);

  if (!game) {
    console.error('FAILED: No game found');
    process.exit(1);
  }

  const words = db.prepare('SELECT count(*) AS count FROM related_words WHERE game_id = ?').get(game.id);
  console.log(`Related words count: ${words.count}`);

  const userId = uuidv4();
  db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)').run(userId, 'TestUser');

  const playResult = db.prepare('INSERT INTO play_history (user_id, game_id) VALUES (?, ?)').run(userId, game.id);
  const playId = playResult.lastInsertRowid;
  console.log(`Play session created (ID: ${playId})`);

  db.prepare('INSERT INTO guesses (play_id, word, rank, similarity) VALUES (?, ?, ?, ?)').run(
    playId,
    'dummy',
    100,
    0.5,
  );
  db.prepare('UPDATE play_history SET guesses_count = guesses_count + 1 WHERE id = ?').run(playId);

  const play = db.prepare('SELECT * FROM play_history WHERE id = ?').get(playId);
  console.log('Play State:', play);

  if (play.guesses_count !== 1) {
    console.error('FAILED: Guesses count not updated');
    process.exit(1);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    console.error('FAILED: User not found');
    process.exit(1);
  }

  console.log('User found:', user.display_name);
  console.log('--- Verification Complete ---');
}

verify();
