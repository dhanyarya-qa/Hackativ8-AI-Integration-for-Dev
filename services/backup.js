/**
 * Backup Service
 * Automated database backup with scheduling
 */

import schedule from 'node-schedule';
import * as archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';
import logger from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', config.DB.BACKUP_PATH);

// Create backup directory if not exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create backup of database
 */
export async function createBackup() {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup-${timestamp}.zip`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        const output = fs.createWriteStream(backupPath);
        const archive = archiver.default('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            logger.info(`✅ Backup created: ${backupFileName} (${sizeMB} MB)`);
            
            // Clean old backups (keep last 30)
            cleanOldBackups(30);
            
            resolve({
                success: true,
                fileName: backupFileName,
                path: backupPath,
                size: archive.pointer()
            });
        });

        archive.on('error', (err) => {
            logger.error(`❌ Backup failed: ${err.message}`);
            reject(err);
        });

        archive.pipe(output);

        // Add database files
        const dbPath = path.join(__dirname, '..', 'database', 'chatbot.db');
        const analyticsDbPath = path.join(__dirname, '..', 'database', 'analytics.db');

        if (fs.existsSync(dbPath)) {
            archive.file(dbPath, { name: 'chatbot.db' });
        }

        if (fs.existsSync(analyticsDbPath)) {
            archive.file(analyticsDbPath, { name: 'analytics.db' });
        }

        // Add .env file (optional)
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            archive.file(envPath, { name: '.env' });
        }

        archive.finalize();
    });
}

/**
 * Clean old backups
 */
function cleanOldBackups(keepCount = 30) {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        // Delete old backups
        if (files.length > keepCount) {
            const toDelete = files.slice(keepCount);
            toDelete.forEach(file => {
                fs.unlinkSync(file.path);
                logger.info(`🗑️  Deleted old backup: ${file.name}`);
            });
        }
    } catch (error) {
        logger.error(`Failed to clean old backups: ${error.message}`);
    }
}

/**
 * List all backups
 */
export function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    created: stats.mtime,
                    path: path.join(BACKUP_DIR, f)
                };
            })
            .sort((a, b) => b.created - a.created);

        return files;
    } catch (error) {
        logger.error(`Failed to list backups: ${error.message}`);
        return [];
    }
}

/**
 * Restore from backup
 */
export async function restoreBackup(backupFileName) {
    // Implementation for restore (requires unzip and database replacement)
    // This is a placeholder - implement based on your needs
    logger.info(`Restore requested for: ${backupFileName}`);
    return { success: true, message: 'Restore functionality - implement as needed' };
}

/**
 * Schedule automatic backups
 */
export function scheduleBackups() {
    // Daily backup at 2 AM
    const job = schedule.scheduleJob(config.DB.BACKUP_SCHEDULE, async () => {
        logger.info('🕐 Starting scheduled backup...');
        try {
            await createBackup();
        } catch (error) {
            logger.error(`Scheduled backup failed: ${error.message}`);
        }
    });

    logger.info(`📅 Backup scheduled: ${config.DB.BACKUP_SCHEDULE}`);
    return job;
}

/**
 * Manual backup trigger
 */
export async function triggerManualBackup() {
    logger.info('🔧 Manual backup triggered');
    return await createBackup();
}
