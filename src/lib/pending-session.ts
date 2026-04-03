import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const PENDING_SESSION_COOKIE = 'yt_pending';

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

function secret(): Buffer {
  const s = process.env.NEXTAUTH_SECRET || 'dev-secret-change-me';
  return Buffer.from(s);
}

export function signSession(data: PendingChannelSession): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const sig = createHmac('sha256', secret()).update(payload).digest('base64');
  return `${payload}.${sig}`;
}

export function verifySession(token: string): PendingChannelSession | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac('sha256', secret()).update(payload).digest('base64');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString()) as PendingChannelSession;
  } catch {
    return null;
  }
}
