import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Debug endpoint to check scheduler status without uploading
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Get all channels (active and inactive)
    const channels = await db.channel.findMany({
      include: {
        videos: {
          where: { status: 'queued' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Get current time in different timezones
    const timezones = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London'];
    const timezoneTimes: Record<string, { time: string; date: string }> = {};
    
    for (const tz of timezones) {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      timezoneTimes[tz] = {
        time: timeFormatter.format(now),
        date: dateFormatter.format(now),
      };
    }

    // Analyze each channel
    const channelAnalysis = channels.map(channel => {
      const timezone = channel.timezone || 'Asia/Kolkata';
      
      // Get current time in channel's timezone
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const currentTimeStr = timeFormatter.format(now);
      const [currentHours, currentMinutes] = currentTimeStr.split(':').map(Number);
      
      // Parse scheduled time
      const uploadTimeMatch = channel.uploadTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      let scheduledHours = 0;
      let scheduledMinutes = 0;
      
      if (uploadTimeMatch) {
        scheduledHours = parseInt(uploadTimeMatch[1]);
        scheduledMinutes = parseInt(uploadTimeMatch[2]);
        const period = uploadTimeMatch[3]?.toUpperCase();
        
        if (period === 'PM' && scheduledHours !== 12) {
          scheduledHours += 12;
        } else if (period === 'AM' && scheduledHours === 12) {
          scheduledHours = 0;
        }
      }
      
      // Calculate time difference
      const scheduledMinutesTotal = scheduledHours * 60 + scheduledMinutes;
      const currentMinutesTotal = currentHours * 60 + currentMinutes;
      const timeDiff = Math.abs(currentMinutesTotal - scheduledMinutesTotal);
      
      // Determine if would upload
      const wouldUpload = timeDiff <= 5 && channel.isActive && channel.videos.length > 0;
      
      return {
        name: channel.name,
        isActive: channel.isActive,
        uploadTime: channel.uploadTime,
        timezone,
        currentTimeInTimezone: currentTimeStr,
        scheduledTime24h: `${scheduledHours}:${scheduledMinutes.toString().padStart(2, '0')}`,
        timeDifferenceMinutes: timeDiff,
        isWithin5MinWindow: timeDiff <= 5,
        queuedVideosCount: channel.videos.length,
        queuedVideos: channel.videos.map(v => ({ id: v.id, title: v.title, status: v.status })),
        wouldUpload,
        reasons: [
          !channel.isActive && 'Channel is inactive',
          channel.videos.length === 0 && 'No queued videos',
          timeDiff > 5 && `Time mismatch: ${timeDiff} minutes difference (need ≤5)`,
        ].filter(Boolean),
      };
    });

    return NextResponse.json({
      serverTime: now.toISOString(),
      timezoneTimes,
      channelsCount: channels.length,
      channels: channelAnalysis,
      recommendations: channelAnalysis.flatMap(c => 
        c.reasons.length > 0 ? [`Channel "${c.name}": ${c.reasons.join(', ')}`] : []
      ),
    });

  } catch (error) {
    console.error('Debug endpoint error :', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}