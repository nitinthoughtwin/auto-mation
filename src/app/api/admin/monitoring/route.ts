import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Last scheduler run (from any log entry)
    const lastSchedulerLog = await db.schedulerLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, status: true, message: true },
    });

    // Cron heartbeat — last time cron fired
    const lastHeartbeat = await db.schedulerLog.findFirst({
      where: { action: 'heartbeat', channelId: 'system' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Last 10 heartbeats — to compute average interval
    const recentHeartbeats = await db.schedulerLog.findMany({
      where: { action: 'heartbeat', channelId: 'system' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { createdAt: true },
    });

    // How many times cron fired today
    const cronFirestoday = await db.schedulerLog.count({
      where: {
        action: 'heartbeat',
        channelId: 'system',
        createdAt: { gte: todayStart },
      },
    });

    // Determine cron health
    let cronStatus: 'healthy' | 'delayed' | 'down' | 'unknown' = 'unknown';
    let minutesSinceLastFire: number | null = null;
    if (lastHeartbeat) {
      minutesSinceLastFire = Math.floor((now.getTime() - new Date(lastHeartbeat.createdAt).getTime()) / 60000);
      if (minutesSinceLastFire <= 8) cronStatus = 'healthy';        // within 8 min (cron every 5 min + buffer)
      else if (minutesSinceLastFire <= 20) cronStatus = 'delayed';  // late but maybe just slow
      else cronStatus = 'down';                                       // >20 min = likely broken
    }

    // Average interval between fires (from last 10 heartbeats)
    let avgIntervalMinutes: number | null = null;
    if (recentHeartbeats.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < recentHeartbeats.length - 1; i++) {
        const diff = new Date(recentHeartbeats[i].createdAt).getTime() - new Date(recentHeartbeats[i + 1].createdAt).getTime();
        intervals.push(diff / 60000);
      }
      avgIntervalMinutes = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }

    // Today's successful uploads
    const todayUploads = await db.schedulerLog.count({
      where: {
        status: 'success',
        createdAt: { gte: todayStart },
      },
    });

    // Today's failed uploads
    const todayFailed = await db.schedulerLog.count({
      where: {
        status: 'failed',
        createdAt: { gte: todayStart },
      },
    });

    // Total queued videos across all channels
    const totalQueued = await db.video.count({ where: { status: 'queued' } });

    // Total failed videos (stuck in failed state)
    const totalFailedVideos = await db.video.count({ where: { status: 'failed' } });

    // Channel health — all channels with user info and queued video count
    const channels = await db.channel.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        uploadTime: true,
        frequency: true,
        timezone: true,
        lastUploadDate: true,
        refreshToken: true,
        userId: true,
        createdAt: true,
        user: {
          select: { name: true, email: true },
        },
        videos: {
          where: { status: 'queued' },
          select: { id: true },
        },
      },
    });

    const channelHealth = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isActive: ch.isActive,
      uploadTime: ch.uploadTime,
      frequency: ch.frequency,
      timezone: ch.timezone,
      lastUploadDate: ch.lastUploadDate,
      queuedVideos: ch.videos.length,
      hasRefreshToken: !!ch.refreshToken,
      hasUserId: !!ch.userId,
      userEmail: ch.user?.email ?? null,
      userName: ch.user?.name ?? null,
      createdAt: ch.createdAt,
      // Flag channels with issues
      issues: [
        !ch.isActive ? 'Inactive' : null,
        !ch.userId ? 'No user linked' : null,
        !ch.refreshToken ? 'Missing refresh token' : null,
        ch.videos.length === 0 ? 'No queued videos' : null,
      ].filter(Boolean) as string[],
    }));

    // Failed videos with channel info
    const failedVideos = await db.video.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        error: true,
        updatedAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    // Recent scheduler logs (last 100, exclude heartbeats)
    const schedulerLogs = await db.schedulerLog.findMany({
      where: { NOT: { action: 'heartbeat' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        channelId: true,
        videoId: true,
        action: true,
        status: true,
        message: true,
        createdAt: true,
      },
    });

    // Attach channel names to logs
    const channelMap = new Map(channels.map((ch) => [ch.id, ch.name]));
    const logsWithChannelName = schedulerLogs.map((log) => ({
      ...log,
      channelName: channelMap.get(log.channelId) ?? log.channelId,
    }));

    // Channels with no upload in last 48 hours (but have queued videos and are active)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const stuckChannels = channelHealth.filter(
      (ch) =>
        ch.isActive &&
        ch.queuedVideos > 0 &&
        (!ch.lastUploadDate || new Date(ch.lastUploadDate) < twoDaysAgo)
    );

    return NextResponse.json({
      systemHealth: {
        lastSchedulerRun: lastSchedulerLog?.createdAt ?? null,
        lastSchedulerStatus: lastSchedulerLog?.status ?? null,
        todayUploads,
        todayFailed,
        totalQueued,
        totalFailedVideos,
        stuckChannelsCount: stuckChannels.length,
      },
      cronHealth: {
        status: cronStatus,
        lastFiredAt: lastHeartbeat?.createdAt ?? null,
        minutesSinceLastFire,
        cronFiresToday: cronFirestoday,
        avgIntervalMinutes,
        expectedIntervalMinutes: 5,
      },
      channelHealth,
      stuckChannels,
      failedVideos,
      schedulerLogs: logsWithChannelName,
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 });
  }
}
