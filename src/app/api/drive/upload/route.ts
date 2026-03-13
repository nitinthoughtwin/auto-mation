import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken, createOAuth2Client } from '@/lib/youtube';
import { google } from 'googleapis';

// Get upload session URL for resumable upload to Google Drive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, filename, fileSize, mimeType } = body;

    if (!channelId || !filename) {
      return NextResponse.json({ error: 'channelId and filename required' }, { status: 400 });
    }

    // Get channel with tokens
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Refresh access token
    let accessToken = channel.accessToken;
    try {
      const tokens = await refreshAccessToken(channel.refreshToken);
      accessToken = tokens.accessToken;
      await db.channel.update({
        where: { id: channel.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: channel.refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get or create YouTube videos folder
    const folderName = 'YouTube Automation Videos';
    let folderId: string;

    const existingFolders = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      folderId = existingFolders.data.files[0].id!;
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folder.data.id!;
    }

    // Create resumable upload session
    const resumableSession = await drive.files.create({
      requestBody: {
        name: `${Date.now()}-${filename}`,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || 'video/mp4',
        body: '', // Empty body to get resumable session URL
      },
      fields: 'id',
    });

    // Alternative: Use direct upload with access token
    // Return the access token and folder ID for client-side upload
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    return NextResponse.json({
      success: true,
      provider: 'google-drive',
      accessToken, // Short-lived access token for client upload
      folderId,
      filename: uniqueFilename,
      uploadUrl: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      instructions: {
        step1: 'POST to uploadUrl with headers: Authorization: Bearer {accessToken}, Content-Type: application/json; charset=UTF-8',
        step2: 'Body: {"name": "' + uniqueFilename + '", "parents": ["' + folderId + '"]}',
        step3: 'Get session URL from Location header',
        step4: 'PUT to session URL with file content',
      },
    });

  } catch (error: any) {
    console.error('Drive upload session error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create upload session'
    }, { status: 500 });
  }
}

// Get storage info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({
        configured: true,
        provider: 'Google Drive',
        freeStorage: '15 GB',
        note: 'Pass channelId to get usage info'
      });
    }

    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Refresh token
    let accessToken = channel.accessToken;
    try {
      const tokens = await refreshAccessToken(channel.refreshToken);
      accessToken = tokens.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: channel.refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const about = await drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;
    const used = parseInt(quota?.usage || '0');
    const limit = parseInt(quota?.limit || '16106127360');

    const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (limit / (1024 * 1024 * 1024)).toFixed(2);
    const availableGB = ((limit - used) / (1024 * 1024 * 1024)).toFixed(2);

    return NextResponse.json({
      configured: true,
      provider: 'Google Drive',
      freeStorage: '15 GB',
      usage: {
        used: `${usedGB} GB`,
        limit: `${limitGB} GB`,
        available: `${availableGB} GB`,
        percentUsed: ((used / limit) * 100).toFixed(1) + '%',
      },
    });

  } catch (error: any) {
    console.error('Drive info error:', error);
    return NextResponse.json({
      configured: true,
      provider: 'Google Drive',
      freeStorage: '15 GB',
      error: error.message
    });
  }
}