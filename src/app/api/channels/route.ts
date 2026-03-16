import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNextUploadTime } from '@/lib/utils-shared';
import { getCurrentUser } from '@/lib/auth-wrapper';

// GET - List all channels for current user
export async function GET() {
  try {
    const user = await getCurrentUser();

    // If no user, return empty (for backward compatibility)
    const whereClause = user?.id ? { userId: user.id } : {};

    const channels = await db.channel.findMany({
      where: whereClause,
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

// POST - Add a new channel
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, youtubeChannelId, accessToken, refreshToken, uploadTime, frequency, platform, instagramAccountId, facebookPageId, facebookPageName } = body;

    if (!name || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const channel = await db.channel.create({
      data: {
        userId: user?.id || null,
        name,
        platform: platform || 'youtube',
        youtubeChannelId,
        instagramAccountId,
        facebookPageId,
        facebookPageName,
        accessToken,
        refreshToken,
        uploadTime: uploadTime || '18:00',
        frequency: frequency || 'daily',
        isActive: true,
      },
    });

    return NextResponse.json({ channel });
  } catch (error: any) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    );
  }
}