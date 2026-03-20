import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractFileIdFromUrl } from '@/lib/google-drive';

// Update video details (title, description, tags, thumbnail)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, description, tags, thumbnailUrl, fileId } = body;

    console.log('Update video request:', { videoId, title, description, tags, thumbnailUrl, fileId });

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Check if video exists
    const existingVideo = await db.video.findUnique({
      where: { id: videoId },
    });

    console.log('Existing video:', existingVideo?.id, existingVideo?.title);

    if (!existingVideo) {
      // List all videos to help debug
      const allVideos = await db.video.findMany({
        select: { id: true, title: true },
        take: 10,
      });
      
      return NextResponse.json({ 
        error: 'Video not found',
        videoId,
        hint: 'The video may have been deleted or the ID is incorrect',
        availableVideos: allVideos,
      }, { status: 404 });
    }

    // Only allow editing queued videos
    if (existingVideo.status !== 'queued') {
      return NextResponse.json({ 
        error: 'Only queued videos can be edited',
        currentStatus: existingVideo.status
      }, { status: 400 });
    }

    // Update video - only update fields that are provided
    const updateData: Record<string, any> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    
    // Handle thumbnail - store the Google Drive file ID in thumbnailDriveId
    if (thumbnailUrl !== undefined && thumbnailUrl !== '') {
      const thumbFileId = extractFileIdFromUrl(thumbnailUrl) || thumbnailUrl;
      updateData.thumbnailName = thumbnailUrl;
      updateData.thumbnailDriveId = thumbFileId;
    }
    
    // If fileId is provided directly
    if (fileId !== undefined) {
      updateData.thumbnailName = fileId;
      updateData.thumbnailDriveId = fileId;
    }

    console.log('Update data:', updateData);

    const updatedVideo = await db.video.update({
      where: { id: videoId },
      data: updateData,
    });

    console.log('Updated video:', updatedVideo.id);

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });

  } catch (error: any) {
    console.error('Video update error:', error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2025') {
      return NextResponse.json({
        error: 'Video not found in database',
        details: error.message
      }, { status: 404 });
    }
    
    return NextResponse.json({
      error: error.message || 'Failed to update video',
      code: error.code,
    }, { status: 500 });
  }
}