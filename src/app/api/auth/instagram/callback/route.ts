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

  console.log('[Instagram Callback] Starting...');

  if (error) {
    console.error('[Instagram Callback] OAuth Error:', error, errorDescription);
    return NextResponse.redirect(
      `${APP_URL}/dashboard?error=${encodeURIComponent(errorDescription || error)}`
    );
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

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Token exchange failed');
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token);
    console.log('[Instagram Callback] Long-lived token received');

    // Step 3: Get Facebook Pages with Instagram accounts
    const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}');
    pagesUrl.searchParams.set('access_token', longLivedToken);

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();

    console.log('[Instagram Callback] Pages found:', pagesData.data?.length || 0);

    let savedCount = 0;

    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        if (!page.instagram_business_account) continue;

        const igAccount = page.instagram_business_account;
        const pageAccessToken = page.access_token;

        console.log('[Instagram Callback] IG Account:', igAccount.username || igAccount.id);

        const existing = await db.channel.findFirst({
          where: { instagramAccountId: igAccount.id },
        });

        if (existing) {
          await db.channel.update({
            where: { id: existing.id },
            data: {
              userId: userId || existing.userId,
              accessToken: pageAccessToken,
              refreshToken: longLivedToken,
              name: igAccount.username || existing.name,
              isActive: true,
            },
          });
        } else {
          await db.channel.create({
            data: {
              userId: userId || null,
              name: igAccount.username || page.name || 'Instagram Account',
              platform: 'instagram',
              instagramAccountId: igAccount.id,
              facebookPageId: page.id,
              facebookPageName: page.name,
              accessToken: pageAccessToken,
              refreshToken: longLivedToken,
              uploadTime: '18:00',
              frequency: 'daily',
              isActive: true,
              privacyStatus: 'public',
            },
          });
        }
        savedCount++;
      }
    }

    console.log(`[Instagram Callback] Saved ${savedCount} Instagram accounts`);

    if (savedCount === 0) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?warning=${encodeURIComponent(
          'No Instagram Business account found. Make sure your Instagram is connected to a Facebook Page and is a Business/Creator account.'
        )}`
      );
    }

    return NextResponse.redirect(`${APP_URL}/dashboard?instagram=connected`);

  } catch (err: any) {
    console.error('[Instagram Callback] Exception:', err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard?error=${encodeURIComponent(err.message || 'Instagram connection failed')}`
    );
  }
}
