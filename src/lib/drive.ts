import 'server-only';
import { google } from 'googleapis';
import { createOAuth2Client } from './youtube';

const OAuth2 = google.auth.OAuth2;

// Get Drive client
function getDriveClient(accessToken: string, refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Upload file to Google Drive
export async function uploadToDrive(
  accessToken: string,
  refreshToken: string,
  file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  },
  folderId?: string
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
  try {
    const drive = getDriveClient(accessToken, refreshToken);
    
    // Create a folder for YouTube videos if not exists
    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await getOrCreateYouTubeFolder(drive);
    }

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.mimeType,
        body: bufferToStream(file.buffer),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the direct download link
    const fileData = await drive.files.get({
      fileId: response.data.id!,
      fields: 'webContentLink',
    });

    return {
      success: true,
      fileId: response.data.id!,
      webViewLink: fileData.data.webContentLink || response.data.webViewLink!,
    };
  } catch (error: any) {
    console.error('Drive upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload to Drive',
    };
  }
}

// Upload from URL (for client-side use)
export async function uploadUrlToDrive(
  accessToken: string,
  refreshToken: string,
  file: {
    name: string;
    mimeType: string;
    url: string; // URL to download from
  },
  folderId?: string
): Promise<{ success: boolean; fileId?: string; downloadUrl?: string; error?: string }> {
  try {
    const drive = getDriveClient(accessToken, refreshToken);
    
    // Create a folder for YouTube videos if not exists
    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await getOrCreateYouTubeFolder(drive);
    }

    // Download file from URL
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Failed to download from URL: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.mimeType,
        body: bufferToStream(buffer),
      },
      fields: 'id, webContentLink',
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: driveResponse.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get direct download link
    const directUrl = `https://drive.google.com/uc?export=download&id=${driveResponse.data.id}`;

    return {
      success: true,
      fileId: driveResponse.data.id!,
      downloadUrl: directUrl,
    };
  } catch (error: any) {
    console.error('Drive upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload to Drive',
    };
  }
}

// Get or create YouTube videos folder
async function getOrCreateYouTubeFolder(drive: any): Promise<string> {
  const folderName = 'YouTube Automation Videos';
  
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

// Delete file from Drive
export async function deleteFromDrive(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = getDriveClient(accessToken, refreshToken);
    
    await drive.files.delete({ fileId });
    
    return { success: true };
  } catch (error: any) {
    console.error('Drive delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete from Drive',
    };
  }
}

// Get Drive storage usage
export async function getDriveStorageInfo(
  accessToken: string,
  refreshToken: string
): Promise<{
  success: boolean;
  usage?: {
    usedGB: number;
    limitGB: number;
    usedPercent: number;
    availableGB: number;
  };
  error?: string;
}> {
  try {
    const drive = getDriveClient(accessToken, refreshToken);
    
    const about = await drive.about.get({
      fields: 'storageQuota',
    });

    const quota = about.data.storageQuota;
    const used = parseInt(quota?.usage || '0');
    const limit = parseInt(quota?.limit || '16106127360'); // 15GB default
    
    const usedGB = used / (1024 * 1024 * 1024);
    const limitGB = limit / (1024 * 1024 * 1024);
    
    return {
      success: true,
      usage: {
        usedGB: parseFloat(usedGB.toFixed(2)),
        limitGB: parseFloat(limitGB.toFixed(2)),
        usedPercent: parseFloat(((used / limit) * 100).toFixed(2)),
        availableGB: parseFloat((limitGB - usedGB).toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error('Drive storage info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get storage info',
    };
  }
}

// List files in YouTube folder
export async function listDriveFiles(
  accessToken: string,
  refreshToken: string
): Promise<{
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    size: number;
    createdTime: string;
    downloadUrl: string;
  }>;
  error?: string;
}> {
  try {
    const drive = getDriveClient(accessToken, refreshToken);
    const folderId = await getOrCreateYouTubeFolder(drive);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = (response.data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      size: parseInt(file.size || '0'),
      createdTime: file.createdTime,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
    }));

    return {
      success: true,
      files,
    };
  } catch (error: any) {
    console.error('Drive list error:', error);
    return {
      success: false,
      error: error.message || 'Failed to list files',
    };
  }
}

// Helper: Convert Buffer to Readable Stream
function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// ─── Public Drive Fetch (API key) ────────────────────────────────────────────

export interface PublicDriveVideo {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  thumbnailLink: string;
  webViewLink: string;
  downloadUrl: string;
  createdTime: string | null;
}

export type FetchVideosResult =
  | { videos: PublicDriveVideo[]; error: null }
  | { videos: []; error: string };

/**
 * Fetch ALL video files from a public Google Drive folder, recursively
 * traversing subfolders. Uses the GOOGLE_DRIVE_API_KEY env var.
 *
 * Why recursive: many shared folders contain subfolders instead of flat files.
 * A non-recursive query returns 0 videos when all videos are in subfolders.
 */
export async function fetchAllVideosFromDriveFolder(
  folderId: string,
  apiKey?: string,
  _depth = 0,
): Promise<FetchVideosResult> {
  const key = apiKey ?? process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return { videos: [], error: 'GOOGLE_API_KEY_NOT_SET' };

  // Safety: don't recurse more than 5 levels deep
  if (_depth > 5) return { videos: [], error: null };

  try {
    // ── Step 1: fetch all direct children (folders + videos) ──────────────
    const allItems: any[] = [];
    let pageToken: string | undefined;
    let pageNum = 0;

    do {
      pageNum++;
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
      url.searchParams.set(
        'fields',
        'nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime)',
      );
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set('key', key);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const reason = err?.error?.errors?.[0]?.reason;
        if (res.status === 403) {
          if (reason === 'keyInvalid') return { videos: [], error: 'API key is invalid or not enabled for Drive API' };
          if (reason === 'accessNotConfigured') return { videos: [], error: 'Google Drive API is not enabled in Cloud Console' };
          return { videos: [], error: 'FOLDER_NOT_PUBLIC' };
        }
        if (res.status === 404) return { videos: [], error: 'FOLDER_NOT_FOUND' };
        return { videos: [], error: err.error?.message || 'API_ERROR' };
      }

      const data = await res.json();
      if (data.files) allItems.push(...data.files);
      pageToken = data.nextPageToken;
      if (pageNum >= 50) break;
    } while (pageToken);

    // ── Step 2: separate videos and subfolders ─────────────────────────────
    const videos: PublicDriveVideo[] = [];
    const subfolderIds: string[] = [];

    for (const item of allItems) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        subfolderIds.push(item.id);
      } else if (item.mimeType?.startsWith('video/')) {
        videos.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          size: item.size ? parseInt(item.size) : null,
          thumbnailLink: item.thumbnailLink || `https://lh3.googleusercontent.com/d/${item.id}=w200-h120-c`,
          webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${item.id}`,
          createdTime: item.createdTime || null,
        });
      }
    }

    console.log(`[Drive] Folder ${folderId} (depth ${_depth}): ${videos.length} videos, ${subfolderIds.length} subfolders`);

    // ── Step 3: recurse into subfolders in parallel (max 5 at a time) ──────
    for (let i = 0; i < subfolderIds.length; i += 5) {
      const batch = subfolderIds.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(id => fetchAllVideosFromDriveFolder(id, key, _depth + 1))
      );
      for (const r of results) {
        if (r.error === null) videos.push(...r.videos);
        // ignore subfolder errors — partial results are better than nothing
      }
    }

    console.log(`[Drive] Folder ${folderId} total (with subfolders): ${videos.length} videos`);
    return { videos, error: null };

  } catch (err: any) {
    console.error('[Drive] fetchAllVideosFromDriveFolder error:', err);
    return { videos: [], error: 'NETWORK_ERROR' };
  }
}