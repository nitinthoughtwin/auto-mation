import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Debug endpoint to check scheduler status
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Get all active channels with queued videos
    const channels = await db.channel.findMany({
      where: { isActive: true },
      include: {
        videos: {
          where: { status: 'queued' },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
      },
    });

    const debugInfo = channels.map(channel => {
      // Get current time in channel's timezone
      const timezone = channel.timezone || 'Asia/Kolkata';
      
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      
      const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      });
      
      const currentTime = timeFormatter.format(now);
      const currentDate = dateFormatter.format(now);
      const dayOfWeek = dayFormatter.format(now);

      // Parse upload time
      const uploadTime = channel.uploadTime || '18:00';
      const [hours, minutes] = uploadTime.match(/^(\d{1,2}):(\d{2})/)?.slice(1,3).map(Number) || [18, 0];

      return {
        channelId: channel.id,
        channelName: channel.name,
        timezone,
        serverTimeUTC: now.toISOString(),
        currentTimeInTimezone: currentTime,
        currentDateInTimezone: currentDate,
        dayOfWeek,
        scheduledUploadTime: uploadTime,
        frequency: channel.frequency,
        lastUploadDate: channel.lastUploadDate,
        queuedVideos: channel.videos.length,
        videos: channel.videos.map(v => ({
          id: v.id,
          title: v.title,
          fileName: v.fileName,
          isUrl: v.fileName?.startsWith('http') || false,
          status: v.status,
          createdAt: v.createdAt,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      serverTime: now.toISOString(),
      totalChannels: channels.length,
      channels: debugInfo,
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Debug failed' 
      },
      { status: 500 }
    );
  }
}