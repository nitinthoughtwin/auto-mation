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

// Helper: fetch with retry logic (handles rate limits & transient errors)
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url);
    if (response.ok) return response;

    // If rate limited (429) or server error (5xx), retry with backoff
    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // exponential backoff + jitter
      console.warn(`[Drive API] Attempt ${attempt} failed (${response.status}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    // For other errors (4xx), throw immediately
    const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    throw new Error(error.error?.message || `Request failed with status ${response.status}`);
  }
  throw new Error('Max retries exceeded');
}

// List ALL contents of a public folder (auto-paginate)
async function listFolderContents(folderId: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Drive API key not configured. Please add GOOGLE_DRIVE_API_KEY to your environment variables.');
  }

  const allFiles: DriveItem[] = [];
  let pageToken: string | undefined;
  let pageNum = 0;

  do {
    pageNum++;

    // FIX #1: Removed "orderBy=folder,name" — this causes Google Drive API to
    // silently truncate results for large folders (doesn't paginate correctly with orderBy).
    // Sorting is done client-side instead.
    let url = `https://www.googleapis.com/drive/v3/files?`;
    url += `q='${folderId}'+in+parents+and+trashed=false`;
    url += `&key=${GOOGLE_API_KEY}`;
    url += `&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime)`;
    url += `&pageSize=100`;
    // FIX #2: Reduced pageSize from 1000 to 100. Google Drive API is more reliable
    // with smaller page sizes. Larger page sizes can cause timeouts and silent truncation
    // for folders with many files, especially video files with large metadata.
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    console.log(`[Drive API] Fetching page ${pageNum}${pageToken ? ` (token: ${pageToken.substring(0, 20)}...)` : ''}`);

    const response = await fetchWithRetry(url);
    const data = await response.json();

    console.log(`[Drive API] Page ${pageNum}: received ${data.files?.length || 0} files. nextPageToken: ${data.nextPageToken ? 'yes' : 'no'}`);

    if (data.files) allFiles.push(...data.files);
    pageToken = data.nextPageToken;

    // FIX #3: Safety guard — prevent infinite loops. Google Drive API should never
    // return more than a few pages for a single folder listing, but this protects
    // against API bugs returning the same token repeatedly.
    if (pageNum > 50) {
      console.warn('[Drive API] Safety limit reached (50 pages). Stopping pagination.');
      break;
    }
  } while (pageToken);

  console.log(`[Drive API] Total files fetched: ${allFiles.length}`);

  // FIX #4: Client-side sorting (replaces the removed orderBy=folder,name)
  // Sort folders first, then by name within each group
  allFiles.sort((a, b) => {
    const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder';
    const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder';

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // Same type — sort by name case-insensitively
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return { files: allFiles };
}

// Get file/folder metadata
async function getItemInfo(itemId: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Drive API key not configured');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${itemId}?key=${GOOGLE_API_KEY}&fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents`;

  const response = await fetchWithRetry(url);
  return response.json();
}

// Classify and categorize files
function categorizeFiles(files: DriveItem[]) {
  const folders: DriveItem[] = [];
  const videos: DriveItem[] = [];
  const other: DriveItem[] = [];

  for (const file of files) {
    const item: DriveItem & { thumbnailUrl: string } = {
      ...file,
      // Generate thumbnail URL client-side (don't request it from API)
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w320`,
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

// GET - List folder contents or get file info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const folderId = searchParams.get('folderId');
    const itemId = searchParams.get('itemId');

    // If folderId is provided directly, list contents
    if (folderId) {
      const data = await listFolderContents(folderId);
      const { folders, videos, other } = categorizeFiles(data.files || []);

      // Get folder info for breadcrumb
      let folderInfo = null;
      try {
        folderInfo = await getItemInfo(folderId);
      } catch {
        // Ignore error — folder info is optional
      }

      return NextResponse.json({
        success: true,
        type: 'folder',
        folder: folderInfo,
        folders,
        videos,
        other,
        totalFiles: (data.files || []).length,
      });
    }

    // If itemId is provided, get item info
    if (itemId) {
      const item = await getItemInfo(itemId);
      return NextResponse.json({
        success: true,
        item: {
          ...item,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${item.id}&sz=w320`,
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
        const data = await listFolderContents(parsed.id);
        const { folders, videos, other } = categorizeFiles(data.files || []);

        // Get folder info
        let folderInfo = null;
        try {
          folderInfo = await getItemInfo(parsed.id);
        } catch {
          // Ignore error — folder info is optional
        }

        return NextResponse.json({
          success: true,
          type: 'folder',
          folder: folderInfo,
          folders,
          videos,
          other,
          totalFiles: (data.files || []).length,
        });
      } else {
        // It's a file, get info
        const file = await getItemInfo(parsed.id);

        return NextResponse.json({
          success: true,
          type: 'file',
          file: {
            ...file,
            thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w320`,
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