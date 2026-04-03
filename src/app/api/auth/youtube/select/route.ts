import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPendingSession, deletePendingSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';
import { db } from '@/lib/db';
import { getUserPlanAndUsage, checkChannelLimit } from '@/lib/plan-limits';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await request.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    // Read session ID from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(PENDING_SESSION_COOKIE)?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'No pending session. Please reconnect via OAuth.' }, { status: 400 });
    }

    const pendingSession = await getPendingSession(sessionId);
    if (!pendingSession) {
      return NextResponse.json({ error: 'Session expired. Please reconnect via OAuth.' }, { status: 401 });
    }

    // Validate selected channelId is in the session
    const channelInfo = pendingSession.channels.find(ch => ch.id === channelId);
    if (!channelInfo) {
      return NextResponse.json({ error: 'Invalid channel selection' }, { status: 400 });
    }

    // Check channel plan limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const channelCheck = checkChannelLimit(limits, usage);
      if (!channelCheck.allowed) {
        return NextResponse.json({ error: channelCheck.message, limitExceeded: 'channels' }, { status: 403 });
      }
    } catch {
      const existingCount = await db.channel.count({ where: { userId: session.user.id } });
      if (existingCount >= 1) {
        return NextResponse.json(
          { error: 'Free plan allows 1 channel. Upgrade to connect more.', limitExceeded: 'channels' },
          { status: 403 }
        );
      }
    }

    const { accessToken, refreshToken } = pendingSession;
    const userId = session.user.id;

    // Upsert channel
    const existingChannel = await db.channel.findUnique({
      where: { youtubeChannelId: channelInfo.id },
    });

    let resultChannel;
    if (existingChannel) {
      if (existingChannel.userId && existingChannel.userId !== userId) {
        return NextResponse.json(
          { error: 'This YouTube channel is already connected to another account' },
          { status: 409 }
        );
      }
      resultChannel = await db.channel.update({
        where: { id: existingChannel.id },
        data: {
          name: channelInfo.title,
          accessToken,
          refreshToken: refreshToken || existingChannel.refreshToken,
          userId,
          isActive: true,
        },
      });
    } else {
      resultChannel = await db.channel.create({
        data: {
          userId,
          name: channelInfo.title,
          youtubeChannelId: channelInfo.id,
          accessToken,
          refreshToken,
          uploadTime: '18:00',
          frequency: 'daily',
          isActive: true,
        },
      });
    }

    // Clean up Redis session
    await deletePendingSession(sessionId);

    const response = NextResponse.json({
      success: true,
      channelId: resultChannel.id,
      channelName: resultChannel.name,
    });
    response.cookies.set(PENDING_SESSION_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  } catch (error: any) {
    console.error('[YouTube Select] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect channel' },
      { status: 500 }
    );
  }
}
