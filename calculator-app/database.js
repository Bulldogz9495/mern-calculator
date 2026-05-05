'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'history.db');

const db = new Database(DB_PATH);

// Enforce WAL mode for better concurrent read performance and crash safety.
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    expression TEXT    NOT NULL,
    result     REAL    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

function saveCalculation(expression, result) {
  const insert = db.prepare(
    'INSERT INTO history (expression, result) VALUES (?, ?)'
  );
  const info = insert.run(expression, result);
  const row = db
    .prepare('SELECT id, expression, result, created_at FROM history WHERE id = ?')
    .get(info.lastInsertRowid);
  return row;
}

function getHistory() {
  return db
    .prepare('SELECT id, expression, result, created_at FROM history ORDER BY id DESC')
    .all();
}

function clearHistory() {
  const info = db.prepare('DELETE FROM history').run();
  return info.changes;
}

module.exports = { saveCalculation, getHistory, clearHistory };
