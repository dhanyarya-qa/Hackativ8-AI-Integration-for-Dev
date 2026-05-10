/**
 * Configuration Management
 */

export default {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // API Keys
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    
    // Rate Limiting
    RATE_LIMIT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Terlalu banyak request, coba lagi nanti.'
    },
    
    // Cache
    CACHE: {
        TTL: 3600, // 1 hour in seconds
        CHECK_PERIOD: 600 // check for expired keys every 10 minutes
    },
    
    // File Upload
    UPLOAD: {
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ALLOWED_DOC_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
    },
    
    // Database
    DB: {
        PATH: './database/chatbot.db',
        BACKUP_PATH: './backups',
        BACKUP_SCHEDULE: '0 2 * * *' // Daily at 2 AM
    },
    
    // Security
    SECURITY: {
        JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this',
        JWT_EXPIRES_IN: '7d',
        BCRYPT_ROUNDS: 10
    },
    
    // Analytics
    ANALYTICS: {
        TRACK_TOKEN_USAGE: true,
        TRACK_RESPONSE_TIME: true,
        TRACK_USER_ACTIVITY: true
    },
    
    // AI Models
    MODELS: {
        DEFAULT: 'gemini-2.5-flash',
        AUTO_SWITCH: true, // Auto switch based on query complexity
        COST_OPTIMIZATION: true
    },
    
    // Context Management
    CONTEXT: {
        MAX_HISTORY: 10, // Maximum messages to send as context
        MAX_TOKENS: 30000 // Maximum tokens for context
    },
    
    // Logging
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        DIR: './logs',
        MAX_FILES: '14d'
    }
};
