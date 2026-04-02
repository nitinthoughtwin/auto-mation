import 'server-only';
import crypto from 'crypto';

export const PENDING_SESSION_COOKIE = 'yt_pending_session';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-change-in-production';
}

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
  exp: number;
}

export function signSession(payload: Omit<PendingChannelSession, 'exp'>): string {
  const data: PendingChannelSession = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySession(token: string): PendingChannelSession | null {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(encoded)
    .digest('base64url');

  if (sig !== expectedSig) return null;

  try {
    const payload: PendingChannelSession = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    );
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}
