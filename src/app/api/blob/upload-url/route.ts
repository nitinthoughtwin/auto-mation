import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';

// POST - Handle client-side direct upload to Vercel Blob
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        { error: 'Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN in Vercel Dashboard > Storage > Blob.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Blob upload request type:', body.type);

    // Handle the upload request
    const result = await handleUpload({
      token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        console.log('Generating token for:', pathname, '| multipart:', multipart);
        
        return {
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is called when the upload completes
        // You can use this to update your database with the blob URL
        console.log('Upload completed:', blob.url);
      },
    });

    console.log('Result type:', result.type);
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Blob upload error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to handle upload' },
      { status: 500 }
    );
  }
}