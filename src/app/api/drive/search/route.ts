import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Search all videos in Google Drive (not limited to folder)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const searchQuery = searchParams.get('q');
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

    // Build query for video files
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
    ];

    let query = 'trashed=false';
    
    // Add MIME type filter
    const mimeQuery = videoMimeTypes.map(t => `mimeType='${t}'`).join(' or ');
    query += ` and (${mimeQuery})`;

    // Add search query if provided
    if (searchQuery) {
      query += ` and name contains '${searchQuery}'`;
    }

    // Call Google Drive API
    let url = 'https://www.googleapis.com/drive/v3/files?';
    url += `q=${encodeURIComponent(query)}`;
    url += '&fields=nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,webContentLink,parents)';
    url += '&pageSize=50';
    url += '&orderBy=modifiedTime desc';
    
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
      console.error('[Drive Search] Error:', error);
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Token expired',
          needsReconnect: true 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to search videos' 
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

    // Add mapping status and useful URLs
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
    console.error('[Drive Search] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
