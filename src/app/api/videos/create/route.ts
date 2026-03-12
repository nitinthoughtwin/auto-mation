import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create video record after Blob upload
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
      thumbnailOriginalName,
      thumbnailSize,
    } = body;

    if (!channelId || !blobUrl || !originalName) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, blobUrl, originalName' },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Generate title if not provided
    const fileExtension = originalName.includes('.') 
      ? '.' + originalName.split('.').pop() 
      : '';
    const videoTitle = title || originalName.replace(fileExtension, '');

    // Create video record in database
    const video = await db.video.create({
      data: {
        channelId,
        title: videoTitle,
        description: description || '',
        tags: tags || '',
        fileName: blobUrl, // Store the Blob URL
        originalName,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'video/mp4',
        thumbnailName: thumbnailUrl || null,
        thumbnailOriginalName: thumbnailOriginalName || null,
        thumbnailSize: thumbnailSize || null,
        status: 'queued',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Video record created successfully',
      video,
    });
  } catch (error: any) {
    console.error('Error creating video record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video record' },
      { status: 500 }
    );
  }
}