import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// POST - Bulk video upload with optional thumbnails
export async function POST(request: NextRequest) {
  try {
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

    // Create upload directories if they don't exist
    const videoUploadDir = path.join(process.cwd(), 'uploads', 'videos');
    const thumbnailUploadDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    
    if (!fs.existsSync(videoUploadDir)) {
      fs.mkdirSync(videoUploadDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailUploadDir)) {
      fs.mkdirSync(thumbnailUploadDir, { recursive: true });
    }

    const uploadedVideos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Generate unique filename for video
      const fileExtension = path.extname(file.name);
      const uniqueFileName = `${randomUUID()}${fileExtension}`;
      const filePath = path.join(videoUploadDir, uniqueFileName);

      // Convert File to Buffer and save video
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      // Handle thumbnail (optional)
      let thumbnailName: string | null = null;
      let thumbnailOriginalName: string | null = null;
      let thumbnailSize: number | null = null;

      // Check if there's a thumbnail for this video (by index) or a shared thumbnail (index 0)
      const thumbnailFile = thumbnails[i] || (thumbnails.length === 1 && files.length > 1 ? thumbnails[0] : null);
      
      if (thumbnailFile && thumbnailFile.size > 0) {
        const thumbnailExtension = path.extname(thumbnailFile.name) || '.jpg';
        const uniqueThumbnailName = `${randomUUID()}${thumbnailExtension}`;
        const thumbnailPath = path.join(thumbnailUploadDir, uniqueThumbnailName);

        // Convert and save thumbnail
        const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
        fs.writeFileSync(thumbnailPath, thumbnailBuffer);

        thumbnailName = uniqueThumbnailName;
        thumbnailOriginalName = thumbnailFile.name;
        thumbnailSize = thumbnailFile.size;
      }

      // Generate title - use default or filename
      const title = defaultTitle 
        ? `${defaultTitle} ${files.length > 1 ? `(${i + 1})` : ''}`
        : path.basename(file.name, fileExtension);

      // Create video record in database
      const video = await db.video.create({
        data: {
          channelId,
          title,
          description: defaultDescription || '',
          tags: defaultTags || '',
          fileName: uniqueFileName,
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

    return NextResponse.json({ 
      success: true,
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      videos: uploadedVideos,
    });
  } catch (error: any) {
    console.error('Error uploading videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload videos' },
      { status: 500 }
    );
  }
}