import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getChannelInfo } from '@/lib/youtube';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // userId passed as state

    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=no_code', request.url)
      );
    }

    // Get current user from JWT token
    const token = await getToken({ 
      req: request as any, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    const userId = token?.id || state || null;

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/?error=missing_tokens', request.url)
      );
    }

    // Get channel info from YouTube
    const channelInfo = await getChannelInfo(
      tokens.access_token,
      tokens.refresh_token
    );

    // Check if channel already exists
    const existingChannel = await db.channel.findUnique({
      where: { youtubeChannelId: channelInfo.id! },
    });

    if (existingChannel) {
      // Check if this user owns it
      if (existingChannel.userId === userId) {
        // Update tokens
        await db.channel.update({
          where: { id: existingChannel.id },
          data: {
            name: channelInfo.title || existingChannel.name,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          },
        });
        return NextResponse.redirect(
          new URL(`/?connected=${existingChannel.id}`, request.url)
        );
      } else {
        // Channel belongs to different user
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent('This YouTube channel is already connected to another account.')}`, request.url)
        );
      }
    }

    // Create new channel
    const channel = await db.channel.create({
      data: {
        userId: userId,
        name: channelInfo.title || 'Unknown Channel',
        platform: 'youtube',
        youtubeChannelId: channelInfo.id!,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        uploadTime: '18:00',
        frequency: 'daily',
        isActive: true,
      },
    });

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      new URL(`/?connected=${channel.id}`, request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}