import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Debug endpoint to check scheduler status
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Get all active channels
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
      const formatter = new Intl.DateTimeFormat('en-US', {
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
      
      const currentTime = formatter.format(now);
      const currentDate = dateFormatter.format(now);
      
      // Get day of week
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      });
      const dayOfWeek = dayFormatter.format(now);

      // Calculate actual upload time with random delay
      const scheduledTime = channel.uploadTime;
      const randomDelay = channel.randomDelayMinutes || 0;
      
      // Parse scheduled time
      const timeMatch = scheduledTime.match(/^(\d{1,2}):(\d{2})/);
      let scheduledHours = 0, scheduledMinutes = 0;
      if (timeMatch) {
        scheduledHours = parseInt(timeMatch[1]);
        scheduledMinutes = parseInt(timeMatch[2]);
      }
      
      // Apply random delay
      let actualMinutesTotal = scheduledHours * 60 + scheduledMinutes + randomDelay;
      let actualHours = Math.floor(actualMinutesTotal / 60) % 24;
      let actualMinutes = actualMinutesTotal % 60;
      if (actualMinutes < 0) {
        actualMinutes += 60;
        actualHours = (actualHours - 1 + 24) % 24;
      }
      if (actualHours < 0) {
        actualHours += 24;
      }
      
      const actualUploadTime = `${String(actualHours).padStart(2, '0')}:${String(Math.abs(actualMinutes)).padStart(2, '0')}`;

      return {
        channelName: channel.name,
        channelId: channel.id,
        timezone,
        serverTimeUTC: now.toISOString(),
        currentTimeInTimezone: currentTime,
        currentDateInTimezone: currentDate,
        dayOfWeek,
        scheduledUploadTime: scheduledTime,
        randomDelayMinutes: randomDelay,
        randomDelayDate: channel.randomDelayDate,
        actualUploadTime: actualUploadTime,
        frequency: channel.frequency,
        lastUploadDate: channel.lastUploadDate,
        queuedVideos: channel.videos.length,
        videos: channel.videos.map(v => ({
          id: v.id,
          title: v.title,
          fileName: v.fileName,
          isUrl: v.fileName.startsWith('http'),
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
