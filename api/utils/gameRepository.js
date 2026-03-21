import db from '../db/index.js';

const selectGameByIdStmt = db.prepare('SELECT * FROM games WHERE id = ?');
const selectLatestGameStmt = db.prepare('SELECT * FROM games ORDER BY id DESC LIMIT 1');
const selectRelatedWordsStmt = db.prepare(`
  SELECT word, rank, similarity
  FROM related_words
  WHERE game_id = ?
  ORDER BY rank ASC
`);
const selectRelatedWordStmt = db.prepare(`
  SELECT word, rank, similarity
  FROM related_words
  WHERE game_id = ? AND word = ?
`);
const countRelatedWordsStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM related_words
  WHERE game_id = ?
`);

export function getGameByIdOrLatest(gameId) {
  if (gameId !== undefined && gameId !== null && `${gameId}`.trim() !== '') {
    return selectGameByIdStmt.get(gameId);
  }

  return selectLatestGameStmt.get();
}

export function getLatestGame() {
  return selectLatestGameStmt.get();
}

export function getRelatedWordsForGame(gameId) {
  return selectRelatedWordsStmt.all(gameId);
}

export function getRelatedWordForGame(gameId, word) {
  return selectRelatedWordStmt.get(gameId, word);
}

export function countRelatedWordsForGame(gameId) {
  return countRelatedWordsStmt.get(gameId).count;
}
