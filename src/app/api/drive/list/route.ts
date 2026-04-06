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

// Fetch all pages from Drive API using nextPageToken
async function fetchAllPages(baseUrl: string, accessToken: string): Promise<{ items: any[]; status: number }> {
  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = pageToken ? `${baseUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
    const res = await makeDriveRequest(url, accessToken);

    if (!res.ok) {
      return { items, status: res.status };
    }

    const data = await res.json();
    if (data.files) items.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { items, status: 200 };
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
    const parentQuery = folderId ? `'${folderId}'` : "'root'";

    const foldersUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`)}&fields=nextPageToken,files(id,name)&orderBy=name&pageSize=1000`;
    const filesUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`${parentQuery} in parents and trashed = false and mimeType contains 'video/'`)}&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink,createdTime,webViewLink)&orderBy=name&pageSize=1000`;

    // Try to get folders and files (all pages)
    let foldersResult = await fetchAllPages(foldersUrl, accessToken);
    let filesResult = await fetchAllPages(filesUrl, accessToken);

    // If unauthorized, try to refresh token
    if (foldersResult.status === 401 || filesResult.status === 401) {
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
        foldersResult = await fetchAllPages(foldersUrl, accessToken);
        filesResult = await fetchAllPages(filesUrl, accessToken);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json({
          error: 'Google Drive access expired. Please reconnect your channel.',
          needsReconnect: true
        }, { status: 401 });
      }
    }

    if (foldersResult.status !== 200 || filesResult.status !== 200) {
      console.error('Drive API error:', { foldersStatus: foldersResult.status, filesStatus: filesResult.status });
      return NextResponse.json({ error: 'Failed to access Google Drive' }, { status: 500 });
    }

    console.log('Drive list success:', {
      folders: foldersResult.items.length,
      files: filesResult.items.length
    });

    return NextResponse.json({
      folders: foldersResult.items,
      files: filesResult.items,
    });

  } catch (error: any) {
    console.error('Drive list error:', error);
    return NextResponse.json({ 
      error: 'Failed to list Drive contents',
      details: error.message || String(error) 
    }, { status: 500 });
  }
}
