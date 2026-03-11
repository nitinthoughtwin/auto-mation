import { NextRequest, NextResponse } from 'next/server';
import { processScheduledUploads } from '@/lib/scheduler';
import { db } from '@/lib/db';

// POST - Manually trigger scheduler (or called by external cron)
export async function POST(request: NextRequest) {
  try {
    const result = await processScheduledUploads();
    
    return NextResponse.json({ 
      success: true, 
      message: `Scheduler completed: ${result.processed} uploaded, ${result.skipped} skipped`,
      ...result
    });
  } catch (error: any) {
    console.error('Scheduler error:', error);
    return NextResponse.json(
      { error: error.message || 'Scheduler failed' },
      { status: 500 }
    );
  }
}

// GET - Get scheduler status and logs
export async function GET(request: NextRequest) {
  try {
    const logs = await db.schedulerLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Get all channels with their next upload info
    const channels = await db.channel.findMany({
      select: {
        id: true,
        name: true,
        uploadTime: true,
        frequency: true,
        isActive: true,
        lastUploadDate: true,
        _count: {
          select: { videos: { where: { status: 'queued' } } }
        }
      }
    });

    // Calculate next upload info for each channel
    const channelStatus = channels.map(ch => {
      const now = new Date();
      const [hours, minutes] = ch.uploadTime.split(':').map(Number);
      
      let nextUpload = new Date();
      nextUpload.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (nextUpload <= now) {
        nextUpload.setDate(nextUpload.getDate() + 1);
      }
      
      // For alternate frequency
      if (ch.frequency === 'alternate' && ch.lastUploadDate) {
        const lastUpload = new Date(ch.lastUploadDate);
        const daysSinceLastUpload = Math.floor(
          (now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastUpload < 2) {
          nextUpload = new Date(lastUpload);
          nextUpload.setDate(nextUpload.getDate() + 2);
          nextUpload.setHours(hours, minutes, 0, 0);
        }
      }

      // Check if already uploaded today (for daily)
      let canUploadToday = true;
      if (ch.lastUploadDate && ch.frequency === 'daily') {
        const lastUpload = new Date(ch.lastUploadDate);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastUploadStart = new Date(lastUpload.getFullYear(), lastUpload.getMonth(), lastUpload.getDate());
        canUploadToday = lastUploadStart.getTime() !== todayStart.getTime();
      }

      return {
        id: ch.id,
        name: ch.name,
        uploadTime: ch.uploadTime,
        frequency: ch.frequency,
        isActive: ch.isActive,
        queuedVideos: ch._count.videos,
        lastUploadDate: ch.lastUploadDate,
        nextUploadTime: nextUpload.toISOString(),
        canUploadToday,
      };
    });

    return NextResponse.json({ 
      logs,
      lastRun: logs[0]?.createdAt || null,
      channels: channelStatus,
    });
  } catch (error: any) {
    console.error('Error fetching scheduler logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}