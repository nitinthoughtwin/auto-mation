import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '';
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback';

// Start Facebook OAuth flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'anonymous';

  // Scopes for Facebook Pages and Video Upload
  const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts,video_upload,publish_video,publish_to_groups';

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userId);

  console.log('Facebook OAuth URL:', authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
