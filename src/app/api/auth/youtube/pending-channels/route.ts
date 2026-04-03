import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PENDING_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No pending session' }, { status: 404 });
    }
    const session = verifySession(token);
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}
