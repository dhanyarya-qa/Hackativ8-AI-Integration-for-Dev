/**
 * Winston Logger Configuration
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config/config.js';
import fs from 'fs';
import path from 'path';

// Create logs directory if not exists
if (!fs.existsSync(config.LOGGING.DIR)) {
    fs.mkdirSync(config.LOGGING.DIR, { recursive: true });
}

// Custom format
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// Transport for all logs
const allLogsTransport = new DailyRotateFile({
    filename: path.join(config.LOGGING.DIR, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: config.LOGGING.MAX_FILES,
    format: customFormat
});

// Transport for error logs
const errorLogsTransport = new DailyRotateFile({
    filename: path.join(config.LOGGING.DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: config.LOGGING.MAX_FILES,
    level: 'error',
    format: customFormat
});

// Create logger
const logger = winston.createLogger({
    level: config.LOGGING.LEVEL,
    transports: [
        allLogsTransport,
        errorLogsTransport
    ]
});

// Console transport for development
if (config.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

/**
 * Express middleware for request logging
 */
export function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        };
        
        if (res.statusCode >= 400) {
            logger.error(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        } else {
            logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        }
    });
    
    next();
}

export default logger;
