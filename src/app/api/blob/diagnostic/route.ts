import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// GET - Diagnose Blob storage configuration
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Check 1: Token exists
  if (!token) {
    return NextResponse.json({
      status: 'ERROR',
      step: 'token_check',
      message: 'BLOB_READ_WRITE_TOKEN is not set',
      solution: 'Go to Vercel Dashboard > Your Project > Settings > Environment Variables and add BLOB_READ_WRITE_TOKEN'
    });
  }
  
  // Check 2: Token format
  const tokenStart = token.substring(0, 15);
  const isValidFormat = token.startsWith('vercel_blob_rw_');
  
  if (!isValidFormat) {
    return NextResponse.json({
      status: 'ERROR', 
      step: 'token_format',
      message: 'Token format is invalid',
      tokenPreview: tokenStart + '...',
      expectedFormat: 'vercel_blob_rw_...',
      solution: 'The token should start with "vercel_blob_rw_". Get it from Vercel Dashboard > Storage > Your Blob Store'
    });
  }
  
  // Check 3: Try to connect to Blob store
  try {
    const result = await list({ limit: 1 });
    
    return NextResponse.json({
      status: 'SUCCESS',
      step: 'connection_test',
      message: 'Blob storage is working correctly!',
      tokenPreview: tokenStart + '...',
      storeHasBlobs: result.blobs.length > 0,
      blobsCount: result.blobs.length,
      nextStep: 'You can now upload videos using client-side direct upload'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      step: 'connection_test',
      message: 'Failed to connect to Blob store',
      error: error.message,
      errorCode: error.code,
      tokenPreview: tokenStart + '...',
      solution: error.message?.includes('not found') 
        ? 'Blob store not found. Go to Vercel Dashboard > Your Project > Storage and CREATE a Blob store, then LINK it to your project'
        : 'Check if the Blob store exists and is linked to this project in Vercel Dashboard'
    });
  }
}