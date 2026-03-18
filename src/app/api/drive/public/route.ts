import { NextRequest, NextResponse } from 'next/server';

// Google Drive API key for public access
const GOOGLE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

// Extract ID from various Google Drive URL formats
function extractIdFromUrl(url: string): { type: 'file' | 'folder'; id: string } | null {
  // Clean URL - remove query parameters for better matching
  const cleanUrl = url.split('?')[0];
  
  // Folder patterns
  const folderPatterns = [
    /drive\.google\.com\/drive\/mobile\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/folderview\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/,
  ];

  // File patterns
  const filePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  // Try original URL first (for patterns with query params)
  for (const pattern of [...folderPatterns, ...filePatterns]) {
    const match = url.match(pattern);
    if (match) {
      const isFile = filePatterns.some(p => url.match(p));
      return { type: isFile ? 'file' : 'folder', id: match[1] };
    }
  }

  // Try cleaned URL
  for (const pattern of folderPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return { type: 'folder', id: match[1] };
    }
  }

  for (const pattern of filePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return { type: 'file', id: match[1] };
    }
  }

  // If just an ID is provided (assuming folder)
  const trimmedUrl = url.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmedUrl)) {
    return { type: 'folder', id: trimmedUrl };
  }

  return null;
}

// List contents of a public folder
async function listFolderContents(folderId: string, pageToken?: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Drive API key not configured. Please add GOOGLE_DRIVE_API_KEY to your environment variables.');
  }

  let url = `https://www.googleapis.com/drive/v3/files?`;
  url += `q='${folderId}'+in+parents+and+trashed=false`;
  url += `&key=${GOOGLE_API_KEY}`;
  url += `&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,iconLink,createdTime,modifiedTime)`;
  url += `&pageSize=100`;
  url += `&orderBy=folder,name`;
  
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to access folder. Make sure the folder is shared publicly.');
  }

  return response.json();
}

// Get file/folder metadata
async function getItemInfo(itemId: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Drive API key not configured');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${itemId}?key=${GOOGLE_API_KEY}&fields=id,name,mimeType,size,thumbnailLink,webViewLink,iconLink,createdTime,modifiedTime,parents`;

  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to access item');
  }

  return response.json();
}

// GET - List folder contents or get file info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const folderId = searchParams.get('folderId');
    const itemId = searchParams.get('itemId');
    const pageToken = searchParams.get('pageToken');

    // If folderId is provided directly, list contents
    if (folderId) {
      const data = await listFolderContents(folderId, pageToken || undefined);
      
      const folders: DriveItem[] = [];
      const videos: DriveItem[] = [];
      const other: DriveItem[] = [];

      for (const file of data.files || []) {
        const item = {
          ...file,
          thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`,
        };

        if (file.mimeType === 'application/vnd.google-apps.folder') {
          folders.push(item);
        } else if (file.mimeType?.startsWith('video/')) {
          videos.push(item);
        } else {
          other.push(item);
        }
      }

      // Get folder info for breadcrumb
      let folderInfo = null;
      try {
        folderInfo = await getItemInfo(folderId);
      } catch {
        // Ignore error
      }

      return NextResponse.json({
        success: true,
        type: 'folder',
        folder: folderInfo,
        folders,
        videos,
        other,
        nextPageToken: data.nextPageToken,
      });
    }

    // If itemId is provided, get item info
    if (itemId) {
      const item = await getItemInfo(itemId);
      return NextResponse.json({
        success: true,
        item: {
          ...item,
          thumbnailUrl: item.thumbnailLink || `https://drive.google.com/thumbnail?id=${item.id}`,
        }
      });
    }

    // If URL is provided, parse and process
    if (url) {
      const parsed = extractIdFromUrl(url);
      
      if (!parsed) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Google Drive URL. Please enter a valid Google Drive folder or file link.'
        }, { status: 400 });
      }

      if (parsed.type === 'folder') {
        // List folder contents
        const data = await listFolderContents(parsed.id);
        
        const folders: DriveItem[] = [];
        const videos: DriveItem[] = [];
        const other: DriveItem[] = [];

        for (const file of data.files || []) {
          const item = {
            ...file,
            thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`,
          };

          if (file.mimeType === 'application/vnd.google-apps.folder') {
            folders.push(item);
          } else if (file.mimeType?.startsWith('video/')) {
            videos.push(item);
          } else {
            other.push(item);
          }
        }

        // Get folder info
        let folderInfo = null;
        try {
          folderInfo = await getItemInfo(parsed.id);
        } catch {
          // Ignore error
        }

        return NextResponse.json({
          success: true,
          type: 'folder',
          folder: folderInfo,
          folders,
          videos,
          other,
          nextPageToken: data.nextPageToken,
        });
      } else {
        // It's a file, get info
        const file = await getItemInfo(parsed.id);
        
        return NextResponse.json({
          success: true,
          type: 'file',
          file: {
            ...file,
            thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`,
          }
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Please provide a URL, folderId, or itemId'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[Drive Public] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to access Google Drive'
    }, { status: 500 });
  }
}
