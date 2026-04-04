import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - List all active categories with videos (for users)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get IDs of library videos already added to this user's channels
    const userVideos = await db.video.findMany({
      where: {
        channel: { userId: session.user.id },
        driveFileId: { not: null },
      },
      select: { driveFileId: true },
    });
    const addedDriveIds = new Set(userVideos.map((v) => v.driveFileId).filter(Boolean));

    const categories = await db.videoCategory.findMany({
      where: { isActive: true },
      include: {
        videos: {
          orderBy: { createdTime: 'desc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Mark addedToQueue per-user instead of global flag
    const categoriesWithUserStatus = categories.map((cat) => ({
      ...cat,
      videos: cat.videos.map((v) => ({
        ...v,
        addedToQueue: addedDriveIds.has(v.driveFileId),
      })),
    }));

    return NextResponse.json({ categories: categoriesWithUserStatus });
  } catch (error: any) {
    console.error('[Video Library] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
