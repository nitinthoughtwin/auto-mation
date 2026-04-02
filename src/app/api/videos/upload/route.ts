import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/youtube';
import { uploadToGoogleDrive } from '@/lib/google-drive';
import { getUserPlanAndUsage, checkVideoLimit, checkStorageLimit } from '@/lib/plan-limits';

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

    // Verify channel exists and belongs to authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const channel = await db.channel.findFirst({
      where: { id: channelId, userId: session.user.id },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Enforce plan limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);

      // Check video count limit
      const videoCheck = checkVideoLimit(limits, usage, files.length);
      if (!videoCheck.allowed) {
        return NextResponse.json({ success: false, error: videoCheck.message, limitExceeded: 'videos' }, { status: 403 });
      }

      // Check per-file size and total storage
      for (const file of files) {
        const storageCheck = checkStorageLimit(limits, usage, file.size);
        if (!storageCheck.allowed) {
          return NextResponse.json({ success: false, error: storageCheck.message, limitExceeded: 'storage' }, { status: 403 });
        }
      }
    } catch {
      // If no subscription found, proceed — free tier still gets some access
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

      // Create video record in database with all Drive info
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
          driveFileId: driveResult.id, // Google Drive file ID
          driveWebViewLink: `https://drive.google.com/file/d/${driveResult.id}/view`,
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
