import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST - Upload file to local storage
export async function POST(request: NextRequest) {
  try {
    console.log('=== File Upload Request ===');
    
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

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const cleanName = file.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    
    const fileName = `${timestamp}-${cleanName}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Convert File to ArrayBuffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);
    
    console.log('=== Upload SUCCESS ===');
    console.log('Saved to:', filePath);

    // Return a URL-like path that we can use
    const url = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: url,
      pathname: `${folder}/${fileName}`,
      fileName: fileName
    });
    
  } catch (error: any) {
    console.error('=== Upload FAILED ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Unknown upload error'
    }, { status: 500 });
  }
}
