import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Save Facebook connection from JavaScript SDK
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, userID, name, email, picture, userId } = body;

    console.log('[Facebook Connect] Saving connection for:', name, userID);

    if (!accessToken || !userID) {
      return NextResponse.json(
        { error: 'Missing access token or user ID' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await db.channel.findFirst({
      where: { facebookPageId: userID }
    });

    if (existing) {
      // Update existing
      const updated = await db.channel.update({
        where: { id: existing.id },
        data: {
          accessToken: accessToken,
          refreshToken: accessToken,
          name: name || existing.name,
          userId: userId || existing.userId,
        }
      });

      console.log('[Facebook Connect] Updated existing connection');
      return NextResponse.json({ success: true, channel: updated });
    }

    // Create new
    const channel = await db.channel.create({
      data: {
        userId: userId || null,
        name: name || 'Facebook Account',
        platform: 'facebook',
        facebookPageId: userID,
        facebookPageName: name,
        accessToken: accessToken,
        refreshToken: accessToken,
        uploadTime: '18:00',
        frequency: 'daily',
        isActive: true,
      }
    });

    console.log('[Facebook Connect] Created new connection:', channel.id);
    return NextResponse.json({ success: true, channel });

  } catch (error: any) {
    console.error('[Facebook Connect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save connection' },
      { status: 500 }
    );
  }
}