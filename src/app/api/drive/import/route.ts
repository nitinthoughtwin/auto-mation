import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Import/map existing Google Drive video to upload queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      channelId,
      driveFileId,
      fileName,
      fileSize,
      title,
      description,
      tags,
      thumbnailDriveId,
      platform = 'youtube',
    } = body;

    if (!channelId || !driveFileId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Channel ID, Drive File ID, and filename are required' },
        { status: 400 }
      );
    }

    // Check if video already exists in queue
    const existingVideo = await db.video.findUnique({
      where: { googleDriveFileId: driveFileId },
    });

    if (existingVideo) {
      return NextResponse.json(
        { success: false, error: 'This video is already in the upload queue' },
        { status: 400 }
      );
    }

    // Get file info from Drive if not provided
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Create video entry with Drive file reference
    const video = await db.video.create({
      data: {
        channelId,
        title: title || fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        description: description || '',
        tags: tags || '',
        fileName: fileName,
        originalName: fileName,
        fileSize: fileSize || 0,
        mimeType: 'video/mp4', // Default
        googleDriveFileId: driveFileId,
        googleDriveUrl: `https://drive.google.com/uc?export=download&id=${driveFileId}`,
        thumbnailName: thumbnailDriveId || null,
        status: 'queued',
        platform,
      },
    });

    console.log('Video imported from Drive:', video.id);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        fileName: video.fileName,
        status: video.status,
        googleDriveFileId: video.googleDriveFileId,
      },
    });

  } catch (error: any) {
    console.error('Drive import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import video' },
      { status: 500 }
    );
  }
}

// Bulk import multiple videos
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videos } = body;

    if (!channelId || !videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { success: false, error: 'Channel ID and videos array are required' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      videos: [] as any[],
    };

    for (const video of videos) {
      try {
        // Check if already exists
        const existing = await db.video.findUnique({
          where: { googleDriveFileId: video.driveFileId },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const newVideo = await db.video.create({
          data: {
            channelId,
            title: video.title || video.fileName.replace(/\.[^/.]+$/, ''),
            description: video.description || '',
            tags: video.tags || '',
            fileName: video.fileName,
            originalName: video.fileName,
            fileSize: video.fileSize || 0,
            mimeType: 'video/mp4',
            googleDriveFileId: video.driveFileId,
            googleDriveUrl: `https://drive.google.com/uc?export=download&id=${video.driveFileId}`,
            status: 'queued',
            platform: video.platform || 'youtube',
          },
        });

        results.success++;
        results.videos.push({
          id: newVideo.id,
          title: newVideo.title,
        });
      } catch (e) {
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import videos' },
      { status: 500 }
    );
  }
}