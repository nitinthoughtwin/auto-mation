import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// POST - Upload file to Vercel Blob
export async function POST(request: NextRequest) {
  try {
    // Log environment check
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.log('=== Blob Upload Request ===');
    console.log('Token exists:', !!token);
    console.log('Token preview:', token ? token.substring(0, 15) + '...' : 'NONE');
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: 'BLOB_READ_WRITE_TOKEN not set in environment' 
      }, { status: 500 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';
    
    console.log('Folder:', folder);
    console.log('File:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'NONE');
    
    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'No file provided in form data' 
      }, { status: 400 });
    }

    // Clean filename - remove spaces and special chars
    const cleanName = file.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    
    const pathname = `${folder}/${Date.now()}-${cleanName}`;
    console.log('Target pathname:', pathname);

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public'
    });

    console.log('=== Upload SUCCESS ===');
    console.log('URL:', blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname
    });
    
  } catch (error: any) {
    console.error('=== Upload FAILED ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Unknown upload error',
      errorName: error.name,
      errorCode: error.code
    }, { status: 500 });
  }
}