import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';

// POST - Refresh channel access token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const channel = await db.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check ownership
    if (channel.userId && channel.userId !== session.user.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Refresh the access token
    console.log('[Channel Refresh] Refreshing token for channel:', id);
    
    const tokens = await refreshAccessToken(channel.refreshToken);
    
    // Update channel with new tokens
    const updatedChannel = await db.channel.update({
      where: { id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

    console.log('[Channel Refresh] Token refreshed successfully');

    return NextResponse.json({ 
      success: true,
      channel: {
        id: updatedChannel.id,
        name: updatedChannel.name,
        youtubeChannelId: updatedChannel.youtubeChannelId,
        isActive: updatedChannel.isActive,
        uploadTime: updatedChannel.uploadTime,
        frequency: updatedChannel.frequency,
      }
    });
  } catch (error: any) {
    console.error('[Channel Refresh] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh token' },
      { status: 500 }
    );
  }
}