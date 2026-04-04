import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Get single channel details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const channel = await db.channel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { videos: true },
        },
        videos: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            tags: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            driveFileId: true,
            driveWebViewLink: true,
            status: true,
            uploadedAt: true,
            error: true,
            thumbnailName: true,
            thumbnailOriginalName: true,
            thumbnailSize: true,
            thumbnailDriveId: true,
            channelId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check ownership
    if (channel.userId && channel.userId !== session.user.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ channel });
  } catch (error: any) {
    console.error('Error fetching channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel' },
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const channel = await db.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check ownership
    if (channel.userId && channel.userId !== session.user.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Delete the channel (this will cascade delete videos based on schema)
    await db.channel.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Channel disconnected successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect channel' },
      { status: 500 }
    );
  }
}

// PATCH - Update channel settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, uploadTime, frequency, isActive, randomDelayMinutes } = body;

    const channel = await db.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check ownership
    if (channel.userId && channel.userId !== session.user.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const updatedChannel = await db.channel.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(uploadTime && { uploadTime }),
        ...(frequency && { frequency }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...('randomDelayMinutes' in body && { randomDelayMinutes: randomDelayMinutes ?? null }),
      },
    });

    return NextResponse.json({ channel: updatedChannel });
  } catch (error: any) {
    console.error('Error updating channel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update channel' },
      { status: 500 }
    );
  }
}