import { NextRequest, NextResponse } from 'next/server';

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';

// Start Instagram OAuth flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'anonymous';

  // Instagram uses Facebook Graph API for OAuth
  // Required scopes: instagram_basic, instagram_content_publish, pages_show_list
  const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', INSTAGRAM_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userId);

  console.log('Instagram OAuth URL:', authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}