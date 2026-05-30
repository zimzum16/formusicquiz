import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'db.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Каждая миграция применяется ровно один раз — при старте, если version < index+1
const migrations: string[] = [
  // v1 — начальная схема
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );`,
];

function runMigrations() {
  const current = (db.pragma('user_version', { simple: true }) as number);
  const pending = migrations.slice(current);

  if (pending.length === 0) return;

  for (let i = 0; i < pending.length; i++) {
    const version = current + i + 1;
    db.transaction(() => {
      db.exec(pending[i]);
      db.pragma(`user_version = ${version}`);
    })();
    console.log(`DB migration v${version} applied`);
  }
}

runMigrations();

export default db;
