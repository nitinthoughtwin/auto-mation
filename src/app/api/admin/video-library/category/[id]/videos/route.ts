import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to extract folder ID from Google Drive URL
function extractFolderId(url: string): string | null {
  const match1 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const match3 = url.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
  return match1?.[1] || match2?.[1] || match3?.[1] || null;
}

// GET - Fetch videos from a category's Google Drive folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the category
    const category = await db.videoLibraryCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (!category.isActive) {
      return NextResponse.json({ error: 'Category is not active' }, { status: 400 });
    }

    // Check if category has a drive folder
    if (!category.driveFolderUrl && !category.driveFolderId) {
      // Return static items if no drive folder
      const items = await db.videoLibraryItem.findMany({
        where: { 
          categoryId: id,
          isActive: true 
        },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ videos: items, source: 'static' });
    }

    const folderId = category.driveFolderId || extractFolderId(category.driveFolderUrl || '');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
    }

    // Fetch videos from Google Drive folder using public API
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'video'+and+trashed=false&fields=files(id,name,size,mimeType,thumbnailLink,createdTime,webViewLink)&key=${process.env.GOOGLE_DRIVE_API_KEY}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If API fails, try to return static items as fallback
        const items = await db.videoLibraryItem.findMany({
          where: { 
            categoryId: id,
            isActive: true 
          },
          orderBy: { sortOrder: 'asc' },
        });
        return NextResponse.json({ videos: items, source: 'static' });
      }

      const data = await response.json();
      
      // Transform the files to our format
      const videos = (data.files || []).map((file: any) => ({
        id: file.id,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        driveFileId: file.id,
        driveFolderUrl: category.driveFolderUrl,
        thumbnailUrl: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=w200-h120-c`,
        fileSize: parseInt(file.size) || null,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        createdTime: file.createdTime,
      }));

      return NextResponse.json({ 
        videos, 
        source: 'drive',
        categoryName: category.name,
        categoryIcon: category.icon
      });
    } catch (driveError) {
      console.error('Error fetching from Drive:', driveError);
      
      // Fallback to static items
      const items = await db.videoLibraryItem.findMany({
        where: { 
          categoryId: id,
          isActive: true 
        },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ videos: items, source: 'static' });
    }
  } catch (error) {
    console.error('Error fetching category videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}