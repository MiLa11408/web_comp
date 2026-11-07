// db.js · SQLite 连接与表结构（node:sqlite 内置模块）
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.MM_DATA_DIR || path.join(__dirname, '..', '..', '.data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'app.db'));

db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('chapter','book','route')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, chapter_id, kind)
);
CREATE TABLE IF NOT EXISTS annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  quote TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('started','done')),
  read_at TEXT NOT NULL,
  PRIMARY KEY (user_id, chapter_id)
);
CREATE TABLE IF NOT EXISTS reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reads_book ON reads(book_id);
CREATE INDEX IF NOT EXISTS idx_reads_reader ON reads(reader_id);
CREATE TABLE IF NOT EXISTS fragment_picks (
  reader_id TEXT NOT NULL,
  fragment_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (reader_id, fragment_id)
);
`);

export function nowIso() {
  return new Date().toISOString();
}