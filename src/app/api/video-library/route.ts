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

    console.log('[Video Library] Fetching categories for user:', session.user.id);

    // Use raw query since Prisma client may not have the new models
    const categories = await db.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      driveUrl: string;
      folderId: string | null;
      isActive: number;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT * FROM video_categories WHERE isActive = 1 ORDER BY sortOrder ASC
    `;

    console.log('[Video Library] Found categories:', categories.length);

    // Get videos for each category
    const categoriesWithVideos = await Promise.all(
      categories.map(async (cat) => {
        const videos = await db.$queryRaw<Array<{
          id: string;
          categoryId: string;
          driveFileId: string;
          name: string;
          mimeType: string;
          size: number | null;
          thumbnailLink: string | null;
          webViewLink: string | null;
          downloadUrl: string | null;
          createdTime: Date | null;
          addedToQueue: number;
        }>>`
          SELECT * FROM library_videos WHERE categoryId = ${cat.id} ORDER BY createdTime DESC
        `;
        
        return {
          ...cat,
          isActive: cat.isActive === 1,
          videos: videos.map(v => ({
            ...v,
            addedToQueue: v.addedToQueue === 1
          }))
        };
      })
    );

    console.log('[Video Library] Categories with videos:', categoriesWithVideos.map(c => ({
      id: c.id,
      name: c.name,
      videoCount: c.videos?.length || 0
    })));

    return NextResponse.json({ categories: categoriesWithVideos });
  } catch (error: any) {
    console.error('[Video Library] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}