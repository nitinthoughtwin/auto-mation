import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// List videos from Google Drive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, pageToken, pageSize = 50 } = body;

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Get channel with access token
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Refresh token if needed (using YouTube refresh mechanism)
    let accessToken = channel.accessToken;

    // List video files from Google Drive
    const driveUrl = new URL('https://www.googleapis.com/drive/v3/files');
    driveUrl.searchParams.set('pageSize', String(pageSize));
    driveUrl.searchParams.set('fields', 'nextPageToken, files(id, name, size, mimeType, createdTime, thumbnailLink, webContentLink)');
    driveUrl.searchParams.set('q', "mimeType contains 'video/' and trashed = false");
    driveUrl.searchParams.set('orderBy', 'createdTime desc');

    if (pageToken) {
      driveUrl.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(driveUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Drive API error:', error);

      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Token expired. Please reconnect your channel.', needReconnect: true },
          { status: 401 }
        );
      }

      throw new Error(error.error?.message || 'Failed to fetch from Google Drive');
    }

    const data = await response.json();

    // Filter only video files
    const videos = (data.files || []).filter((file: any) =>
      file.mimeType?.startsWith('video/')
    ).map((file: any) => ({
      id: file.id,
      name: file.name,
      size: parseInt(file.size || '0'),
      mimeType: file.mimeType,
      createdTime: file.createdTime,
      thumbnailUrl: file.thumbnailLink,
      downloadUrl: file.webContentLink,
      driveUrl: `https://drive.google.com/file/d/${file.id}/view`,
    }));

    return NextResponse.json({
      success: true,
      videos,
      nextPageToken: data.nextPageToken,
      totalResults: videos.length,
    });

  } catch (error: any) {
    console.error('Drive list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list videos' },
      { status: 500 }
    );
  }
}