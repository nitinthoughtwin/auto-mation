import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getChannelInfo } from '@/lib/youtube';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    // Handle OAuth errors
    if (error) {
      console.error('YouTube OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/connect-youtube?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/connect-youtube?error=no_code', request.url)
      );
    }

    // Parse state to get userId
    let userId: string | null = null;
    if (stateParam) {
      try {
        const state = JSON.parse(stateParam);
        userId = state.userId;
      } catch {
        // Invalid state, continue without userId
      }
    }

    // Exchange code for tokens
    console.log('[YouTube OAuth] Exchanging code for tokens...');
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/connect-youtube?error=missing_access_token', request.url)
      );
    }

    // Get channel info from YouTube
    console.log('[YouTube OAuth] Fetching channel info...');
    const channelInfo = await getChannelInfo(
      tokens.access_token,
      tokens.refresh_token || ''
    );

    if (!channelInfo.id) {
      return NextResponse.redirect(
        new URL('/connect-youtube?error=no_channel_found', request.url)
      );
    }

    console.log('[YouTube OAuth] Channel found:', channelInfo.title);

    // Check if channel already exists
    const existingChannel = await db.channel.findUnique({
      where: { youtubeChannelId: channelInfo.id },
    });

    if (existingChannel) {
      // Channel exists - check ownership
      if (userId && existingChannel.userId && existingChannel.userId !== userId) {
        return NextResponse.redirect(
          new URL(`/connect-youtube?error=${encodeURIComponent('This YouTube channel is already connected to another account!')}`, request.url)
        );
      }
      
      // Update existing channel with new tokens
      const updatedChannel = await db.channel.update({
        where: { id: existingChannel.id },
        data: {
          name: channelInfo.title || existingChannel.name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingChannel.refreshToken,
          userId: userId || existingChannel.userId,
          isActive: true,
        },
      });

      console.log('[YouTube OAuth] Channel updated:', updatedChannel.id);

      return NextResponse.redirect(
        new URL(`/connect-youtube?success=${updatedChannel.id}&name=${encodeURIComponent(updatedChannel.name)}`, request.url)
      );
    }

    // Create new channel
    const channel = await db.channel.create({
      data: {
        userId: userId,
        name: channelInfo.title || 'Unknown Channel',
        youtubeChannelId: channelInfo.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        uploadTime: '18:00',
        frequency: 'daily',
        isActive: true,
      },
    });

    console.log('[YouTube OAuth] New channel created:', channel.id);

    return NextResponse.redirect(
      new URL(`/connect-youtube?success=${channel.id}&name=${encodeURIComponent(channel.name)}`, request.url)
    );
  } catch (error: any) {
    console.error('[YouTube OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL(`/connect-youtube?error=${encodeURIComponent(error.message || 'Unknown error')}`, request.url)
    );
  }
}