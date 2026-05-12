import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database

export function initDB(dataDir: string) {
  db = new Database(join(dataDir, 'jarvis.db'))

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tokens INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `)

  console.log('✅ SQLite DB initialized')
}

export function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  sessionId: string,
  tokens = 0
) {
  const stmt = db.prepare(`
    INSERT INTO messages (role, content, session_id, timestamp, tokens)
    VALUES (?, ?, ?, ?, ?)
  `)
  return stmt.run(role, content, sessionId, Date.now(), tokens)
}

export function getMessages(limit = 50, sessionId?: string) {
  if (sessionId) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(sessionId, limit)
  }
  return db.prepare(`
    SELECT * FROM messages
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit)
}

export function getRecentContext(limit = 10): Array<{role: string, content: string}> {
  const rows = db.prepare(`
    SELECT role, content FROM messages
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as Array<{role: string, content: string}>
  return rows.reverse()
}

export function createSession(id: string, title: string) {
  const now = Date.now()
  db.prepare(`
    INSERT OR REPLACE INTO sessions (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, title, now, now)
}

export function updateSession(id: string, title: string) {
  db.prepare(`
    UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?
  `).run(title, Date.now(), id)
}

export function getSessions(limit = 20) {
  return db.prepare(`
    SELECT s.*, COUNT(m.id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
    LIMIT ?
  `).all(limit)
}
