import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to extract folder ID from Google Drive URL
function extractFolderId(url: string): string | null {
  let match;
  match = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

// Fetch videos from a public Google Drive folder using API key
async function fetchVideosFromDrive(folderId: string) {
  try {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) return { videos: [], error: 'GOOGLE_API_KEY_NOT_SET' };

    const videosUrl = new URL('https://www.googleapis.com/drive/v3/files');
    videosUrl.searchParams.set('q', `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`);
    videosUrl.searchParams.set('fields', 'files(id, name, mimeType, size, thumbnailLink, webViewLink, createdTime)');
    videosUrl.searchParams.set('orderBy', 'createdTime desc');
    videosUrl.searchParams.set('pageSize', '100');
    videosUrl.searchParams.set('key', apiKey);

    const response = await fetch(videosUrl.toString());
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 403) return { videos: [], error: 'FOLDER_NOT_PUBLIC' };
      if (response.status === 404) return { videos: [], error: 'FOLDER_NOT_FOUND' };
      return { videos: [], error: errorData.error?.message || 'API_ERROR' };
    }

    const data = await response.json();
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
    return { videos: [], error: 'NETWORK_ERROR' };
  }
}

// GET - Get single category with videos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const category = await db.videoCategory.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { createdTime: 'desc' }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('[Video Category] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, driveUrl, isActive, sortOrder, sync } = body;

    // Check if category exists
    const existingCategory = await db.videoCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // If driveUrl changed, extract new folderId and sync videos
    if (driveUrl && driveUrl !== existingCategory.driveUrl) {
      const folderId = extractFolderId(driveUrl);
      if (!folderId) {
        return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
      }

      // Delete existing videos
      await db.libraryVideo.deleteMany({
        where: { categoryId: id }
      });

      const result = await fetchVideosFromDrive(folderId);
      if (result.error) {
        const errorMessages: Record<string, string> = {
          'GOOGLE_API_KEY_NOT_SET': 'Google API Key not configured.',
          'FOLDER_NOT_PUBLIC': 'Cannot access folder.',
          'FOLDER_NOT_FOUND': 'Folder not found.',
          'API_ERROR': 'Drive API error.',
          'NETWORK_ERROR': 'Network error.'
        };
        return NextResponse.json({ error: errorMessages[result.error] || 'Failed' }, { status: 400 });
      }

      const videos = result.videos;

      // Save new videos
      if (videos.length > 0) {
        await db.libraryVideo.createMany({
          data: videos.map(v => ({
            categoryId: id,
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

      // Update category
      await db.videoCategory.update({
        where: { id },
        data: { driveUrl, folderId }
      });

      return NextResponse.json({ success: true, videosFetched: videos.length });
    }

    // If just syncing without URL change
    if (sync && existingCategory.folderId) {
      const result = await fetchVideosFromDrive(existingCategory.folderId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const videos = result.videos;

      // Get existing video IDs
      const existingVideos = await db.libraryVideo.findMany({
        where: { categoryId: id },
        select: { driveFileId: true }
      });
      const existingIds = new Set(existingVideos.map(v => v.driveFileId));

      // Add only new videos
      const newVideos = videos.filter(v => !existingIds.has(v.id));

      if (newVideos.length > 0) {
        await db.libraryVideo.createMany({
          data: newVideos.map(v => ({
            categoryId: id,
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
        newVideosFetched: newVideos.length,
        totalVideos: videos.length
      });
    }

    // Just update category fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updatedCategory = await db.videoCategory.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    console.error('[Video Category] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Import videos from an additional Drive folder into existing category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { importDriveUrl } = body;

    if (!importDriveUrl) {
      return NextResponse.json({ error: 'Drive URL is required' }, { status: 400 });
    }

    const category = await db.videoCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const folderId = extractFolderId(importDriveUrl);
    if (!folderId) {
      return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
    }

    const result = await fetchVideosFromDrive(folderId);
    if (result.error) {
      const errorMessages: Record<string, string> = {
        'GOOGLE_API_KEY_NOT_SET': 'GOOGLE_DRIVE_API_KEY is not configured.',
        'FOLDER_NOT_PUBLIC': 'Cannot access folder. Make sure it is shared as "Anyone with the link can view".',
        'FOLDER_NOT_FOUND': 'Folder not found. Please check the URL.',
        'API_ERROR': 'Google Drive API error.',
        'NETWORK_ERROR': 'Network error connecting to Google Drive.',
      };
      return NextResponse.json({ error: errorMessages[result.error] || result.error }, { status: 400 });
    }

    const videos = result.videos;
    if (videos.length === 0) {
      return NextResponse.json({ success: true, imported: 0, message: 'No videos found in this folder' });
    }

    // Upsert in batches of 5 to respect connection pool
    const BATCH_SIZE = 5;
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((v: any) =>
          db.libraryVideo.upsert({
            where: { driveFileId: v.id },
            create: {
              categoryId: id,
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
              categoryId: id,
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

    // Return actual saved count
    const categoryWithCount = await db.videoCategory.findUnique({
      where: { id },
      include: { _count: { select: { videos: true } } }
    });

    return NextResponse.json({
      success: true,
      imported: videos.length,
      totalVideos: categoryWithCount?._count.videos ?? 0,
    });
  } catch (error: any) {
    console.error('[Video Category PATCH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete category and all its videos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Delete videos first (cascade should handle this but let's be explicit)
    await db.libraryVideo.deleteMany({
      where: { categoryId: id }
    });

    // Delete category
    await db.videoCategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Video Category] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}