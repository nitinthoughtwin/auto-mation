import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserPlanAndUsage, checkVideoLimit } from '@/lib/plan-limits';

// POST - Add library videos to user's channel queue
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, videoIds } = body;

    if (!channelId || !videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'Channel ID and video IDs are required' }, { status: 400 });
    }

    // Verify channel belongs to user
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id
      }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    // Enforce plan limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const videoCheck = checkVideoLimit(limits, usage, videoIds.length);
      if (!videoCheck.allowed) {
        return NextResponse.json({ error: videoCheck.message, limitExceeded: 'videos' }, { status: 403 });
      }
    } catch {
      // No subscription — allow with default behaviour
    }

    // Get library videos with category info
    const libraryVideos = await db.libraryVideo.findMany({
      where: {
        id: { in: videoIds }
      },
      include: {
        category: true
      }
    });

    if (libraryVideos.length === 0) {
      return NextResponse.json({ error: 'No videos found' }, { status: 404 });
    }

    const createdVideos: any[] = [];

    for (const libVideo of libraryVideos) {
      const title = libVideo.name.replace(/\.[^/.]+$/, '');

      const video = await db.video.create({
        data: {
          channelId,
          title,
          description: `From: ${libVideo.category.name}`,
          tags: '',
          fileName: libVideo.downloadUrl || `https://drive.google.com/uc?export=download&id=${libVideo.driveFileId}`,
          originalName: libVideo.name,
          fileSize: libVideo.size,
          mimeType: libVideo.mimeType,
          driveFileId: libVideo.driveFileId,
          driveWebViewLink: libVideo.webViewLink,
          status: 'queued'
        }
      });

      createdVideos.push(video);

      // Mark library video as added to queue
      await db.libraryVideo.update({
        where: { id: libVideo.id },
        data: { addedToQueue: true }
      });
    }

    return NextResponse.json({
      success: true,
      created: createdVideos.length,
      videos: createdVideos
    });
  } catch (error: any) {
    console.error('[Add to Queue] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}