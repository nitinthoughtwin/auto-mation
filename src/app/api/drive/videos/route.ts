import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// List videos in a Google Drive folder
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const folderId = searchParams.get('folderId');
    const pageToken = searchParams.get('pageToken');
    const searchQuery = searchParams.get('q'); // Optional search query

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

    // Build query for video files
    let query = 'trashed=false';
    
    // Video MIME types
    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-matroska',
      'video/webm',
      'video/mpeg',
      'video/3gpp',
      'video/x-flv'
    ].join(' or ');

    query += ` and (${videoMimeTypes.split(' or ').map(t => `mimeType='${t.trim()}'`).join(' or ')})`;
    
    // If folder specified, search in that folder
    if (folderId && folderId !== 'root') {
      query += ` and '${folderId}' in parents`;
    }

    // Add search query if provided
    if (searchQuery) {
      query += ` and name contains '${searchQuery}'`;
    }

    // Call Google Drive API
    let url = 'https://www.googleapis.com/drive/v3/files?';
    url += `q=${encodeURIComponent(query)}`;
    url += '&fields=nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,webContentLink)';
    url += '&pageSize=50';
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
      console.error('[Drive Videos] Error:', error);
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your channel.',
          needsReconnect: true 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to fetch videos' 
      }, { status: 500 });
    }

    const data = await response.json();

    // Check which videos are already mapped
    const driveFileIds = (data.files || []).map((f: any) => f.id);
    const existingMappings = await db.driveVideo.findMany({
      where: {
        driveFileId: { in: driveFileIds }
      }
    });

    const mappedIds = new Set(existingMappings.map(m => m.driveFileId));

    // Add mapping status to each video
    const videos = (data.files || []).map((file: any) => ({
      ...file,
      isMapped: mappedIds.has(file.id),
      thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`
    }));
    
    return NextResponse.json({
      videos,
      nextPageToken: data.nextPageToken,
      total: videos.length
    });

  } catch (error: any) {
    console.error('[Drive Videos] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}