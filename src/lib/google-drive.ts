import 'server-only';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { createOAuth2Client, refreshAccessToken } from './youtube';

// Get Drive client using user's OAuth tokens
export async function getDriveClient(accessToken: string, refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Create a resumable upload session - returns upload URL
export async function createResumableUploadSession(
  accessToken: string,
  refreshToken: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  folder: string = 'youtube-uploads'
): Promise<{ uploadUrl: string; fileId: string }> {
  const drive = await getDriveClient(accessToken, refreshToken);
  
  // Get or create folder
  const folderId = await getOrCreateFolder(accessToken, refreshToken, folder);
  
  // Generate unique filename
  const timestamp = Date.now();
  const cleanName = fileName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const uniqueFileName = `${timestamp}-${cleanName}`;

  // Create file metadata
  const fileMetadata = {
    name: uniqueFileName,
    parents: [folderId],
  };

  // Create resumable upload session
  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: mimeType,
    },
    fields: 'id',
  });

  const fileId = res.data.id!;
  
  // Get the resumable upload URL from the response
  // Note: Google Drive API handles resumable uploads differently
  // We need to use the files.update with media for actual upload
  
  // Make the file public
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Return a URL that our client can use
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable&supportsAllDrives=true`;
  
  return { uploadUrl, fileId };
}

// Get or create folder in Google Drive
export async function getOrCreateFolder(
  accessToken: string, 
  refreshToken: string, 
  folderName: string
): Promise<string> {
  const drive = await getDriveClient(accessToken, refreshToken);
  
  // Check if folder exists
  const existingFolders = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (existingFolders.data.files && existingFolders.data.files.length > 0) {
    return existingFolders.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
}

// Upload file to Google Drive (for small files < 10MB)
export async function uploadToGoogleDrive(
  accessToken: string,
  refreshToken: string,
  file: File,
  folder: string = 'youtube-uploads'
): Promise<{ id: string; url: string; name: string }> {
  const drive = await getDriveClient(accessToken, refreshToken);
  
  // Get or create folder
  const folderId = await getOrCreateFolder(accessToken, refreshToken, folder);
  
  // Generate unique filename
  const timestamp = Date.now();
  const cleanName = file.name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const fileName = `${timestamp}-${cleanName}`;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create readable stream from buffer
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);

  // Upload to Google Drive
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
      body: readable,
    },
    fields: 'id, name',
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
  const fileId = response.data.id!;
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  return {
    id: fileId,
    url: directUrl,
    name: fileName,
  };
}

// Download file from Google Drive (for YouTube upload)
export async function downloadFromGoogleDrive(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<Buffer> {
  const drive = await getDriveClient(accessToken, refreshToken);
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  
  return Buffer.from(response.data as ArrayBuffer);
}

// Delete file from Google Drive
export async function deleteFromGoogleDrive(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<void> {
  const drive = await getDriveClient(accessToken, refreshToken);
  await drive.files.delete({ fileId });
}

// Get file metadata
export async function getFileMetadata(
  accessToken: string,
  refreshToken: string,
  fileId: string
) {
  const drive = await getDriveClient(accessToken, refreshToken);
  
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, size, mimeType, createdTime, webViewLink',
  });
  
  return response.data;
}

// Extract file ID from Google Drive URL
export function extractFileIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // URL format: https://drive.google.com/uc?export=download&id=FILE_ID
  const match = url.match(/[?&]id=([^&]+)/);
  if (match) return match[1];
  
  // Alternative format: https://drive.google.com/file/d/FILE_ID/view
  const altMatch = url.match(/\/file\/d\/([^/]+)/);
  if (altMatch) return altMatch[1];
  
  // If it's already a file ID (no URL format)
  if (url.length > 20 && !url.includes('http')) {
    return url;
  }
  
  return null;
}
