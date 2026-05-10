/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import config from '../config/config.js';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT.windowMs,
    max: config.RATE_LIMIT.max,
    message: { success: false, error: config.RATE_LIMIT.message },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for AI generation endpoints
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { success: false, error: 'Terlalu banyak request AI. Tunggu sebentar.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Upload limiter
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per 15 minutes
    message: { success: false, error: 'Terlalu banyak upload. Coba lagi nanti.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth limiter (stricter for login attempts)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 attempts per 15 minutes
    message: { success: false, error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
    standardHeaders: true,
    legacyHeaders: false,
});
