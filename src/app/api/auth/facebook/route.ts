import { NextRequest, NextResponse } from 'next/server';

// Use FACEBOOK_APP_ID (not INSTAGRAM_CLIENT_ID)
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'https://www.gpmart.in/api/auth/facebook/callback';

// Start Facebook OAuth flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || '';

  // Check if App ID is configured
  if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID === 'your_facebook_app_id_here') {
    return NextResponse.json(
      { error: 'Facebook App ID not configured. Please add FACEBOOK_APP_ID to .env file' },
      { status: 500 }
    );
  }

  // ONLY public_profile - NO App Review needed
  // Works in Development Mode for App Admins
  const scope = 'public_profile';

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userId);

  console.log('[Facebook OAuth] Redirecting to Facebook...');
  console.log('[Facebook OAuth] App ID:', FACEBOOK_APP_ID);
  console.log('[Facebook OAuth] Redirect URI:', REDIRECT_URI);

  return NextResponse.redirect(authUrl.toString());
}
