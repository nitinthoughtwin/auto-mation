import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public endpoint — no auth required
// Returns library categories with videos for the landing page
export async function GET() {
  try {
    const categories = await db.videoCategory.findMany({
      where: { isActive: true },
      include: {
        videos: {
          orderBy: { createdTime: 'desc' },
          take: 8,
          select: {
            id: true,
            driveFileId: true,
            durationMillis: true,
            name: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
