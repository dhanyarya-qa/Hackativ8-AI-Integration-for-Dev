/**
 * Security Middleware
 */

import helmet from 'helmet';

/**
 * Helmet security headers
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

/**
 * Input sanitization
 */
export function sanitizeInput(req, res, next) {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Remove potential XSS
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
        }
    }
    next();
}

/**
 * Content moderation - basic filter
 */
const BLOCKED_KEYWORDS = [
    'hack', 'exploit', 'malware', 'virus', 'crack',
    'illegal', 'piracy', 'stolen', 'fraud'
];

export function contentModeration(req, res, next) {
    const { prompt } = req.body;
    
    if (prompt && typeof prompt === 'string') {
        const lowerPrompt = prompt.toLowerCase();
        const hasBlockedContent = BLOCKED_KEYWORDS.some(keyword => 
            lowerPrompt.includes(keyword)
        );
        
        if (hasBlockedContent) {
            return res.status(400).json({
                success: false,
                error: 'Konten tidak diizinkan. Harap gunakan bahasa yang sesuai.'
            });
        }
    }
    
    next();
}

/**
 * API Key validation
 */
export function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    // Skip validation in development
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'API key tidak valid'
        });
    }
    
    next();
}
