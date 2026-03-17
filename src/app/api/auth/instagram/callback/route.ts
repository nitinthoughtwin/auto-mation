import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FACEBOOK_APP_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const FACEBOOK_APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'https://www.gpmart.in/api/auth/instagram/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const state = searchParams.get('state') || '';

  console.log('[Instagram Callback] Starting...');
  console.log('[Instagram Callback] Code:', code ? 'YES' : 'NO');
  console.log('[Instagram Callback] Error:', error);

  // Handle OAuth errors
  if (error) {
    console.error('[Instagram Callback] OAuth Error:', error, errorDescription);
    return NextResponse.redirect(
      `https://www.gpmart.in/?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      'https://www.gpmart.in/?error=no_authorization_code'
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
      console.error('[Instagram Callback] Token Error:', tokenData.error);
      throw new Error(tokenData.error.message || 'Token exchange failed');
    }

    console.log('[Instagram Callback] Token received!');
    const accessToken = tokenData.access_token;

    // Step 2: Get user's basic profile
    const userUrl = new URL('https://graph.facebook.com/v19.0/me');
    userUrl.searchParams.set('fields', 'id,name,picture');
    userUrl.searchParams.set('access_token', accessToken);

    const userRes = await fetch(userUrl.toString());
    const userData = await userRes.json();

    console.log('[Instagram Callback] User:', userData);

    // Step 3: Try to get Instagram accounts (requires App Review for full access)
    // In development mode, this may return empty
    const igUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    igUrl.searchParams.set('access_token', accessToken);
    igUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account');

    const igRes = await fetch(igUrl.toString());
    const igData = await igRes.json();

    console.log('[Instagram Callback] Pages:', igData.data?.length || 0);

    // Step 4: Save connection
    let savedCount = 0;

    // Check for Instagram Business Accounts
    if (igData.data && igData.data.length > 0) {
      for (const page of igData.data) {
        if (page.instagram_business_account) {
          const igAccount = page.instagram_business_account;

          const existing = await db.channel.findFirst({
            where: { instagramAccountId: igAccount.id }
          });

          if (existing) {
            await db.channel.update({
              where: { id: existing.id },
              data: {
                accessToken: page.access_token,
                refreshToken: accessToken,
                name: igAccount.username || page.name,
              }
            });
          } else {
            await db.channel.create({
              data: {
                userId: state || null,
                name: igAccount.username || page.name || 'Instagram Account',
                platform: 'instagram',
                instagramAccountId: igAccount.id,
                facebookPageId: page.id,
                facebookPageName: page.name,
                accessToken: page.access_token,
                refreshToken: accessToken,
                uploadTime: '18:00',
                frequency: 'daily',
                isActive: true,
              }
            });
          }
          savedCount++;
        }
      }
    }

    // If no Instagram accounts found, save Facebook profile as placeholder
    if (savedCount === 0 && userData.id) {
      console.log('[Instagram Callback] No IG accounts, saving profile...');

      const existing = await db.channel.findFirst({
        where: { facebookPageId: userData.id }
      });

      if (!existing) {
        await db.channel.create({
          data: {
            userId: state || null,
            name: userData.name || 'Connected Account',
            platform: 'instagram',
            instagramAccountId: userData.id,
            facebookPageId: userData.id,
            facebookPageName: userData.name,
            accessToken: accessToken,
            refreshToken: accessToken,
            uploadTime: '18:00',
            frequency: 'daily',
            isActive: true,
          }
        });
        savedCount++;
      }
    }

    console.log(`[Instagram Callback] Saved ${savedCount} connections`);

    if (savedCount === 0) {
      return NextResponse.redirect(
        'https://www.gpmart.in/?warning=' + encodeURIComponent(
          'Connected successfully! Note: Instagram Business features require App Review. ' +
          'Add yourself as a Test User in Facebook App settings to test full features.'
        )
      );
    }

    return NextResponse.redirect('https://www.gpmart.in/?instagram=connected');

  } catch (err: any) {
    console.error('[Instagram Callback] Exception:', err);
    return NextResponse.redirect(
      `https://www.gpmart.in/?error=${encodeURIComponent(err.message || 'Unknown error')}`
    );
  }
}