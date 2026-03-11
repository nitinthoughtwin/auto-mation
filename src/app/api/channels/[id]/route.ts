import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get single channel details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Get counts for different statuses
    const queuedCount = await prisma.video.count({
      where: { channelId: id, status: 'queued' },
    });
    const uploadedCount = await prisma.video.count({
      where: { channelId: id, status: 'uploaded' },
    });
    const failedCount = await prisma.video.count({
      where: { channelId: id, status: 'failed' },
    });

    return NextResponse.json({ 
      channel: {
        ...channel,
        stats: {
          total: channel._count.videos,
          queued: queuedCount,
          uploaded: uploadedCount,
          failed: failedCount,
        },
      }
    });
  } catch (error: any) {
    console.error('Error fetching channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel' },
      { status: 500 }
    );
  }
}

// PUT - Update channel settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { uploadTime, frequency, isActive } = body;

    const updateData: Record<string, unknown> = {};
    
    if (uploadTime !== undefined) {
      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(uploadTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:mm format.' },
          { status: 400 }
        );
      }
      updateData.uploadTime = uploadTime;
    }
    
    if (frequency !== undefined) {
      if (!['daily', 'alternate'].includes(frequency)) {
        return NextResponse.json(
          { error: 'Invalid frequency. Use "daily" or "alternate".' },
          { status: 400 }
        );
      }
      updateData.frequency = frequency;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const channel = await prisma.channel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ channel });
  } catch (error: any) {
    console.error('Error updating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update channel' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete all videos associated with this channel first
    await prisma.video.deleteMany({
      where: { channelId: id },
    });

    // Delete the channel
    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Channel disconnected' });
  } catch (error: any) {
    console.error('Error deleting channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete channel' },
      { status: 500 }
    );
  }
}
