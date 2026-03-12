import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// POST - Upload file to Vercel Blob using server-side put
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Go to Vercel Dashboard > Storage > Create Blob Store.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'videos';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedName}`;

    console.log('Uploading to Blob:', pathname, '| size:', file.size, '| type:', file.type);

    // Upload directly to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      token,
    });

    console.log('Upload successful:', blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
    
  } catch (error: any) {
    console.error('Blob upload error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}