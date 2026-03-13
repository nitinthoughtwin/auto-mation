import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import path from 'path';

// POST - Create video record after file upload
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
      thumbnailSize
    } = body;

    console.log('=== Creating Video Record ===');
    console.log('Channel ID:', channelId);
    console.log('Blob URL:', blobUrl);
    console.log('Original Name:', originalName);
    console.log('Title:', title);
    console.log('Thumbnail URL:', thumbnailUrl);

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    if (!blobUrl) {
      return NextResponse.json(
        { error: 'Blob URL is required' },
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

    // Extract filename from blobUrl
    // blobUrl format: /uploads/videos/1234567890-filename.mp4
    const fileName = path.basename(blobUrl);
    
    // Extract thumbnail filename if provided
    let thumbnailName: string | null = null;
    if (thumbnailUrl) {
      thumbnailName = path.basename(thumbnailUrl);
    }

    // Create video record in database
    const video = await db.video.create({
      data: {
        channelId,
        title: title || originalName || 'Untitled',
        description: description || '',
        tags: tags || '',
        fileName,
        originalName,
        fileSize,
        mimeType,
        thumbnailName,
        thumbnailOriginalName,
        thumbnailSize,
        status: 'queued',
      },
    });

    console.log('=== Video Created ===');
    console.log('Video ID:', video.id);

    return NextResponse.json({ 
      success: true,
      video 
    });
  } catch (error: any) {
    console.error('Error creating video record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video record' },
      { status: 500 }
    );
  }
}