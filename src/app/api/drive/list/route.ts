import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Helper to make Drive API request with auto-refresh
async function makeDriveRequest(url: string, accessToken: string) {
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
}

// List files and folders from user's Google Drive
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const channelId = searchParams.get('channelId');

    console.log('Drive list request:', { folderId, channelId });

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get channel's access token
    const channel = await db.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    let accessToken = channel.accessToken;
    const refreshToken = channel.refreshToken;
    
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ 
        error: 'No access token. Please reconnect your channel.',
        needsReconnect: true 
      }, { status: 401 });
    }

    // Build query - list all folders and video files
    let parentQuery = folderId ? `'${folderId}'` : "'root'";
    
    // Try to get folders and files
    let foldersRes = await makeDriveRequest(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`)}&fields=files(id,name)&orderBy=name&pageSize=100`,
      accessToken
    );

    let filesRes = await makeDriveRequest(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType contains 'video/'`)}&fields=files(id,name,mimeType,size,thumbnailLink,createdTime,webViewLink)&orderBy=name&pageSize=100`,
      accessToken
    );

    // If unauthorized, try to refresh token
    if (foldersRes.status === 401 || filesRes.status === 401) {
      console.log('Token expired, refreshing...');
      
      try {
        const newTokens = await refreshAccessToken(refreshToken);
        accessToken = newTokens.accessToken;

        // Update channel with new token
        await db.channel.update({
          where: { id: channelId },
          data: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          }
        });

        console.log('Token refreshed successfully');

        // Retry with new token
        foldersRes = await makeDriveRequest(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`)}&fields=files(id,name)&orderBy=name&pageSize=100`,
          accessToken
        );

        filesRes = await makeDriveRequest(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType contains 'video/'`)}&fields=files(id,name,mimeType,size,thumbnailLink,createdTime,webViewLink)&orderBy=name&pageSize=100`,
          accessToken
        );
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json({ 
          error: 'Google Drive access expired. Please reconnect your channel.',
          needsReconnect: true 
        }, { status: 401 });
      }
    }

    if (!foldersRes.ok || !filesRes.ok) {
      const foldersError = !foldersRes.ok ? await foldersRes.text() : null;
      const filesError = !filesRes.ok ? await filesRes.text() : null;
      console.error('Drive API error:', { foldersError, filesError });
      
      return NextResponse.json({ error: 'Failed to access Google Drive' }, { status: 500 });
    }

    const foldersData = await foldersRes.json();
    const filesData = await filesRes.json();

    console.log('Drive list success:', { 
      folders: foldersData.files?.length || 0, 
      files: filesData.files?.length || 0 
    });

    return NextResponse.json({
      folders: foldersData.files || [],
      files: filesData.files || []
    });

  } catch (error: any) {
    console.error('Drive list error:', error);
    return NextResponse.json({ 
      error: 'Failed to list Drive contents',
      details: error.message || String(error) 
    }, { status: 500 });
  }
}
