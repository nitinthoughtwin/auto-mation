/**
 * Cached API Utilities
 * 
 * Examples of using Redis caching in your API routes
 */

import { cache, cacheKeys, CACHE_CONFIG } from './redis';

/**
 * Get cached plans list
 */
export async function getCachedPlans() {
  return cache.getOrSet(
    cacheKeys.plansList(),
    async () => {
      const { prisma } = await import('./db');
      return prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    CACHE_CONFIG.PLANS_LIST
  );
}

/**
 * Invalidate plans cache
 */
export async function invalidatePlansCache() {
  return cache.del(cacheKeys.plansList());
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(userId: string) {
  return cache.getOrSet(
    cacheKeys.userProfile(userId),
    async () => {
      const { prisma } = await import('./db');
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
          },
        },
      });
    },
    CACHE_CONFIG.USER_PROFILE
  );
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string) {
  await Promise.all([
    cache.del(cacheKeys.user(userId)),
    cache.del(cacheKeys.userProfile(userId)),
    cache.del(cacheKeys.userSubscription(userId)),
  ]);
}

/**
 * Cache wrapper for any async function
 */
export function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    return cache.getOrSet(key, fn, ttl);
  };
}

/**
 * Example: Cached API response helper
 */
export async function cachedApiResponse<T>(
  request: Request,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_CONFIG.API_RESPONSE
): Promise<Response> {
  // Try to get from cache
  const cached = await cache.get<T>(key);
  
  if (cached !== null) {
    return new Response(JSON.stringify(cached), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${ttl}`,
      },
    });
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  await cache.set(key, data, ttl);

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${ttl}`,
    },
  });
}

export { cache, cacheKeys, CACHE_CONFIG };