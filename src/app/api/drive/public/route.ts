import { NextRequest, NextResponse } from 'next/server';

// Google Drive API key — required for public folder access.
// YouTube OAuth tokens have YouTube-only scopes and CANNOT access Drive folders.
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
  const cleanUrl = url.split('?')[0];

  const folderPatterns = [
    /drive\.google\.com\/drive\/mobile\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/folderview\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/,
  ];

  const filePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  // Try original URL first (handles query-param patterns like open?id=)
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
    if (match) return { type: 'folder', id: match[1] };
  }
  for (const pattern of filePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) return { type: 'file', id: match[1] };
  }

  // Bare ID
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { type: 'folder', id: trimmed };
  }

  return null;
}

// Fetch ALL files in a folder — paginate with nextPageToken
async function listFolderContents(folderId: string): Promise<DriveItem[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_DRIVE_API_KEY is not configured on the server.');
  }

  const allFiles: DriveItem[] = [];
  let pageToken: string | undefined;
  let pageNum = 0;

  do {
    pageNum++;
    let url = `https://www.googleapis.com/drive/v3/files?`;
    url += `q='${folderId}'+in+parents+and+trashed=false`;
    url += `&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime,modifiedTime)`;
    url += `&pageSize=1000`;
    url += `&key=${GOOGLE_API_KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    console.log(`[Drive Public] Fetching page ${pageNum} for folder ${folderId}`);

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Drive API error (${res.status}). Make sure the folder is shared publicly.`);
    }

    const data = await res.json();
    if (data.files) allFiles.push(...data.files);
    pageToken = data.nextPageToken;
    console.log(`[Drive Public] Page ${pageNum}: ${data.files?.length ?? 0} files. nextPage: ${!!pageToken}`);

    if (pageNum >= 50) { // safety guard
      console.warn('[Drive Public] Hit 50-page limit, stopping.');
      break;
    }
  } while (pageToken);

  console.log(`[Drive Public] Total fetched: ${allFiles.length}`);

  // Sort: folders first, then by name
  allFiles.sort((a, b) => {
    const aF = a.mimeType === 'application/vnd.google-apps.folder';
    const bF = b.mimeType === 'application/vnd.google-apps.folder';
    if (aF && !bF) return -1;
    if (!aF && bF) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return allFiles;
}

async function getItemInfo(itemId: string): Promise<DriveItem | null> {
  if (!GOOGLE_API_KEY) return null;
  const url = `https://www.googleapis.com/drive/v3/files/${itemId}?fields=id,name,mimeType,size,thumbnailLink,webViewLink,createdTime,modifiedTime,parents&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function categorizeFiles(files: DriveItem[]) {
  const folders: DriveItem[] = [];
  const videos: DriveItem[] = [];
  const other: DriveItem[] = [];

  for (const file of files) {
    const item = {
      ...file,
      thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w320`,
    };
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      folders.push(item);
    } else if (file.mimeType?.startsWith('video/')) {
      videos.push(item);
    } else {
      other.push(item);
    }
  }

  return { folders, videos, other };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const folderId = searchParams.get('folderId');
    const itemId = searchParams.get('itemId');

    if (folderId) {
      const files = await listFolderContents(folderId);
      const { folders, videos, other } = categorizeFiles(files);
      const folderInfo = await getItemInfo(folderId).catch(() => null);

      return NextResponse.json({
        success: true,
        type: 'folder',
        folder: folderInfo,
        folders,
        videos,
        other,
        totalFiles: files.length,
      });
    }

    if (itemId) {
      const item = await getItemInfo(itemId);
      if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      return NextResponse.json({
        success: true,
        item: { ...item, thumbnailUrl: `https://drive.google.com/thumbnail?id=${item.id}&sz=w320` },
      });
    }

    if (url) {
      const parsed = extractIdFromUrl(url);
      if (!parsed) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Google Drive URL. Please enter a valid folder or file link.',
        }, { status: 400 });
      }

      if (parsed.type === 'folder') {
        const files = await listFolderContents(parsed.id);
        const { folders, videos, other } = categorizeFiles(files);
        const folderInfo = await getItemInfo(parsed.id).catch(() => null);

        return NextResponse.json({
          success: true,
          type: 'folder',
          folder: folderInfo,
          folders,
          videos,
          other,
          totalFiles: files.length,
        });
      } else {
        const file = await getItemInfo(parsed.id);
        if (!file) return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
        return NextResponse.json({
          success: true,
          type: 'file',
          file: { ...file, thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w320` },
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Please provide a url, folderId, or itemId' }, { status: 400 });

  } catch (error: any) {
    console.error('[Drive Public] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to access Google Drive' }, { status: 500 });
  }
}
