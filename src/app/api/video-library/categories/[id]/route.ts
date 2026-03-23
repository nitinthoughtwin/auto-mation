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

  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    return url;
  }

  return null;
}

// Fetch videos from a public Google Drive folder
async function fetchVideosFromDrive(folderId: string) {
  try {
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=100`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('[Drive API] Error fetching folder:', response.status);
      return [];
    }

    const data = await response.json();

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

    if (user?.role !== 'admin') {
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

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // If driveUrl changed, extract new folderId and sync videos
    if (driveUrl && driveUrl !== existingCategory.driveUrl) {
      const folderId = extractFolderId(driveUrl);
      if (!folderId) {
        return NextResponse.json({
          error: 'Invalid Google Drive URL'
        }, { status: 400 });
      }
      updateData.driveUrl = driveUrl;
      updateData.folderId = folderId;

      // Delete existing videos and fetch new ones
      await db.libraryVideo.deleteMany({
        where: { categoryId: id }
      });

      const videos = await fetchVideosFromDrive(folderId);

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

      await db.videoCategory.update({
        where: { id },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        videosFetched: videos.length
      });
    }

    // If just syncing without URL change
    if (sync && existingCategory.folderId) {
      const videos = await fetchVideosFromDrive(existingCategory.folderId);

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

      await db.videoCategory.update({
        where: { id },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        newVideosFetched: newVideos.length,
        totalVideos: videos.length
      });
    }

    // Just update category without syncing
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

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Delete all videos first (cascade should handle this but let's be explicit)
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