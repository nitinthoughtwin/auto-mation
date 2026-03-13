import { NextRequest, NextResponse } from 'next/server';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';

// POST - Handle client-side upload token generation
// This endpoint handles requests from @vercel/blob/client's upload() function
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    console.log('Blob API request:', body.type);
    
    // Handle token generation request (type: "blob.generate-client-token")
    if (body.type === 'blob.generate-client-token') {
      const pathname = body.payload?.pathname;
      const multipart = body.payload?.multipart || false;
      
      if (!pathname) {
        return NextResponse.json({ 
          error: 'pathname is required' 
        }, { status: 400 });
      }

      console.log('🔑 Generating token for:', pathname, '| multipart:', multipart);

      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
        addRandomSuffix: true,
      });

      console.log('✅ Token generated for:', pathname);

      return NextResponse.json({
        type: 'blob.generate-client-token',
        clientToken,
      });
    }

    // Handle upload completed callback (type: "blob.upload-completed")
    if (body.type === 'blob.upload-completed') {
      const blob = body.payload?.blob;
      console.log('✅ Upload completed:', blob?.url);
      
      return NextResponse.json({
        type: 'blob.upload-completed',
        response: 'ok',
      });
    }

    console.log('Unknown request type:', body.type);
    return NextResponse.json({ 
      error: 'Unknown request type: ' + body.type 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Blob API error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

// GET - Check Blob configuration status
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return NextResponse.json({
    configured: !!token,
    tokenPreview: token ? token.substring(0, 15) + '...' : null,
  });
}