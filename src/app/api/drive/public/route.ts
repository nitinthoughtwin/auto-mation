import { NextRequest, NextResponse } from 'next/server';

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

// -----------------------------
// Extract ID from URL
// -----------------------------
function extractIdFromUrl(url: string): { type: 'file' | 'folder'; id: string } | null {
  const cleanUrl = url.split('?')[0];

  const folderPatterns = [
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/mobile\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/folderview\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  ];

  const filePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of [...folderPatterns, ...filePatterns]) {
    const match = url.match(pattern);
    if (match) {
      const isFile = filePatterns.some(p => url.match(p));
      return { type: isFile ? 'file' : 'folder', id: match[1] };
    }
  }

  for (const pattern of folderPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) return { type: 'folder', id: match[1] };
  }

  for (const pattern of filePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) return { type: 'file', id: match[1] };
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
    return { type: 'folder', id: url.trim() };
  }

  return null;
}

// -----------------------------
// Recursive fetch (FIXED)
// -----------------------------
async function listFolderContentsRecursive(folderId: string): Promise<DriveItem[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Missing GOOGLE_API_KEY');
  }

  const allFiles: DriveItem[] = [];

  async function fetchFolder(id: string) {
    let pageToken: string | undefined;

    do {
      let url = `https://www.googleapis.com/drive/v3/files?`;
      url += `q='${id}'+in+parents+and+trashed=false`;
      url += `&key=${GOOGLE_API_KEY}`;
      url += `&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,iconLink,createdTime,modifiedTime)`;
      url += `&pageSize=1000`;
      url += `&supportsAllDrives=true`;
      url += `&includeItemsFromAllDrives=true`;

      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Drive API error');
      }

      const data = await response.json();

      for (const file of data.files || []) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // 🔁 recurse into subfolder
          await fetchFolder(file.id);
        } else {
          allFiles.push(file);
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  await fetchFolder(folderId);

  return allFiles;
}

// -----------------------------
// Get item info
// -----------------------------
async function getItemInfo(itemId: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${itemId}?key=${GOOGLE_API_KEY}&fields=id,name,mimeType,size,thumbnailLink,webViewLink,iconLink,createdTime,modifiedTime,parents`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch item');
  }

  return response.json();
}

// -----------------------------
// API Route
// -----------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const url = searchParams.get('url');
    const folderId = searchParams.get('folderId');
    const itemId = searchParams.get('itemId');

    // -----------------------------
    // Direct folderId
    // -----------------------------
    if (folderId) {
      const files = await listFolderContentsRecursive(folderId);

      const folders: DriveItem[] = [];
      const videos: DriveItem[] = [];
      const other: DriveItem[] = [];

      for (const file of files) {
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

      const folderInfo = await getItemInfo(folderId).catch(() => null);

      return NextResponse.json({
        success: true,
        type: 'folder',
        folder: folderInfo,
        total: files.length,
        folders,
        videos,
        other,
      });
    }

    // -----------------------------
    // Item info
    // -----------------------------
    if (itemId) {
      const item = await getItemInfo(itemId);

      return NextResponse.json({
        success: true,
        item: {
          ...item,
          thumbnailUrl: item.thumbnailLink || `https://drive.google.com/thumbnail?id=${item.id}`,
        },
      });
    }

    // -----------------------------
    // URL input
    // -----------------------------
    if (url) {
      const parsed = extractIdFromUrl(url);

      if (!parsed) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Google Drive URL',
        }, { status: 400 });
      }

      if (parsed.type === 'folder') {
        const files = await listFolderContentsRecursive(parsed.id);

        const folders: DriveItem[] = [];
        const videos: DriveItem[] = [];
        const other: DriveItem[] = [];

        for (const file of files) {
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

        const folderInfo = await getItemInfo(parsed.id).catch(() => null);

        return NextResponse.json({
          success: true,
          type: 'folder',
          folder: folderInfo,
          total: files.length,
          folders,
          videos,
          other,
        });
      } else {
        const file = await getItemInfo(parsed.id);

        return NextResponse.json({
          success: true,
          type: 'file',
          file: {
            ...file,
            thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Provide url, folderId, or itemId',
    }, { status: 400 });

  } catch (error: any) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Server error',
    }, { status: 500 });
  }
}