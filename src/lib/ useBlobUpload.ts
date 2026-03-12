'use client';

import { useState, useCallback } from 'react';
import { upload } from '@vercel/blob/client';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

interface UseBlobUploadOptions {
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (results: UploadProgress[]) => void;
  onError?: (error: string) => void;
}

export function useBlobUpload(options: UseBlobUploadOptions = {}) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(async (
    files: FileList | File[],
    type: 'videos' | 'thumbnails' = 'videos'
  ): Promise<UploadProgress[]> => {
    const fileArray = Array.from(files);
    setIsUploading(true);

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploads(initialProgress);
    options.onProgress?.(initialProgress);

    const results: UploadProgress[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const filePath = `${type}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;

      try {
        // Update status to uploading
        setUploads(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'uploading' as const } : u
        ));

        // Upload directly to Vercel Blob
        const blob = await upload(filePath, file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload-url',
          onUploadProgress: (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            setUploads(prev => prev.map((u, idx) => 
              idx === i ? { ...u, progress: percentage } : u
            ));
            options.onProgress?.(uploads.map((u, idx) => 
              idx === i ? { ...u, progress: percentage } : u
            ));
          },
        });

        // Update status to completed
        const completedUpload: UploadProgress = {
          fileName: file.name,
          progress: 100,
          status: 'completed',
          url: blob.url,
        };
        
        setUploads(prev => prev.map((u, idx) => 
          idx === i ? completedUpload : u
        ));
        results.push(completedUpload);

      } catch (error: any) {
        // Update status to error
        const errorUpload: UploadProgress = {
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: error.message || 'Upload failed',
        };
        
        setUploads(prev => prev.map((u, idx) => 
          idx === i ? errorUpload : u
        ));
        results.push(errorUpload);
        options.onError?.(error.message);
      }
    }

    setIsUploading(false);
    options.onComplete?.(results);
    return results;
  }, [options, uploads]);

  const reset = useCallback(() => {
    setUploads([]);
    setIsUploading(false);
  }, []);

  return {
    uploads,
    isUploading,
    uploadFiles,
    reset,
  };
}

// Helper function to upload a single file
export async function uploadToBlob(
  file: File,
  type: 'videos' | 'thumbnails' = 'videos'
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    const filePath = `${type}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;
    
    const blob = await upload(filePath, file, {
      access: 'public',
      handleUploadUrl: '/api/blob/upload-url',
    });

    return { url: blob.url };
  } catch (error: any) {
    return { error: error.message || 'Upload failed' };
  }
}