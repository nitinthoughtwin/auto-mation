import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const GOOGLE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const BATCH_SIZE = 10; // process 10 videos at a time

async function fetchDurationFromDrive(driveFileId: string): Promise<number | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=videoMediaMetadata&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ms = data?.videoMediaMetadata?.durationMillis;
    return ms ? parseInt(ms) : null;
  } catch {
    return null;
  }
}

// POST - Fetch and update durations for all videos that don't have it yet
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all videos where durationMillis is not yet set
    const videos = await db.libraryVideo.findMany({
      where: { durationMillis: null },
      select: { id: true, driveFileId: true, name: true },
    });

    if (videos.length === 0) {
      return NextResponse.json({ success: true, message: 'All videos already have duration data', updated: 0 });
    }

    let updated = 0;
    let failed = 0;

    // Process in batches to avoid rate limiting
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (video) => {
          const durationMillis = await fetchDurationFromDrive(video.driveFileId);
          if (durationMillis !== null) {
            await db.libraryVideo.update({
              where: { id: video.id },
              data: { durationMillis },
            });
            updated++;
          } else {
            failed++;
          }
        })
      );

      // Small delay between batches to avoid hitting API rate limits
      if (i + BATCH_SIZE < videos.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return NextResponse.json({
      success: true,
      total: videos.length,
      updated,
      failed,
      message: `Updated ${updated} videos. ${failed} could not be fetched (private or deleted).`,
    });
  } catch (error: any) {
    console.error('[Fetch Durations] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check how many videos still need duration fetched
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [total, pending] = await Promise.all([
      db.libraryVideo.count(),
      db.libraryVideo.count({ where: { durationMillis: null } }),
    ]);

    return NextResponse.json({ total, pending, done: total - pending });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
