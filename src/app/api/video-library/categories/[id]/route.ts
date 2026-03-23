import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

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

    const categories = await db.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      driveUrl: string;
      folderId: string | null;
      isActive: number;
      sortOrder: number;
    }>>`SELECT * FROM video_categories WHERE id = ${id}`;

    if (!categories || categories.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = categories[0];

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
      createdTime: string | null;
      addedToQueue: number;
    }>>`SELECT * FROM library_videos WHERE categoryId = ${id} ORDER BY createdTime DESC`;

    return NextResponse.json({
      category: {
        ...category,
        isActive: category.isActive === 1,
        videos: videos.map(v => ({ ...v, addedToQueue: v.addedToQueue === 1 }))
      }
    });
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

    const userResult = await db.$queryRaw<Array<{ role: string }>>`
      SELECT role FROM User WHERE id = ${session.user.id}
    `;
    if (!userResult[0] || userResult[0].role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, driveUrl, isActive, sortOrder, sync } = body;

    // Check if category exists
    const existing = await db.$queryRaw<Array<{
      id: string;
      driveUrl: string;
      folderId: string | null;
    }>>`SELECT id, driveUrl, folderId FROM video_categories WHERE id = ${id}`;

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const existingCategory = existing[0];
    const now = new Date().toISOString();

    // If driveUrl changed, extract new folderId and sync videos
    if (driveUrl && driveUrl !== existingCategory.driveUrl) {
      const folderId = extractFolderId(driveUrl);
      if (!folderId) {
        return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
      }

      await db.$executeRaw`DELETE FROM library_videos WHERE categoryId = ${id}`;
      
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
      for (const v of videos) {
        const videoId = randomUUID();
        await db.$executeRaw`
          INSERT OR IGNORE INTO library_videos (id, categoryId, driveFileId, name, mimeType, size, thumbnailLink, webViewLink, downloadUrl, createdTime, addedToQueue, createdAt, updatedAt)
          VALUES (${videoId}, ${id}, ${v.id}, ${v.name}, ${v.mimeType}, ${v.size || null}, ${v.thumbnailLink || null}, ${v.webViewLink || null}, ${v.downloadUrl || null}, ${v.createdTime ? new Date(v.createdTime).toISOString() : null}, 0, ${now}, ${now})
        `;
      }

      await db.$executeRaw`
        UPDATE video_categories SET driveUrl = ${driveUrl}, folderId = ${folderId}, updatedAt = ${now} WHERE id = ${id}
      `;

      return NextResponse.json({ success: true, videosFetched: videos.length });
    }

    // If just syncing without URL change
    if (sync && existingCategory.folderId) {
      const result = await fetchVideosFromDrive(existingCategory.folderId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const videos = result.videos;
      const existingVideos = await db.$queryRaw<Array<{ driveFileId: string }>>`
        SELECT driveFileId FROM library_videos WHERE categoryId = ${id}
      `;
      const existingIds = new Set(existingVideos.map(v => v.driveFileId));
      const newVideos = videos.filter(v => !existingIds.has(v.id));

      for (const v of newVideos) {
        const videoId = randomUUID();
        await db.$executeRaw`
          INSERT OR IGNORE INTO library_videos (id, categoryId, driveFileId, name, mimeType, size, thumbnailLink, webViewLink, downloadUrl, createdTime, addedToQueue, createdAt, updatedAt)
          VALUES (${videoId}, ${id}, ${v.id}, ${v.name}, ${v.mimeType}, ${v.size || null}, ${v.thumbnailLink || null}, ${v.webViewLink || null}, ${v.downloadUrl || null}, ${v.createdTime ? new Date(v.createdTime).toISOString() : null}, 0, ${now}, ${now})
        `;
      }

      return NextResponse.json({ success: true, newVideosFetched: newVideos.length, totalVideos: videos.length });
    }

    // Just update category fields
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive ? 1 : 0); }
    if (sortOrder !== undefined) { updates.push('sortOrder = ?'); values.push(sortOrder); }
    
    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);
      
      await db.$executeRawUnsafe(
        `UPDATE video_categories SET ${updates.join(', ')} WHERE id = ?`,
        ...values
      );
    }

    return NextResponse.json({ success: true });
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

    const userResult = await db.$queryRaw<Array<{ role: string }>>`
      SELECT role FROM User WHERE id = ${session.user.id}
    `;
    if (!userResult[0] || userResult[0].role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    await db.$executeRaw`DELETE FROM library_videos WHERE categoryId = ${id}`;
    await db.$executeRaw`DELETE FROM video_categories WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Video Category] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}