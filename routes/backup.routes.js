/**
 * Backup Routes
 */

import express from 'express';
import { createBackup, listBackups, triggerManualBackup } from '../services/backup.js';
import { requireAuth, requireAdmin } from '../services/auth.js';

const router = express.Router();

/**
 * POST /api/backup/create
 * Create manual backup
 */
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await triggerManualBackup();
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/backup/list
 * List all backups
 */
router.get('/list', requireAuth, requireAdmin, (req, res) => {
    try {
        const backups = listBackups();
        
        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/backup/download/:filename
 * Download specific backup
 */
router.get('/download/:filename', requireAuth, requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        const backups = listBackups();
        const backup = backups.find(b => b.name === filename);
        
        if (!backup) {
            return res.status(404).json({
                success: false,
                error: 'Backup not found'
            });
        }
        
        res.download(backup.path, filename);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
