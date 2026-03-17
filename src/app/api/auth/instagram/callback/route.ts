import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FACEBOOK_APP_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const FACEBOOK_APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'https://www.gpmart.in/api/auth/instagram/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '';
  const error = searchParams.get('error');

  console.log('[Instagram Callback] Code:', code ? 'received' : 'missing');
  console.log('[Instagram Callback] State:', state);

  if (error) {
    console.error('[Instagram Callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, 'https://www.gpmart.in')
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', 'https://www.gpmart.in')
    );
  }

  try {
    // Step 1: Exchange code for access token
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

    const accessToken = tokenData.access_token;

    // Step 2: Get long-lived access token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
    longLivedUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
    longLivedUrl.searchParams.set('fb_exchange_token', accessToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();
    const finalToken = longLivedData.access_token || accessToken;

    // Step 3: Get Facebook Pages with Instagram Business Accounts
    const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    pagesUrl.searchParams.set('access_token', finalToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,name}');

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Pages found. Create a Facebook Page first.');
    }

    // Step 4: Save Instagram channels
    let savedCount = 0;
    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        const igAccount = page.instagram_business_account;

        // Check if already exists
        const existing = await db.channel.findFirst({
          where: { instagramAccountId: igAccount.id }
        });

        if (existing) {
          // Update existing
          await db.channel.update({
            where: { id: existing.id },
            data: {
              accessToken: page.access_token,
              refreshToken: finalToken,
              name: igAccount.username || igAccount.name || page.name,
            }
          });
        } else {
          // Create new
          await db.channel.create({
            data: {
              userId: state || null,
              name: igAccount.username || igAccount.name || 'Instagram Account',
              platform: 'instagram',
              instagramAccountId: igAccount.id,
              facebookPageId: page.id,
              facebookPageName: page.name,
              accessToken: page.access_token,
              refreshToken: finalToken,
              uploadTime: '18:00',
              frequency: 'daily',
              isActive: true,
            }
          });
        }
        savedCount++;
      }
    }

    if (savedCount === 0) {
      throw new Error('No Instagram Business Accounts found. Connect your Instagram account to a Facebook Page.');
    }

    console.log(`[Instagram Callback] ${savedCount} Instagram account(s) connected`);

    return NextResponse.redirect(
      new URL('/?instagram=connected', 'https://www.gpmart.in')
    );

  } catch (error: any) {
    console.error('[Instagram Callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error.message)}`, 'https://www.gpmart.in')
    );
  }
}