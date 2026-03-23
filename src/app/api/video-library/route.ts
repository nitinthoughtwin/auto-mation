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

    const categories = await db.videoCategory.findMany({
      where: { isActive: true },
      include: {
        videos: {
          orderBy: { createdTime: 'desc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('[Video Library] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
