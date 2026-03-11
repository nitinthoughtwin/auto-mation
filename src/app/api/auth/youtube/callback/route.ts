import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getChannelInfo } from '@/lib/youtube';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

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

    // Save or update channel in database
    const channel = await prisma.channel.upsert({
      where: { youtubeChannelId: channelInfo.id! },
      update: {
        name: channelInfo.title || 'Unknown Channel',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      },
      create: {
        name: channelInfo.title || 'Unknown Channel',
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
