import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// List Google Drive folders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const pageToken = searchParams.get('pageToken');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Get channel's access token
    const channel = await db.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: 'Channel not found or no access token' }, { status: 404 });
    }

    // Call Google Drive API to list folders
    let url = 'https://www.googleapis.com/drive/v3/files?';
    url += 'q=mimeType=\'application/vnd.google-apps.folder\'';
    url += ' and trashed=false';
    url += '&fields=nextPageToken,files(id,name,createdTime,modifiedTime)';
    url += '&pageSize=100';
    url += '&orderBy=name';
    
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${channel.accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Drive API] Error:', error);
      
      // Token might be expired
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your channel.',
          needsReconnect: true 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to fetch folders' 
      }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      folders: data.files || [],
      nextPageToken: data.nextPageToken
    });

  } catch (error: any) {
    console.error('[Drive Folders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
