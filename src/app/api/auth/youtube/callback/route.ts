import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getAllChannels } from '@/lib/youtube';
import { db } from '@/lib/db';
import { signSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

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

    // Get ALL channels for this Google account
    console.log('[YouTube OAuth] Fetching all channels...');
    let channels: Awaited<ReturnType<typeof getAllChannels>>;
    try {
      channels = await getAllChannels(tokens.access_token, tokens.refresh_token || '');
    } catch (err: any) {
      console.error('[YouTube OAuth] Failed to fetch channels:', err.message);
      return NextResponse.redirect(
        new URL('/connect-youtube?error=no_channel_found', request.url)
      );
    }

    if (!channels.length) {
      return NextResponse.redirect(
        new URL('/connect-youtube?error=no_channel_found', request.url)
      );
    }

    // If only one channel — connect directly (original flow)
    if (channels.length === 1) {
      return connectChannel({
        channelInfo: channels[0],
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        userId,
        request,
      });
    }

    // Multiple channels — store pending session cookie and redirect to channel picker
    console.log(`[YouTube OAuth] Found ${channels.length} channels, redirecting to picker`);

    const sessionToken = signSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      channels,
      userId,
    });

    const selectUrl = new URL('/connect-youtube/select', request.url);
    const response = NextResponse.redirect(selectUrl);
    response.cookies.set(PENDING_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('[YouTube OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL(`/connect-youtube?error=${encodeURIComponent(error.message || 'Unknown error')}`, request.url)
    );
  }
}

// Shared logic: upsert a channel in DB and redirect to success
export async function connectChannel({
  channelInfo,
  accessToken,
  refreshToken,
  userId,
  request,
}: {
  channelInfo: { id: string; title: string; description: string; thumbnail: string | null };
  accessToken: string;
  refreshToken: string;
  userId: string | null;
  request: NextRequest;
}) {
  // Check if channel already exists
  const existingChannel = await db.channel.findUnique({
    where: { youtubeChannelId: channelInfo.id },
  });

  if (existingChannel) {
    // Different user trying to claim the same channel
    if (userId && existingChannel.userId && existingChannel.userId !== userId) {
      return NextResponse.redirect(
        new URL(
          `/connect-youtube?error=${encodeURIComponent('This YouTube channel is already connected to another account!')}`,
          request.url
        )
      );
    }

    // Update tokens for existing channel
    const updated = await db.channel.update({
      where: { id: existingChannel.id },
      data: {
        name: channelInfo.title || existingChannel.name,
        accessToken,
        refreshToken: refreshToken || existingChannel.refreshToken,
        userId: userId || existingChannel.userId,
        isActive: true,
      },
    });

    console.log('[YouTube OAuth] Channel updated:', updated.id);
    return NextResponse.redirect(
      new URL(
        `/connect-youtube?success=${updated.id}&name=${encodeURIComponent(updated.name)}`,
        request.url
      )
    );
  }

  // Create new channel
  const channel = await db.channel.create({
    data: {
      userId,
      name: channelInfo.title || 'Unknown Channel',
      youtubeChannelId: channelInfo.id,
      accessToken,
      refreshToken,
      uploadTime: '18:00',
      frequency: 'daily',
      isActive: true,
    },
  });

  console.log('[YouTube OAuth] New channel created:', channel.id);
  return NextResponse.redirect(
    new URL(
      `/connect-youtube?success=${channel.id}&name=${encodeURIComponent(channel.name)}`,
      request.url
    )
  );
}
