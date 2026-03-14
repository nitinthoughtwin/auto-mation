import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';
import { uploadToGoogleDrive } from '@/lib/google-drive';

// Configure for large file handling
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// POST - Upload file to Google Drive (for thumbnails and small files < 10MB)
export async function POST(request: NextRequest) {
  try {
    console.log('=== Google Drive Upload Request ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'youtube-uploads';
    const channelId = formData.get('channelId') as string | null;
    
    console.log('Folder:', folder);
    console.log('Channel ID:', channelId);
    console.log('File size:', file?.size || 0);
    
    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ 
        success: false,
        error: 'Channel ID is required' 
      }, { status: 400 });
    }

    // Check file size - limit to 10MB for server-side upload
    const MAX_SERVER_UPLOAD = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SERVER_UPLOAD) {
      return NextResponse.json({ 
        success: false,
        error: 'File too large. Use direct upload for files > 10MB',
        useDirectUpload: true
      }, { status: 413 });
    }

    // Get channel with tokens
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ 
        success: false,
        error: 'Channel not found' 
      }, { status: 404 });
    }
    
    // Refresh access token
    let accessToken = channel.accessToken;
    let refreshToken = channel.refreshToken;
    
    try {
      const tokens = await refreshAccessToken(channel.refreshToken);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      
      await db.channel.update({
        where: { id: channelId },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
      console.log('Access token refreshed');
    } catch (e) {
      console.log('Using existing token');
    }

    // Upload to Google Drive
    console.log('Starting Google Drive upload...');
    const result = await uploadToGoogleDrive(accessToken, refreshToken, file, folder);
    
    console.log('=== Upload SUCCESS ===');
    console.log('File ID:', result.id);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileId: result.id,
      fileName: result.name
    });
    
  } catch (error: any) {
    console.error('=== Upload FAILED ===');
    console.error('Error:', error.message);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Upload failed'
    }, { status: 500 });
  }
}