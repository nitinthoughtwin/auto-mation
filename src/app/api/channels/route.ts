import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getNextUploadTime } from '@/lib/utils-shared';

// GET - List all channels for current user
export async function GET(request: NextRequest) {
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
          where: { status: 'queued' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const channelsWithStats = channels.map(channel => ({
      ...channel,
      // Hide sensitive tokens in response
      accessToken: undefined,
      refreshToken: undefined,
      nextUploadTime: getNextUploadTime(channel),
      totalVideos: channel._count.videos,
      queuedVideos: channel.videos.length,
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

    // Check if user already has max channels (based on plan)
    const userChannels = await db.channel.count({
      where: { userId: session.user.id },
    });

    // TODO: Get max channels from user's subscription plan
    const maxChannels = 3; // Default limit

    if (userChannels >= maxChannels) {
      return NextResponse.json(
        { error: `Maximum ${maxChannels} channels allowed. Upgrade your plan for more.` },
        { status: 403 }
      );
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