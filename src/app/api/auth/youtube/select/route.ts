import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifySession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';
import { db } from '@/lib/db';
import { getUserPlanAndUsage, checkChannelLimit } from '@/lib/plan-limits';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const channelId: string = body?.channelId;
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    // Verify pending session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(PENDING_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No pending session. Please reconnect via OAuth.' }, { status: 400 });
    }
    const pending = verifySession(token);
    if (!pending) {
      return NextResponse.json({ error: 'Session expired. Please reconnect via OAuth.' }, { status: 401 });
    }

    const channelInfo = pending.channels.find(ch => ch.id === channelId);
    if (!channelInfo) {
      return NextResponse.json({ error: 'Invalid channel selection' }, { status: 400 });
    }

    // Check plan channel limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const check = checkChannelLimit(limits, usage);
      if (!check.allowed) {
        return NextResponse.json({ error: check.message, limitExceeded: 'channels' }, { status: 403 });
      }
    } catch {
      const count = await db.channel.count({ where: { userId: session.user.id } });
      if (count >= 1) {
        return NextResponse.json(
          { error: 'Free plan allows 1 channel. Upgrade to connect more.', limitExceeded: 'channels' },
          { status: 403 }
        );
      }
    }

    const { accessToken, refreshToken, googleAccountId } = pending;
    const userId = session.user.id;

    // Upsert channel
    const existing = await db.channel.findUnique({ where: { youtubeChannelId: channelInfo.id } });

    let result;
    if (existing) {
      if (existing.userId && existing.userId !== userId) {
        return NextResponse.json(
          { error: 'This YouTube channel is already connected to another account' },
          { status: 409 }
        );
      }
      result = await db.channel.update({
        where: { id: existing.id },
        data: {
          name: channelInfo.title,
          accessToken,
          refreshToken: refreshToken || existing.refreshToken,
          googleAccountId: googleAccountId || existing.googleAccountId,
          userId,
          isActive: true,
        },
      });
    } else {
      result = await db.channel.create({
        data: {
          userId,
          name: channelInfo.title,
          youtubeChannelId: channelInfo.id,
          googleAccountId,
          accessToken,
          refreshToken,
          uploadTime: '18:00',
          frequency: 'daily',
          isActive: true,
        },
      });
    }

    // Sync tokens to all other channels from the same Google account
    if (googleAccountId && refreshToken) {
      await db.channel.updateMany({
        where: {
          googleAccountId,
          id: { not: result.id },
        },
        data: { accessToken, refreshToken },
      });
    }

    // Clear cookie
    const response = NextResponse.json({
      success: true,
      channelId: result.id,
      channelName: result.name,
    });
    response.cookies.set(PENDING_SESSION_COOKIE, '', { maxAge: 0, path: '/' });
    return response;

  } catch (e: any) {
    console.error('[YT Select] Error:', e);
    return NextResponse.json({ error: e.message || 'Failed to connect channel' }, { status: 500 });
  }
}
