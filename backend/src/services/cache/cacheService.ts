import Redis from 'ioredis';
import { config } from '../../config';

export class CacheService {
  private redis: Redis | null = null;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    try {
      this.redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err) => {
        console.warn('Redis cache connection error:', err.message);
      });

      this.redis.on('connect', () => {
        console.log('Redis cache connected');
      });
    } catch (error) {
      console.warn('Redis cache initialization failed, caching disabled');
      this.redis = null;
    }
  }

  private isConnected(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;

    try {
      const data = await this.redis!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = this.defaultTTL): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.redis!.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.redis!.del(key);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
    } catch (error) {
      console.warn('Cache delete pattern error:', error);
    }
  }

  /**
   * Cache wrapper for async functions
   * Executes fn and caches the result, or returns cached value if available
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Generate user-specific cache key
   */
  userKey(userId: string, suffix: string): string {
    return `triforce:user:${userId}:${suffix}`;
  }

  /**
   * Invalidate all cache for a specific user
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delPattern(`triforce:user:${userId}:*`);
  }

  /**
   * Generate resource cache key
   */
  resourceKey(suffix: string): string {
    return `triforce:resource:${suffix}`;
  }
}

export const cacheService = new CacheService();
export default cacheService;
