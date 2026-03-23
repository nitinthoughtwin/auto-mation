import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

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

    // Verify channel belongs to user using raw query
    const channels = await db.$queryRaw<Array<{ id: string; userId: string }>>`
      SELECT id, userId FROM Channel WHERE id = ${channelId} AND userId = ${session.user.id}
    `;

    if (!channels || channels.length === 0) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    // Get library videos with category info
    const placeholders = videoIds.map(() => '?').join(',');
    const libraryVideos = await db.$queryRawUnsafe(
      `SELECT lv.*, vc.name as categoryName FROM library_videos lv 
       JOIN video_categories vc ON lv.categoryId = vc.id 
       WHERE lv.id IN (${placeholders})`,
      ...videoIds
    ) as Array<{
      id: string;
      categoryId: string;
      driveFileId: string;
      name: string;
      mimeType: string;
      size: number | null;
      thumbnailLink: string | null;
      webViewLink: string | null;
      downloadUrl: string | null;
      createdTime: string | null;
      addedToQueue: number;
      categoryName: string;
    }>;

    if (!libraryVideos || libraryVideos.length === 0) {
      return NextResponse.json({ error: 'No videos found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const createdVideos = [];

    for (const libVideo of libraryVideos) {
      const title = libVideo.name.replace(/\.[^/.]+$/, '');
      const videoId = randomUUID();

      await db.$executeRaw`
        INSERT INTO Video (id, channelId, title, description, tags, fileName, originalName, fileSize, mimeType, driveFileId, driveWebViewLink, status, createdAt, updatedAt)
        VALUES (${videoId}, ${channelId}, ${title}, ${'From: ' + libVideo.categoryName}, '', ${libVideo.downloadUrl || `https://drive.google.com/uc?export=download&id=${libVideo.driveFileId}`}, ${libVideo.name}, ${libVideo.size || null}, ${libVideo.mimeType || 'video/mp4'}, ${libVideo.driveFileId}, ${libVideo.webViewLink || null}, 'queued', ${now}, ${now})
      `;

      createdVideos.push({ id: videoId, title });

      // Mark library video as added to queue
      await db.$executeRaw`
        UPDATE library_videos SET addedToQueue = 1, updatedAt = ${now} WHERE id = ${libVideo.id}
      `;
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