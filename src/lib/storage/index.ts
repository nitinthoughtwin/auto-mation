import 'server-only';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Storage configuration
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'vercel';

// R2 Configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Upload file to storage
export async function uploadFile(
  key: string,
  file: Buffer,
  contentType: string
): Promise<{ url: string; provider: string }> {

  if (STORAGE_PROVIDER === 'r2') {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await r2Client.send(command);
    const url = `${R2_PUBLIC_URL}/${key}`;
    return { url, provider: 'r2' };
  }

  throw new Error('For Vercel Blob, use client-side upload with @vercel/blob/client');
}

// Delete file from storage (supports R2, Blob, and Google Drive)
export async function deleteFile(
  url: string,
  driveConfig?: { accessToken: string; refreshToken: string }
): Promise<boolean> {
  try {
    // Google Drive URL
    if (url.includes('drive.google.com')) {
      if (!driveConfig) {
        console.warn('Drive config required to delete Google Drive files');
        return false;
      }
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (!match) return false;
      const { deleteFromDrive } = await import('../drive');
      const result = await deleteFromDrive(driveConfig.accessToken, driveConfig.refreshToken, match[1]);
      return result.success;
    }

    // Cloudflare R2 URL — extract key by stripping the public base URL
    if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
      const key = url.slice(R2_PUBLIC_URL.length + 1); // strip leading slash
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      return true;
    }

    // Vercel Blob URL
    const { del } = await import('@vercel/blob');
    await del(url);
    return true;

  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

// Get storage usage
export async function getStorageUsage(): Promise<{
  provider: string;
  totalBytes: number;
  totalFormatted: string;
  files: Array<{ key: string; size: number }>;
}> {
  if (STORAGE_PROVIDER === 'r2') {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
    });

    const response = await r2Client.send(command);
    const files = (response.Contents || []).map(item => ({
      key: item.Key || '',
      size: item.Size || 0,
    }));

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    return {
      provider: 'Cloudflare R2',
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      files,
    };
  }

  const { list } = await import('@vercel/blob');
  const { blobs } = await list();

  const files = blobs.map(b => ({
    key: b.pathname,
    size: b.size || 0,
  }));

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return {
    provider: 'Vercel Blob',
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    files,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isStorageConfigured(): { configured: boolean; provider: string; error?: string } {
  if (STORAGE_PROVIDER === 'r2') {
    if (!process.env.R2_ENDPOINT) return { configured: false, provider: 'r2', error: 'R2_ENDPOINT not set' };
    if (!process.env.R2_ACCESS_KEY_ID) return { configured: false, provider: 'r2', error: 'R2_ACCESS_KEY_ID not set' };
    if (!process.env.R2_SECRET_ACCESS_KEY) return { configured: false, provider: 'r2', error: 'R2_SECRET_ACCESS_KEY not set' };
    if (!R2_BUCKET_NAME) return { configured: false, provider: 'r2', error: 'R2_BUCKET_NAME not set' };
    if (!R2_PUBLIC_URL) return { configured: false, provider: 'r2', error: 'R2_PUBLIC_URL not set' };
    return { configured: true, provider: 'Cloudflare R2' };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { configured: false, provider: 'vercel', error: 'BLOB_READ_WRITE_TOKEN not set' };
  }
  return { configured: true, provider: 'Vercel Blob' };
}

export { STORAGE_PROVIDER };