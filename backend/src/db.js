// SQLite access layer. Every query uses parameterized prepared statements —
// no string interpolation of user input anywhere (SQL-injection safe).
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
`;

/**
 * Open (and migrate) a database. Pass ':memory:' for tests.
 */
export function openDb(path) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

// --- User queries -----------------------------------------------------------

export function createUser(db, username, passwordHash) {
  const info = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return { id: Number(info.lastInsertRowid), username };
}

export function findUserByUsername(db, username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

// --- Note queries (always scoped by user_id for per-user isolation) ----------

export function listNotes(db, userId) {
  return db
    .prepare('SELECT id, title, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId);
}

export function getNote(db, userId, noteId) {
  return db
    .prepare('SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId);
}

export function createNote(db, userId, title, content) {
  const info = db
    .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
    .run(userId, title, content);
  return getNote(db, userId, Number(info.lastInsertRowid));
}

export function updateNote(db, userId, noteId, title, content) {
  // The WHERE clause binds user_id, so a user can never update another's note.
  const info = db
    .prepare(
      "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    )
    .run(title, content, noteId, userId);
  return info.changes > 0 ? getNote(db, userId, noteId) : null;
}

export function deleteNote(db, userId, noteId) {
  const info = db
    .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .run(noteId, userId);
  return info.changes > 0;
}
