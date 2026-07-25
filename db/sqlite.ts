import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import Database from 'better-sqlite3'

let db: Database.Database
let attachmentsDir: string

export function initDB(dataDir: string) {
  db = new Database(join(dataDir, 'jarvis.db'))

  // Create attachments directory for persisted images/files
  attachmentsDir = join(dataDir, 'attachments')
  if (!existsSync(attachmentsDir)) {
    mkdirSync(attachmentsDir, { recursive: true })
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tokens INTEGER DEFAULT 0,
      display_content TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT,
      file_path TEXT,
      text_preview TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_session ON message_attachments(session_id);
  `)

  // Migration: add display_content column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN display_content TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add user_id column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN user_id TEXT DEFAULT ''`)
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT DEFAULT ''`)
  } catch {
    // Column already exists
  }

  console.log('✅ SQLite DB initialized')
}

// Save image data URL to disk, return the local file path
export function saveImageToDisk(dataUrl: string, name: string, sessionId: string): string {
  const base64Data = dataUrl.split(',')[1]
  if (!base64Data) return ''

  const ext = name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = join(attachmentsDir, fileName)

  writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
  return filePath
}

// Load image from disk as data URL
export function loadImageFromDisk(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null
    const buffer = readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'image/png'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export function updateMessageDisplayContent(messageId: number, displayContent: string | null) {
  db.prepare(`UPDATE messages SET display_content = ? WHERE id = ?`).run(displayContent, messageId)
}

export function clearAllData() {
  db.exec(`DELETE FROM message_attachments`)
  db.exec(`DELETE FROM messages`)
  db.exec(`DELETE FROM sessions`)
  console.log('🗑️ All chat data cleared')
}

export function deleteSessionData(sessionId: string) {
  db.prepare(`DELETE FROM message_attachments WHERE session_id = ?`).run(sessionId)
  db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(sessionId)
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId)
  console.log(`🗑️ Session ${sessionId} deleted`)
}

// Save message attachments (images saved to disk, metadata to DB)
export function saveMessageAttachments(
  messageId: number,
  sessionId: string,
  imageDataUrls?: Array<{ name: string; dataUrl: string }>,
  fileAttachments?: Array<{ name: string; path: string; text?: string }>
) {
  const stmt = db.prepare(`
    INSERT INTO message_attachments (message_id, session_id, type, name, path, file_path, text_preview, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  if (imageDataUrls) {
    for (const img of imageDataUrls) {
      const savedPath = saveImageToDisk(img.dataUrl, img.name, sessionId)
      stmt.run(messageId, sessionId, 'image', img.name, '', savedPath, null, Date.now())
    }
  }

  if (fileAttachments) {
    for (const file of fileAttachments) {
      stmt.run(messageId, sessionId, 'file', file.name, file.path, null, file.text || null, Date.now())
    }
  }
}

// Get attachments for messages (loads images from disk)
export function getMessageAttachments(messageIds: number[]): Record<number, { imageDataUrls: Array<{ name: string; dataUrl: string }>; fileAttachments: Array<{ name: string; path: string; text?: string }> }> {
  if (messageIds.length === 0) return {}

  const placeholders = messageIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT * FROM message_attachments WHERE message_id IN (${placeholders})
  `).all(...messageIds) as any[]

  const result: Record<number, any> = {}

  for (const row of rows) {
    if (!result[row.message_id]) {
      result[row.message_id] = { imageDataUrls: [], fileAttachments: [] }
    }

    if (row.type === 'image' && row.file_path) {
      const dataUrl = loadImageFromDisk(row.file_path)
      if (dataUrl) {
        result[row.message_id].imageDataUrls.push({ name: row.name, dataUrl })
      }
    } else if (row.type === 'file') {
      result[row.message_id].fileAttachments.push({
        name: row.name,
        path: row.path || '',
        text: row.text_preview || undefined,
      })
    }
  }

  return result
}

export function saveMessage(
  role: 'user' | 'assistant',
  content: string,
  sessionId: string,
  tokens = 0,
  displayContent?: string,
  userId?: string
) {
  const stmt = db.prepare(`
    INSERT INTO messages (role, content, session_id, timestamp, tokens, display_content, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(role, content, sessionId, Date.now(), tokens, displayContent || null, userId || '')
  return result
}

export function getMessages(limit = 50, sessionId?: string, userId?: string) {
  if (sessionId) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(sessionId, limit)
  }
  if (userId) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit)
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

export function getMessagesBySessionIds(sessionIds: string[], limit = 500): any[] {
  if (sessionIds.length === 0) return []
  const placeholders = sessionIds.map(() => '?').join(',')
  return db.prepare(`
    SELECT * FROM messages
    WHERE session_id IN (${placeholders})
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(...sessionIds, limit) as any[]
}

export function createSession(id: string, title: string, userId?: string) {
  const now = Date.now()
  db.prepare(`
    INSERT OR REPLACE INTO sessions (id, title, created_at, updated_at, user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, now, now, userId || '')
}

export function updateSession(id: string, title: string) {
  db.prepare(`
    UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?
  `).run(title, Date.now(), id)
}

export function getSessions(limit = 20, userId?: string) {
  if (userId) {
    return db.prepare(`
      SELECT s.*, COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT ?
    `).all(userId, limit)
  }
  return db.prepare(`
    SELECT s.*, COUNT(m.id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
    LIMIT ?
  `).all(limit)
}
