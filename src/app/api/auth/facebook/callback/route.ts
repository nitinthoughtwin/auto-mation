import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FACEBOOK_APP_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const FACEBOOK_APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'https://www.gpmart.in/api/auth/facebook/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const state = searchParams.get('state') || '';

  console.log('[Facebook Callback] Starting...');
  console.log('[Facebook Callback] Code:', code ? 'YES' : 'NO');
  console.log('[Facebook Callback] Error:', error);

  // Handle OAuth errors
  if (error) {
    console.error('[Facebook Callback] OAuth Error:', error, errorDescription);
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
      console.error('[Facebook Callback] Token Error:', tokenData.error);
      throw new Error(tokenData.error.message || 'Token exchange failed');
    }

    console.log('[Facebook Callback] Token received!');
    const accessToken = tokenData.access_token;

    // Step 2: Get user's basic profile
    const userUrl = new URL('https://graph.facebook.com/v19.0/me');
    userUrl.searchParams.set('fields', 'id,name,picture');
    userUrl.searchParams.set('access_token', accessToken);

    const userRes = await fetch(userUrl.toString());
    const userData = await userRes.json();

    console.log('[Facebook Callback] User:', userData);

    // Step 3: Check if user has any pages (limited in dev mode)
    const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();

    console.log('[Facebook Callback] Pages:', pagesData.data?.length || 0, 'pages');

    // Step 4: Save connection
    let savedCount = 0;

    // Save user's Facebook profile as a connection
    if (userData.id) {
      const existing = await db.channel.findFirst({
        where: { facebookPageId: userData.id }
      });

      if (existing) {
        await db.channel.update({
          where: { id: existing.id },
          data: {
            accessToken: accessToken,
            refreshToken: accessToken,
            name: userData.name || existing.name,
          }
        });
      } else {
        await db.channel.create({
          data: {
            userId: state || null,
            name: userData.name || 'Facebook Account',
            platform: 'facebook',
            facebookPageId: userData.id,
            facebookPageName: userData.name,
            accessToken: accessToken,
            refreshToken: accessToken,
            uploadTime: '18:00',
            frequency: 'daily',
            isActive: true,
          }
        });
      }
      savedCount++;
    }

    // Save pages if accessible
    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        const existing = await db.channel.findFirst({
          where: { facebookPageId: page.id }
        });

        if (existing) {
          await db.channel.update({
            where: { id: existing.id },
            data: {
              accessToken: page.access_token,
              refreshToken: accessToken,
              name: page.name,
            }
          });
        } else {
          await db.channel.create({
            data: {
              userId: state || null,
              name: page.name,
              platform: 'facebook',
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

    console.log(`[Facebook Callback] Saved ${savedCount} connections`);

    return NextResponse.redirect('https://www.gpmart.in/?facebook=connected');

  } catch (err: any) {
    console.error('[Facebook Callback] Exception:', err);
    return NextResponse.redirect(
      `https://www.gpmart.in/?error=${encodeURIComponent(err.message || 'Unknown error')}`
    );
  }
}
