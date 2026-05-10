/**
 * Gemini Flash Chatbot - SQLite Database Module
 * Stores chat history, messages, and prompt templates
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'database', 'chatbot.db'));

db.pragma('journal_mode = WAL');

// ── Create Tables ─────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'Percakapan Baru',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'ai')),
        content TEXT NOT NULL,
        model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
`);

// Seed default templates if empty
const count = db.prepare('SELECT COUNT(*) as c FROM templates').get();
if (count.c === 0) {
    const defaults = [
        { name: 'Terjemahkan', content: 'Terjemahkan teks berikut ke bahasa Indonesia:\n\n{text}' },
        { name: 'Jelaskan Simple', content: 'Jelaskan topik berikut seolah-olah saya berumur 5 tahun:\n\n{text}' },
        { name: 'Review Kode', content: 'Review kode berikut dan berikan saran perbaikan:\n\n```\n{text}\n```' },
        { name: 'Ringkas', content: 'Ringkas teks berikut secara singkat dan padat:\n\n{text}' },
    ];
    const insert = db.prepare('INSERT INTO templates (name, content) VALUES (?, ?)');
    const txn = db.transaction((items) => {
        for (const item of items) insert.run(item.name, item.content);
    });
    txn(defaults);
}

// ═══════════════════════════════════════════════════════════
// Chat Methods
// ═══════════════════════════════════════════════════════════

export function createChat(title = 'Percakapan Baru') {
    const stmt = db.prepare('INSERT INTO chats (title) VALUES (?)');
    const result = stmt.run(title);
    return { id: result.lastInsertRowid, title };
}

export function getChats() {
    return db.prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
        FROM chats c
        ORDER BY c.updated_at DESC
    `).all();
}

export function getChat(id) {
    return db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
}

export function deleteChat(id) {
    db.prepare('DELETE FROM chats WHERE id = ?').run(id);
}

export function updateChatTitle(id, title) {
    db.prepare('UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, id);
}

// ═══════════════════════════════════════════════════════════
// Message Methods
// ═══════════════════════════════════════════════════════════

export function addMessage(chatId, role, content, model = null) {
    const stmt = db.prepare('INSERT INTO messages (chat_id, role, content, model) VALUES (?, ?, ?, ?)');
    const result = stmt.run(chatId, role, content, model);
    // Update chat timestamp
    db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
    return { id: result.lastInsertRowid };
}

export function getMessages(chatId) {
    return db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId);
}

export function deleteMessage(id) {
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}

export function updateMessage(id, content) {
    db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
}

export function searchMessages(query) {
    const q = `%${query}%`;
    return db.prepare(`
        SELECT m.*, c.title as chat_title
        FROM messages m
        JOIN chats c ON m.chat_id = c.id
        WHERE m.content LIKE ?
        ORDER BY m.created_at DESC
        LIMIT 50
    `).all(q);
}

// ═══════════════════════════════════════════════════════════
// Pin Methods
// ═══════════════════════════════════════════════════════════

export function getPins(chatId) {
    return db.prepare(`
        SELECT p.*, m.role, m.content
        FROM pins p
        JOIN messages m ON p.message_id = m.id
        WHERE p.chat_id = ?
        ORDER BY p.created_at DESC
    `).all(chatId);
}

export function addPin(chatId, messageId, note = '') {
    const stmt = db.prepare('INSERT INTO pins (chat_id, message_id, note) VALUES (?, ?, ?)');
    const result = stmt.run(chatId, messageId, note);
    return { id: result.lastInsertRowid };
}

export function removePin(id) {
    db.prepare('DELETE FROM pins WHERE id = ?').run(id);
}

// ═══════════════════════════════════════════════════════════
// Template Methods
// ═══════════════════════════════════════════════════════════

export function getTemplates() {
    return db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
}

export function createTemplate(name, content) {
    const stmt = db.prepare('INSERT INTO templates (name, content) VALUES (?, ?)');
    const result = stmt.run(name, content);
    return { id: result.lastInsertRowid };
}

export function deleteTemplate(id) {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

export default db;
