import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFile } from '@/lib/storage/index';

// GET - Get single video details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await db.video.findUnique({
      where: { id },
      include: { channel: true },
    });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ video });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch video' }, { status: 500 });
  }
}

// PUT - Update video title/description/tags
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, tags } = body;
    const video = await db.video.update({
      where: { id },
      data: { title, description, tags },
    });
    return NextResponse.json({ video });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update video' }, { status: 500 });
  }
}

// PATCH - Update thumbnail info after separate thumbnail upload
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { thumbnailName, thumbnailOriginalName, thumbnailSize } = body;
    const video = await db.video.update({
      where: { id },
      data: {
        thumbnailName: thumbnailName ?? undefined,
        thumbnailOriginalName: thumbnailOriginalName ?? undefined,
        thumbnailSize: thumbnailSize ?? undefined,
      },
    });
    return NextResponse.json({ video });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update thumbnail' }, { status: 500 });
  }
}

// DELETE - Delete video from queue and storage (R2 / Blob / Drive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
      include: { channel: true },
    });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const driveConfig = video.channel
      ? { accessToken: video.channel.accessToken, refreshToken: video.channel.refreshToken }
      : undefined;

    // Delete video file from storage
    if (video.fileName) {
      try {
        await deleteFile(video.fileName, driveConfig);
        console.log('[Delete] File deleted from storage:', video.fileName);
      } catch (e) {
        console.warn('[Delete] Storage delete failed (non-critical):', e);
      }
    }

    // Delete thumbnail from storage
    if (video.thumbnailName) {
      try {
        await deleteFile(video.thumbnailName, driveConfig);
      } catch (e) {
        console.warn('[Delete] Thumbnail delete failed (non-critical):', e);
      }
    }

    await db.video.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Video deleted' });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete video' }, { status: 500 });
  }
}
