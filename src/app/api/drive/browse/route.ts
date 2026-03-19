import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Browse public Google Drive folder
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const channelId = searchParams.get('channelId');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Get channel for access token
    let accessToken: string | null = null;
    if (channelId) {
      const channel = await db.channel.findUnique({
        where: { id: channelId }
      });
      if (channel?.accessToken) {
        accessToken = channel.accessToken;
      }
    }

    // Use Google Drive API to list files
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,createdTime)&orderBy=createdTime desc&pageSize=100`;
    
    const response = await fetch(apiUrl, {
      headers: accessToken ? {
        'Authorization': `Bearer ${accessToken}`
      } : {}
    });

    if (!response.ok) {
      // Try public access
      const publicUrl = `https://drive.google.com/drive/folders/${folderId}`;
      return NextResponse.json({ 
        error: 'Cannot access folder. Make sure folder is public.',
        publicUrl 
      }, { status: 400 });
    }

    const data = await response.json();
    
    // Filter video files
    const videoFiles = (data.files || []).filter((file: any) => 
      file.mimeType?.startsWith('video/')
    );

    return NextResponse.json({
      files: videoFiles.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        thumbnail: file.thumbnailLink || `https://lh3.googleusercontent.com/d/${file.id}=w200-h120-c`,
        createdTime: file.createdTime,
        url: `https://drive.google.com/uc?export=download&id=${file.id}`
      }))
    });

  } catch (error) {
    console.error('Drive browse error:', error);
    return NextResponse.json({ 
      error: 'Failed to browse folder',
      details: String(error) 
    }, { status: 500 });
  }
}