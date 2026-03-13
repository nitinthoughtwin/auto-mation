import 'server-only';
import { google } from 'googleapis';
import fs from 'fs';
import { Readable } from 'stream';

const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new OAuth2(clientId, clientSecret, redirectUri);
}

// Generate authentication URL
export function getAuthUrl(state?: string) {
  const oauth2Client = createOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    state: state || '',
    prompt: 'consent', // Always get refresh token
  });
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get YouTube channel info
export async function getChannelInfo(accessToken: string, refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('No channel found');
    }

    return {
      id: channel.id,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      thumbnail: channel.snippet?.thumbnails?.default?.url,
    };
  } catch (error) {
    console.error('Error fetching channel info:', error);
    throw error;
  }
}

// Convert Buffer to Readable Stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Upload video to YouTube
export async function uploadVideo(
  accessToken: string,
  refreshToken: string,
  videoData: {
    title: string;
    description: string;
    tags: string[];
    filePath?: string;      // Local file path (optional)
    fileBuffer?: Buffer;    // Buffer from Blob storage (optional)
    fileName?: string;      // Original file name (for Buffer uploads)
  }
) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    // Determine the media body - either from file path or buffer
    let mediaBody: Readable | fs.ReadStream;
    
    if (videoData.fileBuffer) {
      // Use buffer (from Blob storage)
      mediaBody = bufferToStream(videoData.fileBuffer);
    } else if (videoData.filePath) {
      // Use file path (local filesystem)
      mediaBody = fs.createReadStream(videoData.filePath);
    } else {
      throw new Error('Either filePath or fileBuffer must be provided');
    }

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: videoData.title,
          description: videoData.description,
          tags: videoData.tags,
          categoryId: '22', // People & Blogs category
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: mediaBody,
        mimeType: 'video/*',
      },
    });

    return {
      success: true,
      videoId: response.data.id,
      videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
    };
  } catch (error: any) {
    console.error('YouTube upload error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during upload',
    };
  }
}

// Upload thumbnail to YouTube
export async function uploadThumbnail(
  accessToken: string,
  refreshToken: string,
  videoId: string,
  thumbnailBuffer: Buffer,
  fileName?: string
) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    await youtube.thumbnails.set({
      videoId,
      media: {
        body: bufferToStream(thumbnailBuffer),
        mimeType: 'image/jpeg',
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Thumbnail upload error:', error);
    return { success: false, error: error.message };
  }
}

// Refresh access token if expired
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}
