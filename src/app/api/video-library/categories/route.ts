import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchAllVideosFromDriveFolder } from '@/lib/drive';

// Helper to extract folder ID from any Google Drive URL format
// Handles desktop, mobile, shared, and tracking-param URLs
function extractFolderId(url: string): string | null {
  // Strip tracking params first, work with the clean path
  let cleanUrl = url;
  try {
    const parsed = new URL(url);
    cleanUrl = parsed.origin + parsed.pathname;
  } catch {}

  let match;
  // /drive/mobile/folders/ID or /drive/folders/ID
  match = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (match) return match[1];
  // ?id=ID or &id=ID (older share links)
  match = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (match) return match[1];
  // Raw folder ID pasted directly
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
    return url.trim();
  }
  return null;
}

// GET - List all categories with video counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await db.videoCategory.findMany({
      include: {
        _count: {
          select: { videos: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json({
      categories: categories.map(cat => ({
        ...cat,
        videoCount: cat._count.videos
      }))
    });
  } catch (error: any) {
    console.error('[Video Categories] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, driveUrl, sortOrder } = body;

    if (!name || !driveUrl) {
      return NextResponse.json({ error: 'Name and Drive URL are required' }, { status: 400 });
    }

    // Extract folder ID from URL
    const folderId = extractFolderId(driveUrl);

    if (!folderId) {
      return NextResponse.json({
        error: 'Invalid Google Drive URL. Please provide a valid folder link.'
      }, { status: 400 });
    }

    // Create category — or reuse existing if a previous attempt partially succeeded
    let category = await db.videoCategory.findFirst({ where: { name } });
    if (!category) {
      category = await db.videoCategory.create({
        data: {
          name,
          description,
          driveUrl,
          folderId,
          sortOrder: sortOrder || 0
        }
      });
    } else {
      // Update fields in case they changed
      category = await db.videoCategory.update({
        where: { id: category.id },
        data: { description, driveUrl, folderId, sortOrder: sortOrder || category.sortOrder }
      });
    }

    // Fetch videos from the drive folder (recursively traverses subfolders)
    const result = await fetchAllVideosFromDriveFolder(folderId);

    // Check for errors
    if (result.error) {
      const errorMessages: Record<string, string> = {
        'GOOGLE_API_KEY_NOT_SET': 'GOOGLE_DRIVE_API_KEY is not set in environment variables.',
        'FOLDER_NOT_PUBLIC': 'Cannot access folder. Make sure it is shared as "Anyone with the link can view" in Google Drive.',
        'FOLDER_NOT_FOUND': 'Folder not found. Please check the URL.',
        'API_ERROR': 'Google Drive API error. Please try again.',
        'NETWORK_ERROR': 'Network error connecting to Google Drive.',
      };

      return NextResponse.json({
        error: errorMessages[result.error] || result.error || 'Failed to fetch videos from folder'
      }, { status: 400 });
    }

    const videos = result.videos;

    // Save videos sequentially in batches to avoid connection pool exhaustion
    type DriveVideo = { id: string; name: string; mimeType: string; size: number | null; thumbnailLink: string; webViewLink: string; downloadUrl: string; createdTime: string | null };
    const BATCH_SIZE = 5;
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = (videos as DriveVideo[]).slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((v) =>
          db.libraryVideo.upsert({
            where: { driveFileId: v.id },
            create: {
              categoryId: category!.id,
              driveFileId: v.id,
              name: v.name,
              mimeType: v.mimeType,
              size: v.size,
              thumbnailLink: v.thumbnailLink,
              webViewLink: v.webViewLink,
              downloadUrl: v.downloadUrl,
              createdTime: v.createdTime ? new Date(v.createdTime) : null,
            },
            update: {
              categoryId: category!.id,
              name: v.name,
              mimeType: v.mimeType,
              size: v.size,
              thumbnailLink: v.thumbnailLink,
              webViewLink: v.webViewLink,
              downloadUrl: v.downloadUrl,
            },
          })
        )
      );
    }

    // Re-fetch category with actual saved count
    const categoryWithCount = await db.videoCategory.findUnique({
      where: { id: category.id },
      include: { _count: { select: { videos: true } } }
    });

    const savedCount = categoryWithCount?._count.videos ?? 0;

    return NextResponse.json({
      success: true,
      category: { ...categoryWithCount, videoCount: savedCount },
      videosFetched: videos.length,
      videosSaved: savedCount,
    });
  } catch (error: any) {
    console.error('[Video Categories] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

