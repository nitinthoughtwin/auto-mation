import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getNextUploadTime } from '@/lib/utils-shared';
import { getUserPlanAndUsage, checkChannelLimit, checkVideoLimit } from '@/lib/plan-limits';

// GET - List all channels for current user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Channels API] User ID:', session.user.id);

    const channels = await db.channel.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        _count: {
          select: { videos: true },
        },
        videos: {
          where: { status: { in: ['queued', 'scanning', 'copyright_skipped'] } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Include plan limit info so dashboard can show blocked state immediately
    let planLimitReached = false;
    let videosThisMonth = 0;
    let maxVideosPerMonth = 0;
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const check = checkVideoLimit(limits, usage);
      planLimitReached = !check.allowed;
      videosThisMonth = usage.videosThisMonth;
      maxVideosPerMonth = limits.maxVideosPerMonth;
    } catch { /* no subscription — treat as limit reached */ planLimitReached = true; }

    const channelsWithStats = channels.map(channel => ({
      ...channel,
      // Hide sensitive tokens in response
      accessToken: undefined,
      refreshToken: undefined,
      nextUploadTime: getNextUploadTime(channel),
      totalVideos: channel._count.videos,
      queuedVideos: channel.videos.length,
      planLimitReached,
      videosThisMonth,
      maxVideosPerMonth,
    }));

    return NextResponse.json({ channels: channelsWithStats });
  } catch (error: any) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST - Add a new channel (manual, usually done via OAuth)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, youtubeChannelId, accessToken, refreshToken, uploadTime, frequency } = body;

    if (!name || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check channel limit against user's plan
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const channelCheck = checkChannelLimit(limits, usage);
      if (!channelCheck.allowed) {
        return NextResponse.json({ error: channelCheck.message, limitExceeded: 'channels' }, { status: 403 });
      }
    } catch {
      // Fallback: hardcoded free limit if no subscription found
      const userChannels = await db.channel.count({ where: { userId: session.user.id } });
      if (userChannels >= 1) {
        return NextResponse.json(
          { error: 'Channel limit reached. Upgrade your plan to connect more channels.' },
          { status: 403 }
        );
      }
    }

    const channel = await db.channel.create({
      data: {
        userId: session.user.id,
        name,
        youtubeChannelId: youtubeChannelId || `local_${Date.now()}`,
        accessToken,
        refreshToken,
        uploadTime: uploadTime || '18:00',
        frequency: frequency || 'daily',
        isActive: true,
      },
    });

    // Return without sensitive tokens
    const { accessToken: _, refreshToken: __, ...safeChannel } = channel;

    return NextResponse.json({ channel: safeChannel });
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    );
  }
}