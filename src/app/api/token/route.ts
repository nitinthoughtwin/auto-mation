import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';

// Configure for dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get access token for Google Drive upload
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');

    console.log('=== GET Token Request ===');
    console.log('Channel ID:', channelId);

    if (!channelId) {
      return NextResponse.json({ 
        success: false,
        error: 'Channel ID is required' 
      }, { status: 400 });
    }

    // Get channel with tokens
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ 
        success: false,
        error: 'Channel not found' 
      }, { status: 404 });
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
      console.log('Access token refreshed');
    } catch (e) {
      console.log('Using existing token');
    }

    // Return access token for direct upload
    return NextResponse.json({
      success: true,
      accessToken,
    });
  } catch (error: any) {
    console.error('GET token error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}