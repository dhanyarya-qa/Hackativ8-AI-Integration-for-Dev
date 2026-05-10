/**
 * Analytics Routes
 */

import express from 'express';
import { getAnalyticsSummary, getCostSummary } from '../services/analytics.js';
import { getCacheStats, clearCache } from '../middleware/cache.js';

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Get analytics summary
 */
router.get('/summary', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const summary = getAnalyticsSummary(days);
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/costs
 * Get cost summary
 */
router.get('/costs', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const costs = getCostSummary(days);
        
        res.json({
            success: true,
            data: costs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/cache
 * Get cache statistics
 */
router.get('/cache', (req, res) => {
    try {
        const stats = getCacheStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/analytics/cache/clear
 * Clear cache
 */
router.post('/cache/clear', (req, res) => {
    try {
        clearCache();
        
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
