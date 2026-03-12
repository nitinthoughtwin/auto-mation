import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';

// POST - Handle client-side direct upload to Vercel Blob
// This uses Vercel Blob's built-in handling for secure browser uploads
export async function POST(request: NextRequest) {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN to environment variables.' },
        { status: 500 }
      );
    }

    // Handle the upload request using Vercel Blob's handleUpload
    // Note: handleUpload will parse the body internally, so we don't parse it here
    const result = await handleUpload({
      request,
      body: await request.json(), // Parse body for handleUpload
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        // Validate and configure the upload
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
            'video/webm',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max for videos
          validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
          addRandomSuffix: true,
          tokenPayload: clientPayload || undefined,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called when the upload is complete
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error handling blob upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to handle upload' },
      { status: 500 }
    );
  }
}