/**
 * Analytics Service
 * Track usage, costs, and performance metrics
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analyticsDb = new Database(path.join(__dirname, '..', 'database', 'analytics.db'));

analyticsDb.pragma('journal_mode = WAL');

// Create analytics tables
analyticsDb.exec(`
    CREATE TABLE IF NOT EXISTS token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        model TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        estimated_cost REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS response_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        response_time INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS query_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        query_length INTEGER,
        response_length INTEGER,
        model TEXT,
        success BOOLEAN,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_response_metrics_created ON response_metrics(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at);
`);

// Token pricing (per 1M tokens)
const TOKEN_PRICING = {
    'gemini-2.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.5-pro': { input: 1.25, output: 5.00 },
    'gemini-2.0-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash-lite': { input: 0.0375, output: 0.15 }
};

/**
 * Track token usage
 */
export function trackTokenUsage(chatId, model, promptTokens, completionTokens) {
    const totalTokens = promptTokens + completionTokens;
    const pricing = TOKEN_PRICING[model] || TOKEN_PRICING['gemini-2.5-flash'];
    const estimatedCost = (promptTokens / 1000000 * pricing.input) + (completionTokens / 1000000 * pricing.output);

    const stmt = analyticsDb.prepare(`
        INSERT INTO token_usage (chat_id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(chatId, model, promptTokens, completionTokens, totalTokens, estimatedCost);

    return { totalTokens, estimatedCost };
}

/**
 * Track response time
 */
export function trackResponseTime(endpoint, responseTime, statusCode, error = null) {
    const stmt = analyticsDb.prepare(`
        INSERT INTO response_metrics (endpoint, response_time, status_code, error)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(endpoint, responseTime, statusCode, error);
}

/**
 * Track user activity
 */
export function trackUserActivity(userId, action, metadata = null, ipAddress = null, userAgent = null) {
    const stmt = analyticsDb.prepare(`
        INSERT INTO user_activity (user_id, action, metadata, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(userId, action, JSON.stringify(metadata), ipAddress, userAgent);
}

/**
 * Track query analytics
 */
export function trackQuery(query, queryLength, responseLength, model, success) {
    const stmt = analyticsDb.prepare(`
        INSERT INTO query_analytics (query, query_length, response_length, model, success)
        VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(query.substring(0, 500), queryLength, responseLength, model, success ? 1 : 0);
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Token usage summary
    const tokenStats = analyticsDb.prepare(`
        SELECT 
            model,
            COUNT(*) as request_count,
            SUM(total_tokens) as total_tokens,
            SUM(estimated_cost) as total_cost,
            AVG(total_tokens) as avg_tokens
        FROM token_usage
        WHERE created_at >= ?
        GROUP BY model
    `).all(since.toISOString());

    // Response time stats
    const responseStats = analyticsDb.prepare(`
        SELECT 
            endpoint,
            COUNT(*) as request_count,
            AVG(response_time) as avg_response_time,
            MIN(response_time) as min_response_time,
            MAX(response_time) as max_response_time
        FROM response_metrics
        WHERE created_at >= ?
        GROUP BY endpoint
    `).all(since.toISOString());

    // Popular queries
    const popularQueries = analyticsDb.prepare(`
        SELECT 
            query,
            COUNT(*) as count,
            AVG(response_length) as avg_response_length
        FROM query_analytics
        WHERE created_at >= ?
        GROUP BY query
        ORDER BY count DESC
        LIMIT 10
    `).all(since.toISOString());

    // User activity
    const activityStats = analyticsDb.prepare(`
        SELECT 
            action,
            COUNT(*) as count
        FROM user_activity
        WHERE created_at >= ?
        GROUP BY action
        ORDER BY count DESC
    `).all(since.toISOString());

    return {
        period: `Last ${days} days`,
        tokenUsage: tokenStats,
        responseMetrics: responseStats,
        popularQueries,
        userActivity: activityStats
    };
}

/**
 * Get cost summary
 */
export function getCostSummary(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = analyticsDb.prepare(`
        SELECT 
            DATE(created_at) as date,
            model,
            SUM(total_tokens) as tokens,
            SUM(estimated_cost) as cost
        FROM token_usage
        WHERE created_at >= ?
        GROUP BY DATE(created_at), model
        ORDER BY date DESC
    `).all(since.toISOString());

    const totalCost = analyticsDb.prepare(`
        SELECT SUM(estimated_cost) as total
        FROM token_usage
        WHERE created_at >= ?
    `).get(since.toISOString());

    return {
        period: `Last ${days} days`,
        totalCost: totalCost.total || 0,
        breakdown: result
    };
}

export default analyticsDb;
