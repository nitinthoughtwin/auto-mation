import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '';
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || 'anonymous';
  const error = searchParams.get('error');

  if (error) {
    console.error('Facebook OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=facebook_auth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // Step 1: Exchange code for short-lived access token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FACEBOOK_CLIENT_ID);
    tokenUrl.searchParams.set('client_secret', FACEBOOK_CLIENT_SECRET);
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Get long-lived access token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', FACEBOOK_CLIENT_ID);
    longLivedUrl.searchParams.set('client_secret', FACEBOOK_CLIENT_SECRET);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();

    const accessToken = longLivedData.access_token || shortLivedToken;

    // Step 3: Get Facebook Pages
    const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,category,picture');

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Pages found. Create a Facebook Page first.');
    }

    // Step 4: Save Facebook Pages as channels
    const channels = [];
    for (const page of pagesData.data) {
      // Check if channel already exists
      const existingChannel = await db.channel.findUnique({
        where: { facebookPageId: page.id },
      });

      if (existingChannel) {
        await db.channel.update({
          where: { id: existingChannel.id },
          data: {
            accessToken: page.access_token,
            refreshToken: accessToken,
            name: page.name,
          },
        });
        channels.push(existingChannel.id);
      } else {
        const newChannel = await db.channel.create({
          data: {
            userId: state !== 'anonymous' ? state : null,
            name: page.name,
            platform: 'facebook',
            facebookPageId: page.id,
            facebookPageName: page.name,
            accessToken: page.access_token,
            refreshToken: accessToken,
          },
        });
        channels.push(newChannel.id);
      }
    }

    console.log('Facebook pages connected:', channels);

    return NextResponse.redirect(new URL('/?facebook=connected', request.url));
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
