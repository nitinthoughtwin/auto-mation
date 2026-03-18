import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Map Google Drive videos to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      channelId, 
      videos, // Array of { driveFileId, name, size, mimeType, webViewLink, thumbnailLink }
      title, 
      description, 
      tags 
    } = body;

    if (!channelId || !videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: 'Channel ID and videos array required' }, { status: 400 });
    }

    // Get channel
    const channel = await db.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const addedVideos: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < videos.length; i++) {
      const driveVideo = videos[i];
      try {
        // Parse size as integer
        const videoSize = typeof driveVideo.size === 'string' 
          ? parseInt(driveVideo.size, 10) 
          : (driveVideo.size || 0);

        // Generate title - prefer per-video title, then custom title, then filename
        let videoTitle = driveVideo.name;
        if (driveVideo.title) {
          // Per-video AI generated title
          videoTitle = driveVideo.title;
        } else if (title) {
          // Global custom title with number
          videoTitle = videos.length > 1 ? `${title} (${i + 1})` : title;
        }

        // Check if already mapped
        const existing = await db.driveVideo.findUnique({
          where: { driveFileId: driveVideo.id }
        });

        if (existing) {
          // Update existing
          await db.driveVideo.update({
            where: { id: existing.id },
            data: {
              channelId: channelId,
              addedToQueue: true
            }
          });
          
          // Create video in queue
          const video = await db.video.create({
            data: {
              channelId: channelId,
              title: videoTitle,
              description: driveVideo.description || description || '',
              tags: driveVideo.tags || tags || '',
              fileName: driveVideo.id, // Store Drive file ID as fileName
              originalName: driveVideo.name,
              fileSize: videoSize,
              mimeType: driveVideo.mimeType,
              driveFileId: driveVideo.id, // Store Drive file ID for reference
              driveWebViewLink: driveVideo.webViewLink,
              thumbnailName: driveVideo.thumbnailLink || `https://drive.google.com/thumbnail?id=${driveVideo.id}`,
              status: 'queued'
            }
          });
          
          addedVideos.push(video);
          continue;
        }

        // Create new DriveVideo record
        const driveVideoRecord = await db.driveVideo.create({
          data: {
            userId: channel.userId || 'unknown',
            channelId: channelId,
            driveFileId: driveVideo.id,
            name: driveVideo.name,
            mimeType: driveVideo.mimeType,
            webViewLink: driveVideo.webViewLink,
            thumbnailLink: driveVideo.thumbnailLink,
            size: videoSize,
            addedToQueue: true
          }
        });

        // Create Video in queue
        const video = await db.video.create({
          data: {
            channelId: channelId,
            title: videoTitle,
            description: driveVideo.description || description || '',
            tags: driveVideo.tags || tags || '',
            fileName: driveVideo.id, // Store Drive file ID as fileName
            originalName: driveVideo.name,
            fileSize: videoSize,
            mimeType: driveVideo.mimeType,
            driveFileId: driveVideo.id, // Store Drive file ID for reference
            driveWebViewLink: driveVideo.webViewLink,
            thumbnailName: driveVideo.thumbnailLink || `https://drive.google.com/thumbnail?id=${driveVideo.id}`,
            status: 'queued'
          }
        });

        addedVideos.push(video);

      } catch (err: any) {
        console.error(`[Drive Map] Error mapping video ${driveVideo.name}:`, err);
        errors.push({ name: driveVideo.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      added: addedVideos.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
      videos: addedVideos
    });

  } catch (error: any) {
    console.error('[Drive Map] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get mapped Drive videos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const userId = searchParams.get('userId');

    const where: any = {};
    
    if (channelId) {
      where.channelId = channelId;
    }
    if (userId) {
      where.userId = userId;
    }

    const mappedVideos = await db.driveVideo.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ videos: mappedVideos });

  } catch (error: any) {
    console.error('[Drive Map] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete mapped Drive video
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await db.driveVideo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Drive Map] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
