import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getAllChannels } from '@/lib/youtube';
import { db } from '@/lib/db';
import { savePendingSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    if (error) {
      console.error('[YouTube OAuth] Error from Google:', error);
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
    console.log('[YouTube OAuth] Fetching channels...');
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

    // Single channel — connect directly
    if (channels.length === 1) {
      return connectChannel({
        channelInfo: channels[0],
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        userId,
        request,
      });
    }

    // Multiple channels — save session to Redis, pass ID via cookie
    console.log(`[YouTube OAuth] ${channels.length} channels found, redirecting to picker`);

    const sessionId = await savePendingSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      channels,
      userId,
    });

    const selectUrl = new URL('/connect-youtube/select', request.url);
    const response = NextResponse.redirect(selectUrl);
    response.cookies.set(PENDING_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('[YouTube OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL(`/connect-youtube?error=${encodeURIComponent(error.message || 'callback_error')}`, request.url)
    );
  }
}

// Shared: upsert a YouTube channel and redirect to success
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
  const existingChannel = await db.channel.findUnique({
    where: { youtubeChannelId: channelInfo.id },
  });

  if (existingChannel) {
    if (userId && existingChannel.userId && existingChannel.userId !== userId) {
      return NextResponse.redirect(
        new URL(
          `/connect-youtube?error=${encodeURIComponent('This YouTube channel is already connected to another account!')}`,
          request.url
        )
      );
    }

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

    return NextResponse.redirect(
      new URL(
        `/connect-youtube?success=${updated.id}&name=${encodeURIComponent(updated.name)}`,
        request.url
      )
    );
  }

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

  return NextResponse.redirect(
    new URL(
      `/connect-youtube?success=${channel.id}&name=${encodeURIComponent(channel.name)}`,
      request.url
    )
  );
}
