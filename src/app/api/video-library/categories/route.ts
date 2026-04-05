import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Create category
    const category = await db.videoCategory.create({
      data: {
        name,
        description,
        driveUrl,
        folderId,
        sortOrder: sortOrder || 0
      }
    });

    // Fetch videos from the drive folder
    const result = await fetchVideosFromDrive(folderId);
    
    // Check for errors
    if (result.error) {
      // Delete the category if we can't fetch videos
      await db.videoCategory.delete({ where: { id: category.id } });
      
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

    // Save videos to database
    if (videos.length > 0) {
      await db.libraryVideo.createMany({
        data: videos.map(v => ({
          categoryId: category.id,
          driveFileId: v.id,
          name: v.name,
          mimeType: v.mimeType,
          size: v.size,
          thumbnailLink: v.thumbnailLink,
          webViewLink: v.webViewLink,
          downloadUrl: v.downloadUrl,
          createdTime: v.createdTime ? new Date(v.createdTime) : null
        })),
        skipDuplicates: true
      });
    }

    return NextResponse.json({
      success: true,
      category,
      videosFetched: videos.length
    });
  } catch (error: any) {
    console.error('[Video Categories] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fetch videos from a public Google Drive folder using API key
async function fetchVideosFromDrive(folderId: string) {
  try {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    
    if (!apiKey) {
      console.error('[Drive API] GOOGLE_API_KEY not set in environment');
      return { videos: [], error: 'GOOGLE_API_KEY_NOT_SET' };
    }

    const videosUrl = new URL('https://www.googleapis.com/drive/v3/files');
    videosUrl.searchParams.set('q', `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`);
    videosUrl.searchParams.set('fields', 'files(id, name, mimeType, size, thumbnailLink, webViewLink, createdTime)');
    videosUrl.searchParams.set('orderBy', 'createdTime desc');
    videosUrl.searchParams.set('pageSize', '100');
    videosUrl.searchParams.set('key', apiKey);

    console.log('[Drive API] Fetching videos from folder:', folderId);

    const response = await fetch(videosUrl.toString(), {
      headers: {
        'Referer': process.env.NEXTAUTH_URL || 'https://gpmart.in',
        'Origin': process.env.NEXTAUTH_URL || 'https://gpmart.in',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Drive API] Error response:', JSON.stringify(errorData));
      console.error('[Drive API] Status:', response.status, '| Folder:', folderId);
      console.error('[Drive API] API key prefix:', apiKey.substring(0, 8));

      if (response.status === 400) {
        return { videos: [], error: 'FOLDER_NOT_PUBLIC' };
      }
      if (response.status === 403) {
        const reason = errorData?.error?.errors?.[0]?.reason;
        if (reason === 'keyInvalid') return { videos: [], error: 'API key is invalid or not enabled for Drive API' };
        if (reason === 'accessNotConfigured') return { videos: [], error: 'Google Drive API is not enabled in Cloud Console' };
        return { videos: [], error: 'FOLDER_NOT_PUBLIC' };
      }
      if (response.status === 404) {
        return { videos: [], error: 'FOLDER_NOT_FOUND' };
      }
      return { videos: [], error: errorData.error?.message || 'API_ERROR' };
    }

    const data = await response.json();
    console.log('[Drive API] Found', data.files?.length || 0, 'files');

    const videos = (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size) : null,
      thumbnailLink: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=w200-h120-c`,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
      createdTime: file.createdTime
    }));

    return { videos, error: null };
  } catch (error) {
    console.error('[Drive API] Error:', error);
    return { videos: [], error: 'NETWORK_ERROR' };
  }
}