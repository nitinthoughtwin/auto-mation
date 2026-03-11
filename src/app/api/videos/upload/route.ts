import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
  isVercel, 
  saveFile, 
  getStorageStatus 
} from '@/lib/storage';

// POST - Bulk video upload with optional thumbnails
export async function POST(request: NextRequest) {
  try {
    // Check storage status
    const storageStatus = getStorageStatus();
    
    const formData = await request.formData();
    const channelId = formData.get('channelId') as string;
    const defaultTitle = formData.get('defaultTitle') as string;
    const defaultDescription = formData.get('defaultDescription') as string;
    const defaultTags = formData.get('defaultTags') as string;
    const files = formData.getAll('files') as File[];
    const thumbnails = formData.getAll('thumbnails') as File[];

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    const uploadedVideos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Save video file using storage utility
      const videoResult = await saveFile(file, 'videos');
      
      // Handle thumbnail (optional)
      let thumbnailName: string | null = null;
      let thumbnailOriginalName: string | null = null;
      let thumbnailSize: number | null = null;

      const thumbnailFile = thumbnails[i] || (thumbnails.length === 1 && files.length > 1 ? thumbnails[0] : null);
      
      if (thumbnailFile && thumbnailFile.size > 0) {
        const thumbResult = await saveFile(thumbnailFile, 'thumbnails');
        thumbnailName = thumbResult.fileName;
        thumbnailOriginalName = thumbResult.originalName;
        thumbnailSize = thumbResult.size;
      }

      // Generate title - use default or filename
      const fileExtension = file.name.includes('.') 
        ? '.' + file.name.split('.').pop() 
        : '';
      const title = defaultTitle 
        ? `${defaultTitle} ${files.length > 1 ? `(${i + 1})` : ''}`
        : file.name.replace(fileExtension, '');

      // Create video record in database
      const video = await db.video.create({
        data: {
          channelId,
          title,
          description: defaultDescription || '',
          tags: defaultTags || '',
          fileName: videoResult.url || videoResult.fileName, // Store URL if blob, else filename
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          thumbnailName,
          thumbnailOriginalName,
          thumbnailSize,
          status: 'queued',
        },
      });

      uploadedVideos.push(video);
    }

    const response: any = { 
      success: true,
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      videos: uploadedVideos,
      storage: storageStatus,
    };

    if (storageStatus.warning) {
      response.warning = storageStatus.warning;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error uploading videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload videos' },
      { status: 500 }
    );
  }
}