import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';

// POST - Handle client-side Blob upload token generation
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    
    const result = await handleUpload({
      token,
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Blob upload error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}