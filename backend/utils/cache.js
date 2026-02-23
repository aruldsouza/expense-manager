/**
 * cache.js — Redis client utility using ioredis
 *
 * REDIS_URL defaults to localhost:6379 if not set.
 * The client degrades gracefully: if Redis is unreachable,
 * get() returns null (cache miss) and set/del are no-ops
 * so the application continues working without cache.
 */
const Redis = require('ioredis');

let client = null;
let connected = false;

const getClient = () => {
    if (client) return client;

    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    client = new Redis(url, {
        lazyConnect: true,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            // Try 3 times then stop retrying (so server starts even without Redis)
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
        }
    });

    client.on('connect', () => {
        connected = true;
        console.log('✅ Redis connected');
    });

    client.on('error', (err) => {
        if (connected) console.warn('⚠️  Redis error:', err.message);
        connected = false;
    });

    client.connect().catch(() => {/* swallow connection errors — handled by error event */ });

    return client;
};

/**
 * Get a cached value by key.
 * Returns parsed JSON or null on miss / error.
 */
const get = async (key) => {
    try {
        const redis = getClient();
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
};

/**
 * Set a value with an optional TTL in seconds (default 60s).
 */
const set = async (key, value, ttlSeconds = 60) => {
    try {
        const redis = getClient();
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
        /* silent — cache write failure should never break the API */
    }
};

/**
 * Delete one or more keys. Supports glob patterns via SCAN+DEL.
 */
const del = async (...keys) => {
    try {
        const redis = getClient();
        if (keys.length > 0) await redis.del(...keys);
    } catch {
        /* silent */
    }
};

/**
 * Delete all keys matching a glob pattern (e.g. "balances:groupXYZ:*").
 */
const delPattern = async (pattern) => {
    try {
        const redis = getClient();
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) await redis.del(...keys);
        } while (cursor !== '0');
    } catch {
        /* silent */
    }
};

module.exports = { get, set, del, delPattern };
