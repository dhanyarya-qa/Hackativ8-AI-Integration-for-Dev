/**
 * Caching Middleware using Node-Cache
 */

import NodeCache from 'node-cache';
import config from '../config/config.js';
import crypto from 'crypto';

const cache = new NodeCache({
    stdTTL: config.CACHE.TTL,
    checkperiod: config.CACHE.CHECK_PERIOD,
    useClones: false
});

/**
 * Generate cache key from request
 */
function generateCacheKey(req) {
    const { prompt, model } = req.body;
    const data = JSON.stringify({ prompt, model });
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Cache middleware for AI responses
 */
export function cacheMiddleware(req, res, next) {
    // Only cache GET requests and simple text prompts
    if (req.method !== 'POST' || !req.body.prompt) {
        return next();
    }

    // Don't cache if files are involved
    if (req.files || req.body.files) {
        return next();
    }

    const key = generateCacheKey(req);
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.status(200).json({
            ...cachedResponse,
            cached: true,
            cacheKey: key
        });
    }

    console.log(`❌ Cache MISS: ${key}`);

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
        if (data.success && data.data && data.data.answer) {
            cache.set(key, data);
            console.log(`💾 Cached response: ${key}`);
        }
        return originalJson(data);
    };

    next();
}

/**
 * Clear cache
 */
export function clearCache() {
    cache.flushAll();
    console.log('🗑️  Cache cleared');
}

/**
 * Get cache stats
 */
export function getCacheStats() {
    return {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
        ksize: cache.getStats().ksize,
        vsize: cache.getStats().vsize
    };
}

export default cache;
