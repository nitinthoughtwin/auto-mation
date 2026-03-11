import fs from 'fs';
import path from 'path';

// Check if running on Vercel
export const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;

// Get the appropriate upload directory based on environment
export function getUploadDir(type: 'videos' | 'thumbnails'): string {
  if (isVercel) {
    // On Vercel, use /tmp for temporary storage
    return path.join('/tmp', 'youtube-automation', type);
  }
  
  // Local development - use uploads folder in project root
  return path.join(process.cwd(), 'uploads', type);
}

// Save file to storage
export async function saveFile(
  file: File,
  type: 'videos' | 'thumbnails'
): Promise<{
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  url?: string;
  blobStored?: boolean;
}> {
  const fileExtension = path.extname(file.name) || '';
  const uniqueFileName = `${randomUUID()}${fileExtension}`;
  
  // On Vercel, try to use Blob storage if configured
  if (isVercel && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // Dynamic import to avoid bundling issues on local
      const { put } = await import('@vercel/blob');
      
      const blob = await put(uniqueFileName, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      
      return {
        fileName: uniqueFileName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        url: blob.url,
        blobStored: true,
      };
    } catch (error) {
      console.error('Blob storage failed, falling back to /tmp:', error);
      // Fall through to /tmp storage
    }
  }
  
  // Local or fallback - save to filesystem
  const uploadDir = getUploadDir(type);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filePath = path.join(uploadDir, uniqueFileName);
  
  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);
  
  return {
    fileName: uniqueFileName,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
    blobStored: false,
  };
}

// Get file for upload
export async function getFile(
  storagePath: string,
  type: 'videos' | 'thumbnails'
): Promise<{
  buffer: Buffer;
  url?: string;
  cleanup: () => void;
}> {
  // If it's a URL (from Blob storage)
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const response = await fetch(storagePath);
    const arrayBuffer = await response.arrayBuffer();
    
    return {
      buffer: Buffer.from(arrayBuffer),
      url: storagePath,
      cleanup: () => {}, // No cleanup needed for Blob
    };
  }
  
  // Local filesystem
  const uploadDir = getUploadDir(type);
  const filePath = path.join(uploadDir, storagePath);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${storagePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  
  return {
    buffer,
    cleanup: () => {
      // Optionally delete file after upload
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };
}

// Delete file
export function deleteFile(
  storagePath: string,
  type: 'videos' | 'thumbnails'
): void {
  // Skip if it's a URL (Blob storage)
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return;
  }
  
  const uploadDir = getUploadDir(type);
  const filePath = path.join(uploadDir, storagePath);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Check if storage is properly configured
export function getStorageStatus(): {
  configured: boolean;
  type: 'local' | 'blob' | 'temp';
  warning?: string;
} {
  if (!isVercel) {
    return { configured: true, type: 'local' };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { configured: true, type: 'blob' };
  }

  return { 
    configured: true, 
    type: 'temp',
    warning: 'Using temporary storage (/tmp). Files will NOT persist between deployments. Configure BLOB_READ_WRITE_TOKEN in Vercel for persistent storage.'
  };
}

// Utility to generate random UUID
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
