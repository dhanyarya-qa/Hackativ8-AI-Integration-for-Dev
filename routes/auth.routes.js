/**
 * Authentication Routes
 */

import express from 'express';
import { registerUser, loginUser, logoutUser, requireAuth } from '../services/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { trackUserActivity } from '../services/analytics.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required'
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }
        
        const result = await registerUser(username, email, password);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        trackUserActivity(result.user.id, 'register', { email }, req.ip, req.get('user-agent'));
        
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        const result = await loginUser(email, password);
        
        if (!result.success) {
            return res.status(401).json(result);
        }
        
        trackUserActivity(result.user.id, 'login', { email }, req.ip, req.get('user-agent'));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', requireAuth, (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            logoutUser(token);
            trackUserActivity(req.user.userId, 'logout', {}, req.ip, req.get('user-agent'));
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

export default router;
