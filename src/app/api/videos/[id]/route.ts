import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFromGoogleDrive, extractFileIdFromUrl } from '@/lib/google-drive';
import { refreshAccessToken } from '@/lib/youtube';

// GET - Get single video details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

// PUT - Update video details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, tags } = body;

    const video = await db.video.update({
      where: { id },
      data: { title, description, tags },
    });

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE - Delete video from queue and Google Drive
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get video info first
    const video = await db.video.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete from Google Drive if it's stored there
    if (video.fileName && video.channel) {
      try {
        // Refresh token
        let accessToken = video.channel.accessToken;
        try {
          const tokens = await refreshAccessToken(video.channel.refreshToken);
          accessToken = tokens.accessToken;
        } catch (e) {
          console.log('Using existing token for delete');
        }

        // Extract file ID and delete from Google Drive
        const fileId = extractFileIdFromUrl(video.fileName) || video.fileName;
        if (fileId && fileId.length > 20) {
          await deleteFromGoogleDrive(accessToken, video.channel.refreshToken, fileId);
          console.log('[Delete] File deleted from Google Drive:', fileId);
        }
      } catch (deleteError) {
        console.warn('[Delete] Failed to delete from Google Drive (non-critical):', deleteError);
        // Continue with database delete even if Google Drive delete fails
      }
    }

    // Delete from database
    await db.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Video deleted' });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    );
  }
}