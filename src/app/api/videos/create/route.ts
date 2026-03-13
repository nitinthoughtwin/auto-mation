import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Create video record after upload to Blob/Drive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      channelId,
      blobUrl,
      originalName,
      fileSize,
      mimeType,
      title,
      description,
      tags,
      thumbnailUrl,
    } = body;

    if (!channelId || !blobUrl) {
      return NextResponse.json({ error: 'channelId and blobUrl are required' }, { status: 400 });
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Create video record
    const video = await db.video.create({
      data: {
        channelId,
        title: title || originalName || 'Untitled Video',
        description: description || '',
        tags: tags || '',
        fileName: blobUrl, // Store the Blob/Drive URL
        originalName: originalName || 'video.mp4',
        fileSize: fileSize || 0,
        mimeType: mimeType || 'video/mp4',
        thumbnailUrl: thumbnailUrl || null,
        status: 'queued',
      },
    });

    return NextResponse.json({
      success: true,
      video,
    });

  } catch (error: any) {
    console.error('Video create error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create video record'
    }, { status: 500 });
  }
}