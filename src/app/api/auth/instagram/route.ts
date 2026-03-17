import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'https://www.gpmart.in/api/auth/instagram/callback';

// Start Instagram OAuth flow (uses Facebook OAuth)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || '';

  // ONLY use public_profile - NO App Review needed
  // Works in Development Mode for App Admins
  // Note: Full Instagram features require App Review
  const scope = 'public_profile';

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userId);

  console.log('[Instagram OAuth] Redirecting to Facebook...');
  console.log('[Instagram OAuth] App ID:', FACEBOOK_APP_ID ? 'configured' : 'MISSING');

  return NextResponse.redirect(authUrl.toString());
}
