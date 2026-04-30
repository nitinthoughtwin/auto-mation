import 'server-only';

const IG_API = 'https://graph.instagram.com/v19.0';
const FB_API = 'https://graph.facebook.com/v19.0';

export interface InstagramUploadResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

// Exchange short-lived token for long-lived token (60 days)
export async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${FB_API}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.INSTAGRAM_CLIENT_ID!);
  url.searchParams.set('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
  url.searchParams.set('fb_exchange_token', shortToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

// Get Instagram Business Account ID from Facebook Page token
export async function getInstagramAccountId(pageAccessToken: string, pageId: string): Promise<string | null> {
  const url = new URL(`${FB_API}/${pageId}`);
  url.searchParams.set('fields', 'instagram_business_account');
  url.searchParams.set('access_token', pageAccessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.instagram_business_account?.id || null;
}

// Upload a Reel to Instagram
// Video must be publicly accessible via URL
export async function uploadInstagramReel(
  igAccountId: string,
  pageAccessToken: string,
  videoUrl: string,
  caption: string
): Promise<InstagramUploadResult> {
  try {
    console.log('[Instagram] Creating media container...');

    // Step 1: Create media container
    const containerRes = await fetch(`${IG_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        share_to_feed: true,
        access_token: pageAccessToken,
      }),
    });

    const containerData = await containerRes.json();

    if (containerData.error) {
      console.error('[Instagram] Container error:', containerData.error);
      return { success: false, error: containerData.error.message };
    }

    const containerId = containerData.id;
    console.log('[Instagram] Container created:', containerId);

    // Step 2: Wait for video processing (poll every 10s, max 5 minutes)
    const ready = await waitForProcessing(containerId, pageAccessToken);
    if (!ready) {
      return { success: false, error: 'Video processing timed out' };
    }

    // Step 3: Publish the container
    console.log('[Instagram] Publishing reel...');
    const publishRes = await fetch(`${IG_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageAccessToken,
      }),
    });

    const publishData = await publishRes.json();

    if (publishData.error) {
      console.error('[Instagram] Publish error:', publishData.error);
      return { success: false, error: publishData.error.message };
    }

    console.log('[Instagram] Reel published! Media ID:', publishData.id);
    return { success: true, mediaId: publishData.id };

  } catch (error: any) {
    console.error('[Instagram] Upload exception:', error.message);
    return { success: false, error: error.message };
  }
}

// Poll container status until FINISHED or ERROR
async function waitForProcessing(containerId: string, accessToken: string): Promise<boolean> {
  const maxAttempts = 30; // 30 * 10s = 5 minutes
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(10000);

    const statusRes = await fetch(
      `${IG_API}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();
    const status = statusData.status_code;

    console.log(`[Instagram] Processing status (${i + 1}/${maxAttempts}):`, status);

    if (status === 'FINISHED') return true;
    if (status === 'ERROR') {
      console.error('[Instagram] Processing failed');
      return false;
    }
  }
  return false;
}

// Refresh a long-lived token before it expires
export async function refreshLongLivedToken(longLivedToken: string): Promise<string> {
  const url = new URL(`${FB_API}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.INSTAGRAM_CLIENT_ID!);
  url.searchParams.set('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
  url.searchParams.set('fb_exchange_token', longLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

// Get Instagram account info
export async function getInstagramProfile(igAccountId: string, accessToken: string) {
  const url = new URL(`${IG_API}/${igAccountId}`);
  url.searchParams.set('fields', 'id,username,followers_count,media_count');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  return res.json();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
