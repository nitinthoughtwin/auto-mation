import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getAllChannels } from '@/lib/youtube';
import { savePendingSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';
import { connectChannel } from '@/lib/youtube-connect';

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
        const state = JSON.parse(decodeURIComponent(stateParam));
        userId = state.userId;
      } catch {
        // Invalid state — continue without userId
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

    // Fetch all channels for this Google account
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

    // Single channel — connect directly, no picker needed
    if (channels.length === 1) {
      return connectChannel({
        channelInfo: channels[0],
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        userId,
        request,
      });
    }

    // Multiple channels — store in Redis and redirect to picker
    console.log(`[YouTube OAuth] ${channels.length} channels found, redirecting to picker`);

    const sessionId = await savePendingSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      channels,
      userId,
    });

    const response = NextResponse.redirect(new URL('/connect-youtube/select', request.url));
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
