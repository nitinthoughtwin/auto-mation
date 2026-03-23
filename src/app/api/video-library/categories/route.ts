import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to extract folder ID from Google Drive URL
function extractFolderId(url: string): string | null {
  // Handle various Google Drive URL formats:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  // https://drive.google.com/open?id=FOLDER_ID
  // https://drive.google.com/file/d/FILE_ID/view (for files)

  let match;

  // Format: /drive/folders/FOLDER_ID
  match = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Format: /folders/FOLDER_ID
  match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Format: open?id=FOLDER_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // If it's just a folder ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    return url;
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

    if (user?.role !== 'admin') {
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
    const videos = await fetchVideosFromDrive(folderId);

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

// Fetch videos from a public Google Drive folder
async function fetchVideosFromDrive(folderId: string) {
  try {
    // Use Google Drive API to list files in the folder
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=100`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('[Drive API] Error fetching folder:', response.status);
      return [];
    }

    const data = await response.json();

    // Filter video files and format
    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-matroska',
      'video/webm',
      'video/mpeg',
      'video/3gpp',
      'video/x-flv'
    ];

    const videos = (data.files || [])
      .filter((file: any) => videoMimeTypes.includes(file.mimeType) || file.mimeType?.startsWith('video/'))
      .map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : null,
        thumbnailLink: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=w200-h120-c`,
        webViewLink: file.webViewLink,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
        createdTime: file.createdTime
      }));

    return videos;
  } catch (error) {
    console.error('[Drive API] Error:', error);
    return [];
  }
}
