import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPendingSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(PENDING_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'No pending session' }, { status: 404 });
  }

  const session = await getPendingSession(sessionId);
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
