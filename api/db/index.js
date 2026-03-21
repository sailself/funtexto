import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'funtexto.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      secret_code TEXT
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_word TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      game_number INTEGER
    );

    CREATE TABLE IF NOT EXISTS related_words (
      game_id INTEGER,
      word TEXT,
      rank INTEGER,
      similarity REAL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      game_id INTEGER,
      status TEXT CHECK(status IN ('playing', 'won', 'given_up')) DEFAULT 'playing',
      guesses_count INTEGER DEFAULT 0,
      finished_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    CREATE TABLE IF NOT EXISTS guesses (
      play_id INTEGER,
      word TEXT,
      rank INTEGER,
      similarity REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (play_id) REFERENCES play_history(id) ON DELETE CASCADE
    );
  `);

  // Keep lookup indexes fast even if older data already contains duplicates.
  db.exec(`
    DELETE FROM related_words
    WHERE rowid NOT IN (
      SELECT MIN(rowid)
      FROM related_words
      GROUP BY game_id, word
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_related_words_game_word ON related_words(game_id, word);
    CREATE INDEX IF NOT EXISTS idx_related_words_game_rank ON related_words(game_id, rank);
    CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_play_history_game_id ON play_history(game_id);
    CREATE INDEX IF NOT EXISTS idx_guesses_play_id ON guesses(play_id);
    CREATE INDEX IF NOT EXISTS idx_guesses_play_id_word ON guesses(play_id, word);
  `);
}

initDB();

export default db;
