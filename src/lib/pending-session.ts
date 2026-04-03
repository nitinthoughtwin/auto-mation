import 'server-only';
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const TTL_SECONDS = 600; // 10 minutes
const KEY_PREFIX = 'yt_pending:';

export const PENDING_SESSION_COOKIE = 'yt_pending_id';

export interface PendingChannelSession {
  accessToken: string;
  refreshToken: string;
  channels: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail: string | null;
  }>;
  userId: string | null;
}

function getRedis(): Redis {
  if (!REDIS_URL) throw new Error('Redis not configured');
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

export async function savePendingSession(data: PendingChannelSession): Promise<string> {
  // Generate a random session ID (32 hex chars)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const sessionId = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

  const redis = getRedis();
  try {
    await redis.set(
      KEY_PREFIX + sessionId,
      JSON.stringify(data),
      'EX',
      TTL_SECONDS
    );
  } finally {
    redis.disconnect();
  }
  return sessionId;
}

export async function getPendingSession(sessionId: string): Promise<PendingChannelSession | null> {
  const redis = getRedis();
  try {
    const raw = await redis.get(KEY_PREFIX + sessionId);
    if (!raw) return null;
    return JSON.parse(raw) as PendingChannelSession;
  } catch {
    return null;
  } finally {
    redis.disconnect();
  }
}

export async function deletePendingSession(sessionId: string): Promise<void> {
  const redis = getRedis();
  try {
    await redis.del(KEY_PREFIX + sessionId);
  } finally {
    redis.disconnect();
  }
}
