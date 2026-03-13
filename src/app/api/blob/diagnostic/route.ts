import { NextResponse } from 'next/server';
import { list, put, head } from '@vercel/blob';

// GET - Full Blob diagnostic
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Check 1: Token exists
  if (!token) {
    return NextResponse.json({
      status: 'ERROR',
      step: 'token_exists',
      message: 'BLOB_READ_WRITE_TOKEN is not set',
    });
  }
  
  // Check 2: Token format
  const tokenParts = token.split('_');
  const tokenFormat = {
    full: token.substring(0, 30) + '...',
    parts: tokenParts.length,
    prefix: tokenParts[0] + '_' + tokenParts[1] + '_' + tokenParts[2],
  };
  
  // Check 3: List existing blobs
  let listResult;
  try {
    listResult = await list({ limit: 5 });
  } catch (e: any) {
    return NextResponse.json({
      status: 'ERROR',
      step: 'list_blobs',
      message: 'Failed to list blobs',
      error: e.message,
      tokenFormat,
    });
  }
  
  // Check 4: Try a test upload
  let testUpload;
  try {
    const testBlob = await put('diagnostic/test.txt', 'Diagnostic test at ' + new Date().toISOString(), {
      access: 'public',
    });
    testUpload = {
      success: true,
      url: testBlob.url,
    };
  } catch (e: any) {
    testUpload = {
      success: false,
      error: e.message,
    };
  }
  
  return NextResponse.json({
    status: testUpload.success ? 'SUCCESS' : 'PARTIAL',
    tokenFormat,
    storeHasBlobs: listResult.blobs.length > 0,
    blobsCount: listResult.blobs.length,
    testUpload,
    solution: !testUpload.success 
      ? 'Server-side upload works but client-side might have issues. Check if Blob store is linked to correct project.'
      : 'Everything works! Client-side upload should work.',
  });
}
