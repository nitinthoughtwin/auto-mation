import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getNextUploadTime } from '@/lib/utils-shared';

const prisma = new PrismaClient();

// GET - List all channels
export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
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

// POST - Add a new channel (usually done via OAuth, but this is for manual testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, youtubeChannelId, accessToken, refreshToken, uploadTime, frequency } = body;

    if (!name || !youtubeChannelId || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        youtubeChannelId,
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
