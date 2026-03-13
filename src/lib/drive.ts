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