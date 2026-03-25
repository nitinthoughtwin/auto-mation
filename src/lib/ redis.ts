/**
 * Redis Client Configuration
 * 
 * Uses Upstash Redis for serverless environments or standard Redis for VPS
 * 
 * Environment Variables:
 * - REDIS_URL: Redis connection URL (e.g., redis://localhost:6379)
 * - Or use Upstash: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */

import Redis from 'ioredis';

// Singleton pattern for Redis client
let redis: Redis | null = null;

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

// Cache configuration
export const CACHE_CONFIG = {
  // User sessions - short TTL
  USER_SESSION: 60 * 15, // 15 minutes
  
  // User profile data - medium TTL
  USER_PROFILE: 60 * 30, // 30 minutes
  
  // Plan data - longer TTL since plans change rarely
  PLANS_LIST: 60 * 60, // 1 hour
  PLAN_DETAIL: 60 * 60 * 2, // 2 hours
  
  // Video metadata
  VIDEO_METADATA: 60 * 60, // 1 hour
  
  // Rate limiting
  RATE_LIMIT: 60, // 1 minute (varies by endpoint)
  
  // API responses
  API_RESPONSE: 60 * 5, // 5 minutes
  
  // Static content
  STATIC_CONTENT: 60 * 60 * 24, // 24 hours
};

export function getRedisClient(): Redis | null {
  // Return existing client if available
  if (redis) {
    return redis;
  }

  // Check for global client (prevents multiple instances in dev)
  if (globalThis.redis) {
    redis = globalThis.redis;
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('Redis URL not configured. Caching will be disabled.');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 10000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    globalThis.redis = redis;
    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Cache utility functions
 */
export const cache = {
  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      if (!data) return null;
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set a cached value with TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const data = JSON.stringify(value);
      
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, data);
      } else {
        await client.set(key, data);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute fetch function
    const data = await fetchFn();

    // Cache the result (fire and forget)
    this.set(key, data, ttlSeconds);

    return data;
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  },

  /**
   * Increment with expiry
   */
  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      const result = await client
        .multi()
        .incr(key)
        .expire(key, ttlSeconds)
        .exec();
      
      return result?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error('Cache incrWithExpiry error:', error);
      return 0;
    }
  },
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userSubscription: (userId: string) => `user:subscription:${userId}`,
  plansList: () => 'plans:list',
  planDetail: (planId: string) => `plan:${planId}`,
  videosList: (userId: string, page: number) => `videos:${userId}:${page}`,
  videoDetail: (videoId: string) => `video:${videoId}`,
  rateLimit: (clientId: string, endpoint: string) => `ratelimit:${clientId}:${endpoint}`,
  apiCache: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
};

export default cache;