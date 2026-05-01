import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLongLivedToken } from '@/lib/instagram';

const FACEBOOK_APP_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const FACEBOOK_APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const userId = searchParams.get('state') || '';

  console.log('[IG-CB] Starting, userId:', userId || 'none');

  if (error) {
    console.error('[IG-CB] OAuth Error:', error, errorDescription);
    return NextResponse.redirect(`${APP_URL}/dashboard?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_authorization_code`);
  }

  try {
    // Step 1: Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    console.log('[IG-CB] Token exchange:', tokenData.error ? `ERROR: ${tokenData.error.message}` : 'OK');

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Token exchange failed');
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token);
    console.log('[IG-CB] Long-lived token: OK');

    let savedCount = 0;

    // Approach A: Facebook Pages — try short-lived token first, then long-lived
    try {
      const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
      pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}');
      // Try short-lived token first (sometimes has more page permissions)
      pagesUrl.searchParams.set('access_token', tokenData.access_token);
      pagesUrl.searchParams.set('limit', '25');

      const pagesRes = await fetch(pagesUrl.toString(), { signal: AbortSignal.timeout(15000) });
      const pagesData = await pagesRes.json();

      // If short-lived returns 0, retry with long-lived token
      if ((!pagesData.data || pagesData.data.length === 0) && !pagesData.error) {
        pagesUrl.searchParams.set('access_token', longLivedToken);
        const retryRes = await fetch(pagesUrl.toString(), { signal: AbortSignal.timeout(15000) });
        const retryData = await retryRes.json();
        if (retryData.data?.length > 0) {
          Object.assign(pagesData, retryData);
          console.log('[IG-CB] Pages found with long-lived token');
        }
      }
      console.log('[IG-CB] Pages count:', pagesData.data?.length ?? 0, '| error:', pagesData.error?.message ?? 'none');

      if (pagesData.data?.length > 0) {
        for (const page of pagesData.data) {
          const igAcc = page.instagram_business_account;
          console.log(`[IG-CB] Page "${page.name}": IG=${igAcc?.username ?? 'none'}`);
          if (!igAcc) continue;

          savedCount += await saveInstagramChannel(igAcc, page.access_token, longLivedToken, userId, page.id, page.name);
        }
      }
    } catch (e: any) {
      console.error('[IG-CB] Pages fetch error:', e.message);
    }

    // Approach B: Try fetching Instagram account directly from user token (for Creator accounts)
    if (savedCount === 0) {
      try {
        const meUrl = new URL('https://graph.facebook.com/v19.0/me');
        meUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username,profile_picture_url,followers_count}');
        meUrl.searchParams.set('access_token', longLivedToken);

        const meRes = await fetch(meUrl.toString(), { signal: AbortSignal.timeout(10000) });
        const meData = await meRes.json();
        console.log('[IG-CB] Direct me IG:', JSON.stringify(meData.instagram_business_account ?? 'none'));

        if (meData.instagram_business_account) {
          savedCount += await saveInstagramChannel(
            meData.instagram_business_account,
            longLivedToken,
            longLivedToken,
            userId,
            null,
            meData.name
          );
        }
      } catch (e: any) {
        console.error('[IG-CB] Direct me fetch error:', e.message);
      }
    }

    // Approach C: Try /me/instagram_accounts endpoint
    if (savedCount === 0) {
      try {
        const igAccUrl = new URL('https://graph.facebook.com/v19.0/me/instagram_accounts');
        igAccUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count');
        igAccUrl.searchParams.set('access_token', longLivedToken);

        const igAccRes = await fetch(igAccUrl.toString(), { signal: AbortSignal.timeout(10000) });
        const igAccData = await igAccRes.json();
        console.log('[IG-CB] /me/instagram_accounts:', JSON.stringify(igAccData));

        if (igAccData.data?.length > 0) {
          for (const igAcc of igAccData.data) {
            savedCount += await saveInstagramChannel(igAcc, longLivedToken, longLivedToken, userId, null, igAcc.username);
          }
        }
      } catch (e: any) {
        console.error('[IG-CB] instagram_accounts fetch error:', e.message);
      }
    }

    console.log('[IG-CB] Total saved:', savedCount);

    if (savedCount === 0) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?warning=${encodeURIComponent(
          'No Instagram Business/Creator account found. Connect your Instagram to a Facebook Page in Meta Business Suite.'
        )}`
      );
    }

    return NextResponse.redirect(`${APP_URL}/dashboard?instagram=connected`);

  } catch (err: any) {
    console.error('[IG-CB] Exception:', err.message);
    return NextResponse.redirect(`${APP_URL}/dashboard?error=${encodeURIComponent(err.message || 'Instagram connection failed')}`);
  }
}

async function saveInstagramChannel(
  igAccount: any,
  accessToken: string,
  refreshToken: string,
  userId: string,
  facebookPageId: string | null,
  facebookPageName: string | null
): Promise<number> {
  try {
    const existing = await db.channel.findFirst({
      where: { instagramAccountId: igAccount.id },
    });

    if (existing) {
      await db.channel.update({
        where: { id: existing.id },
        data: {
          userId: userId || existing.userId,
          accessToken,
          refreshToken,
          name: igAccount.username || existing.name,
          isActive: true,
        },
      });
      console.log('[IG-CB] Updated existing channel:', igAccount.username);
    } else {
      await db.channel.create({
        data: {
          userId: userId || null,
          name: igAccount.username || facebookPageName || 'Instagram Account',
          platform: 'instagram',
          instagramAccountId: igAccount.id,
          facebookPageId: facebookPageId ?? undefined,
          facebookPageName: facebookPageName ?? undefined,
          accessToken,
          refreshToken,
          uploadTime: '18:00',
          frequency: 'daily',
          isActive: true,
          privacyStatus: 'public',
        },
      });
      console.log('[IG-CB] Created new channel:', igAccount.username);
    }
    return 1;
  } catch (e: any) {
    console.error('[IG-CB] Save error:', e.message);
    return 0;
  }
}
