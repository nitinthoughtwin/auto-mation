import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

// Returns the list of channels from the pending OAuth session cookie
// Tokens are NOT exposed — only channel metadata for display
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(PENDING_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'No pending session' }, { status: 404 });
  }

  const session = verifySession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  return NextResponse.json({
    channels: session.channels.map(ch => ({
      id: ch.id,
      title: ch.title,
      thumbnail: ch.thumbnail,
    })),
  });
}
