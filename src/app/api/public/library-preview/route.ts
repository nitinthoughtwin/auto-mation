import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public endpoint — no auth required
// Returns a sample of library videos for the landing page
export async function GET() {
  try {
    const videos = await db.libraryVideo.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        thumbnailLink: true,
        durationMillis: true,
      },
    });

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}
