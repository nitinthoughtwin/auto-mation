import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Save Instagram accounts from Facebook pages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, pages } = body;

    console.log('[Instagram Connect] Processing', pages?.length || 0, 'pages');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    const channels: any[] = [];

    // Process each page and look for Instagram Business accounts
    for (const page of pages || []) {
      // Check if page has Instagram Business account linked
      if (page.instagram_business_account) {
        const igAccount = page.instagram_business_account;
        
        console.log('[Instagram Connect] Found IG account:', igAccount.username || igAccount.id);

        // Check if already exists
        const existing = await db.channel.findFirst({
          where: { instagramAccountId: igAccount.id }
        });

        if (existing) {
          // Update existing
          const updated = await db.channel.update({
            where: { id: existing.id },
            data: {
              accessToken: page.access_token || accessToken,
              refreshToken: accessToken,
              name: igAccount.username || igAccount.name || existing.name,
            }
          });
          channels.push(updated);
        } else {
          // Create new
          const channel = await db.channel.create({
            data: {
              name: igAccount.username || igAccount.name || 'Instagram Account',
              platform: 'instagram',
              instagramAccountId: igAccount.id,
              accessToken: page.access_token || accessToken,
              refreshToken: accessToken,
              uploadTime: '18:00',
              frequency: 'daily',
              isActive: true,
            }
          });
          channels.push(channel);
        }
      }
    }

    console.log('[Instagram Connect] Saved', channels.length, 'Instagram accounts');

    return NextResponse.json({ 
      success: true, 
      channels,
      message: channels.length > 0 
        ? `Connected ${channels.length} Instagram account(s)` 
        : 'No Instagram Business accounts found. Make sure your Facebook Pages are linked to Instagram.'
    });

  } catch (error: any) {
    console.error('[Instagram Connect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save Instagram accounts' },
      { status: 500 }
    );
  }
}