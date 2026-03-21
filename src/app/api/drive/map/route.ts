import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Map Google Drive videos to queue
export async function POST(request: NextRequest) {
  try {
    // Ensure db is available
    if (!db) {
      console.error('Database not initialized');
      return NextResponse.json({ 
        error: 'Database not initialized',
        details: 'Prisma client is undefined'
      }, { status: 500 });
    }

    const body = await request.json();
    const { channelId, videos } = body;

    console.log('Drive map request:', { channelId, videosCount: videos?.length });

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'No videos provided' }, { status: 400 });
    }

    // Verify channel exists
    let channel;
    try {
      channel = await db.channel.findUnique({
        where: { id: channelId }
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError.message 
      }, { status: 500 });
    }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found', channelId }, { status: 404 });
    }

    // Create video records
    const createdVideos = [];
    const errors = [];

    for (const video of videos) {
      try {
        console.log('Creating video:', video.name);
        
        const newVideo = await db.video.create({
          data: {
            channelId: channelId,
            title: video.title || video.name || 'Untitled',
            description: video.description || '',
            tags: video.tags || '',
            fileName: video.id, // Google Drive file ID
            originalName: video.name,
            fileSize: video.size ? parseInt(String(video.size)) : null,
            mimeType: video.mimeType || 'video/mp4',
            driveFileId: video.id, // Store Google Drive file ID
            driveWebViewLink: video.url || `https://drive.google.com/file/d/${video.id}/view`,
            thumbnailName: video.thumbnail || null,
            thumbnailDriveId: video.thumbnailId || null,
            status: 'queued'
          }
        });
        createdVideos.push(newVideo);
        console.log('Video created:', newVideo.id);
      } catch (createError: any) {
        console.error('Error creating video:', createError);
        errors.push({ name: video.name, error: createError.message });
      }
    }

    console.log('Drive map complete:', { created: createdVideos.length, errors: errors.length });

    return NextResponse.json({
      success: true,
      created: createdVideos.length,
      videos: createdVideos,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Drive map error:', error);
    return NextResponse.json({
      error: 'Failed to map videos',
      details: error.message || String(error)
    }, { status: 500 });
  }
}
