import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';
import { uploadToGoogleDrive } from '@/lib/google-drive';

// Configure for large file handling
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// POST - Bulk video upload to Google Drive
export async function POST(request: NextRequest) {
  try {
    console.log('=== Video Upload to Google Drive ===');
    
    const formData = await request.formData();
    const channelId = formData.get('channelId') as string;
    const defaultTitle = formData.get('defaultTitle') as string;
    const defaultDescription = formData.get('defaultDescription') as string;
    const defaultTags = formData.get('defaultTags') as string;
    const files = formData.getAll('files') as File[];

    console.log('Channel ID:', channelId);
    console.log('Files count:', files?.length || 0);

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
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

    const uploadedVideos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Upload to Google Drive
      const driveResult = await uploadToGoogleDrive(
        accessToken,
        refreshToken,
        file,
        'youtube-uploads'
      );

      console.log('Google Drive upload result:', driveResult);

      // Generate title - use default or filename
      const fileExtension = file.name.split('.').pop() || '';
      const title = defaultTitle 
        ? `${defaultTitle} ${files.length > 1 ? `(${i + 1})` : ''}`
        : file.name.replace(`.${fileExtension}`, '');

      // Create video record in database - store full Google Drive URL
      const video = await db.video.create({
        data: {
          channelId,
          title,
          description: defaultDescription || '',
          tags: defaultTags || '',
          fileName: driveResult.url, // Full Google Drive URL for download
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'queued',
        },
      });

      uploadedVideos.push(video);
    }

    console.log(`=== Upload Complete: ${uploadedVideos.length} videos ===`);

    return NextResponse.json({ 
      success: true,
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      videos: uploadedVideos,
    });
  } catch (error: any) {
    console.error('=== Upload FAILED ===');
    console.error('Error:', error.message);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload videos' },
      { status: 500 }
    );
  }
}