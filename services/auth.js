/**
 * Authentication Service
 * User authentication and authorization
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authDb = new Database(path.join(__dirname, '..', 'database', 'auth.db'));

authDb.pragma('journal_mode = WAL');

// Create users table
authDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        api_key TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`);

/**
 * Register new user
 */
export async function registerUser(username, email, password) {
    try {
        // Check if user exists
        const existing = authDb.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existing) {
            return { success: false, error: 'User already exists' };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, config.SECURITY.BCRYPT_ROUNDS);
        
        // Generate API key
        const apiKey = `gsk_${uuidv4().replace(/-/g, '')}`;
        
        // Create user
        const userId = uuidv4();
        const stmt = authDb.prepare(`
            INSERT INTO users (id, username, email, password_hash, api_key)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(userId, username, email, passwordHash, apiKey);

        return {
            success: true,
            user: {
                id: userId,
                username,
                email,
                apiKey
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Login user
 */
export async function loginUser(email, password) {
    try {
        // Get user
        const user = authDb.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
        
        if (!user) {
            return { success: false, error: 'Invalid credentials' };
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return { success: false, error: 'Invalid credentials' };
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            config.SECURITY.JWT_SECRET,
            { expiresIn: config.SECURITY.JWT_EXPIRES_IN }
        );

        // Create session
        const sessionId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        authDb.prepare(`
            INSERT INTO sessions (id, user_id, token, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(sessionId, user.id, token, expiresAt.toISOString());

        // Update last login
        authDb.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        return {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                apiKey: user.api_key
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, config.SECURITY.JWT_SECRET);
        
        // Check if session exists
        const session = authDb.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
            .get(token, new Date().toISOString());
        
        if (!session) {
            return { success: false, error: 'Session expired' };
        }

        return { success: true, user: decoded };
    } catch (error) {
        return { success: false, error: 'Invalid token' };
    }
}

/**
 * Verify API key
 */
export function verifyApiKey(apiKey) {
    try {
        const user = authDb.prepare('SELECT * FROM users WHERE api_key = ? AND is_active = 1').get(apiKey);
        
        if (!user) {
            return { success: false, error: 'Invalid API key' };
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Logout user
 */
export function logoutUser(token) {
    try {
        authDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Middleware: Require authentication
 */
export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const apiKey = req.headers['x-api-key'];

    // Try API key first
    if (apiKey) {
        const result = verifyApiKey(apiKey);
        if (result.success) {
            req.user = result.user;
            return next();
        }
    }

    // Try JWT token
    if (token) {
        const result = verifyToken(token);
        if (result.success) {
            req.user = result.user;
            return next();
        }
    }

    return res.status(401).json({
        success: false,
        error: 'Authentication required'
    });
}

/**
 * Middleware: Require admin role
 */
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
}

export default authDb;
