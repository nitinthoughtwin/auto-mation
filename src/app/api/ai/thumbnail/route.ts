import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { refreshAccessToken } from '@/lib/youtube';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Upload buffer to Google Drive helper
async function uploadBufferToGoogleDrive(
  accessToken: string,
  buffer: Buffer,
  filename: string,
  mimeType: string = 'image/png'
): Promise<{ id: string; url: string }> {
  // Create file metadata
  const metadata = {
    name: filename,
    mimeType: mimeType,
  };

  // Use resumable upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    throw new Error('Failed to initialize Google Drive upload');
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Google Drive');
  }

  // Upload the buffer
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const error = await uploadRes.text();
    throw new Error(`Google Drive upload failed: ${error}`);
  }

  const result = await uploadRes.json();
  const fileId = result.id;

  // Make file public
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  return {
    id: fileId,
    url: `https://drive.google.com/uc?export=download&id=${fileId}`,
  };
}

// Generate AI thumbnail for video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, channelId, videoTitle } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for thumbnail generation' },
        { status: 400 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    console.log('=== AI Thumbnail Generation ===');
    console.log('Prompt:', prompt);
    console.log('Channel ID:', channelId);
    console.log('Video Title:', videoTitle);

    // Get channel for access token
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
    try {
      const tokens = await refreshAccessToken(channel.refreshToken);
      accessToken = tokens.accessToken;
      await db.channel.update({
        where: { id: channelId },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (e) {
      console.log('Using existing token');
    }

    // Initialize AI
    const zai = await ZAI.create();

    // Enhance prompt for thumbnail
    const enhancedPrompt = `YouTube video thumbnail, ${prompt}, eye-catching, vibrant colors, professional quality, 1280x720 aspect ratio, bold text readable, no blur, high contrast`;

    console.log('Enhanced prompt:', enhancedPrompt);

    // Generate image
    const response = await zai.images.generations.create({
      prompt: enhancedPrompt,
      size: '1344x768', // Landscape, close to 16:9
    });

    const imageBase64 = response.data[0].base64;

    if (!imageBase64) {
      throw new Error('No image generated');
    }

    console.log('Image generated, size:', imageBase64.length);

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Upload to Google Drive
    console.log('Uploading to Google Drive...');
    const timestamp = Date.now();
    const filename = `ai-thumbnail-${timestamp}.png`;
    
    const driveResult = await uploadBufferToGoogleDrive(
      accessToken,
      buffer,
      filename,
      'image/png'
    );

    console.log('Upload result:', driveResult);

    return NextResponse.json({
      success: true,
      thumbnailUrl: driveResult.url,
      thumbnailFileId: driveResult.id,
      thumbnailName: filename,
      prompt: enhancedPrompt,
    });

  } catch (error: any) {
    console.error('AI Thumbnail Generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Thumbnail generation failed' },
      { status: 500 }
    );
  }
}