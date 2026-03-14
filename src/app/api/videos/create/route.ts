import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create video record after file upload to Google Drive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      channelId, 
      blobUrl,
      fileId, // Google Drive file ID
      originalName, 
      fileSize, 
      mimeType, 
      title, 
      description, 
      tags,
      thumbnailUrl,
      thumbnailFileId,
      thumbnailOriginalName,
      thumbnailSize
    } = body;

    console.log('=== Creating Video Record ===');
    console.log('Channel ID:', channelId);
    console.log('File ID:', fileId);
    console.log('Title:', title);

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Create video record - store Google Drive file ID in fileName field
    const video = await db.video.create({
      data: {
        channelId,
        title: title || originalName || 'Untitled',
        description: description || '',
        tags: tags || '',
        fileName: fileId, // Google Drive file ID
        originalName,
        fileSize,
        mimeType,
        thumbnailName: thumbnailFileId || thumbnailUrl, // Store thumbnail file ID
        thumbnailOriginalName,
        thumbnailSize,
        status: 'queued',
      },
    });

    console.log('Video created:', video.id);

    return NextResponse.json({ 
      success: true,
      video 
    });
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video' },
      { status: 500 }
    );
  }
}