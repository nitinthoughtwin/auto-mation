import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getAllChannels, getGoogleAccountId } from '@/lib/youtube';
import { db } from '@/lib/db';
import { signSession, PENDING_SESSION_COOKIE } from '@/lib/pending-session';

function redirectError(base: string, msg: string) {
  return NextResponse.redirect(`${base}/connect-youtube?error=${encodeURIComponent(msg)}`);
}

function redirectSuccess(base: string, id: string, name: string) {
  return NextResponse.redirect(`${base}/dashboard?connected=${id}&name=${encodeURIComponent(name)}`);
}

function getBase(request: NextRequest) {
  // Use NEXTAUTH_URL if set (avoids proxy/header issues in production)
  return process.env.NEXTAUTH_URL?.replace(/\/$/, '') || new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const base = getBase(request);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    const stateParam = searchParams.get('state');

    if (oauthError) {
      return redirectError(base, oauthError);
    }
    if (!code) {
      return redirectError(base, 'no_code');
    }

    // Parse userId from state
    let userId: string | null = null;
    if (stateParam) {
      try {
        userId = JSON.parse(decodeURIComponent(stateParam)).userId ?? null;
      } catch {
        try {
          userId = JSON.parse(stateParam).userId ?? null;
        } catch { /* ignore */ }
      }
    }

    // Exchange code for tokens
    let tokens: Awaited<ReturnType<typeof getTokensFromCode>>;
    try {
      tokens = await getTokensFromCode(code);
    } catch (e: any) {
      console.error('[YT Callback] Token exchange failed:', e.message);
      return redirectError(base, 'token_exchange_failed');
    }

    if (!tokens.access_token) {
      return redirectError(base, 'missing_access_token');
    }

    // Get stable Google account ID — used to sync tokens across sibling channels
    const googleAccountId = await getGoogleAccountId(tokens.access_token);

    // Fetch all channels for this Google account
    let channels: Awaited<ReturnType<typeof getAllChannels>>;
    try {
      channels = await getAllChannels(tokens.access_token, tokens.refresh_token || '');
    } catch (e: any) {
      console.error('[YT Callback] getAllChannels failed:', e.message);
      return redirectError(base, 'no_channel_found');
    }

    if (!channels.length) {
      return redirectError(base, 'no_channel_found');
    }

    // Single channel — connect directly
    if (channels.length === 1) {
      return await upsertChannel({
        base,
        channelInfo: channels[0],
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        userId,
        googleAccountId,
      });
    }

    // Multiple channels — sign a cookie and redirect to picker
    const signed = signSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      channels,
      userId,
      googleAccountId,
    });

    const response = NextResponse.redirect(`${base}/connect-youtube/select`);
    response.cookies.set(PENDING_SESSION_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    return response;

  } catch (e: any) {
    console.error('[YT Callback] Unhandled error:', e);
    return redirectError(base, e.message || 'unknown_error');
  }
}

// Upsert a channel in DB — returns a redirect response
async function upsertChannel({
  base,
  channelInfo,
  accessToken,
  refreshToken,
  userId,
  googleAccountId,
}: {
  base: string;
  channelInfo: { id: string; title: string; description: string; thumbnail: string | null };
  accessToken: string;
  refreshToken: string;
  userId: string | null;
  googleAccountId?: string | null;
}) {
  try {
    const existing = await db.channel.findUnique({
      where: { youtubeChannelId: channelInfo.id },
    });

    if (existing) {
      if (userId && existing.userId && existing.userId !== userId) {
        return redirectError(base, 'This YouTube channel is already connected to another account!');
      }
      const updated = await db.channel.update({
        where: { id: existing.id },
        data: {
          name: channelInfo.title || existing.name,
          accessToken,
          refreshToken: refreshToken || existing.refreshToken,
          userId: userId || existing.userId,
          googleAccountId: googleAccountId || existing.googleAccountId,
          isActive: true,
        },
      });

      // Sync the new refresh token to all sibling channels sharing the same Google account.
      // When Google issues a new refresh token, the old one is invalidated — so all channels
      // connected from the same Google account must use the latest token.
      if (googleAccountId && refreshToken) {
        await db.channel.updateMany({
          where: {
            googleAccountId,
            id: { not: updated.id },
          },
          data: { accessToken, refreshToken },
        });
      }

      return redirectSuccess(base, updated.id, updated.name);
    }

    const created = await db.channel.create({
      data: {
        userId,
        name: channelInfo.title || 'Unknown Channel',
        youtubeChannelId: channelInfo.id,
        googleAccountId,
        accessToken,
        refreshToken,
        uploadTime: '18:00',
        frequency: 'daily',
        isActive: true,
      },
    });

    // Sync tokens to any existing sibling channels from same Google account
    if (googleAccountId && refreshToken) {
      await db.channel.updateMany({
        where: {
          googleAccountId,
          id: { not: created.id },
        },
        data: { accessToken, refreshToken },
      });
    }

    return redirectSuccess(base, created.id, created.name);

  } catch (e: any) {
    console.error('[YT Callback] upsertChannel failed:', e.message);
    return redirectError(base, e.message || 'db_error');
  }
}
