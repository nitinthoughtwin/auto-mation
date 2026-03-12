import { NextRequest, NextResponse } from 'next/server';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';

// POST - Generate client token for direct Blob uploads
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        { error: 'Blob storage not configured. Go to Vercel Dashboard > Storage > Blob and create a store.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Blob request type:', body.type, '| pathname:', body.payload?.pathname);
    
    // Handle token generation request
    if (body.type === 'blob.generate-client-token') {
      const pathname = body.payload?.pathname;
      const multipart = body.payload?.multipart || false;
      
      if (!pathname) {
        return NextResponse.json({ error: 'Pathname is required' }, { status: 400 });
      }

      console.log('Generating token for:', pathname, '| multipart:', multipart);

      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
        addRandomSuffix: true,
      });

      console.log('Token generated successfully');
      
      return NextResponse.json({
        type: 'blob.generate-client-token',
        clientToken,
      });
    }

    // Handle upload-completed callback
    if (body.type === 'blob.upload-completed') {
      console.log('Upload completed:', body.payload?.blob?.url);
      return NextResponse.json({ type: 'blob.upload-completed', response: 'ok' });
    }

    return NextResponse.json({ error: 'Unknown request type: ' + body.type }, { status: 400 });
    
  } catch (error: any) {
    console.error('Blob token error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}