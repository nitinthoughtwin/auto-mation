import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserPlanAndUsage } from '@/lib/plan-limits';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // User + subscription + usage
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscriptions: {
          where: { status: { in: ['active', 'trialing'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            plan: true,
            usage: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSub = user.subscriptions[0] ?? null;
    const plan = activeSub?.plan ?? null;

    // Use live recalculation (counts only actually uploaded videos, not queued)
    let liveUsage: { videosThisMonth: number; maxVideosPerMonth: number } | null = null;
    try {
      const { limits, usage: u } = await getUserPlanAndUsage(userId);
      liveUsage = { videosThisMonth: u.videosThisMonth, maxVideosPerMonth: limits.maxVideosPerMonth };
    } catch { /* no subscription */ }

    const usage = activeSub?.usage ?? null;

    // Channels with queued videos
    const channels = await db.channel.findMany({
      where: { userId },
      include: {
        videos: {
          where: { status: 'queued' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, title: true, createdAt: true, fileName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // For each channel: recent logs + failed videos + diagnosis
    const channelDiagnoses = await Promise.all(
      channels.map(async (ch) => {
        // Last 20 scheduler logs (excluding heartbeats)
        const recentLogs = await db.schedulerLog.findMany({
          where: { channelId: ch.id, NOT: { action: 'heartbeat' } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { status: true, message: true, createdAt: true, action: true },
        });

        // Recent failed videos (last 5)
        const failedVideos = await db.video.findMany({
          where: { channelId: ch.id, status: 'failed' },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, title: true, error: true, updatedAt: true },
        });

        // ── Diagnosis ──
        const issues: { level: 'error' | 'warning' | 'ok'; text: string }[] = [];

        // 1. Channel active?
        if (!ch.isActive) {
          issues.push({ level: 'error', text: 'Automation is PAUSED — user must press Start' });
        } else {
          issues.push({ level: 'ok', text: 'Automation is running (isActive = true)' });
        }

        // 2. Queue empty?
        if (ch.videos.length === 0) {
          issues.push({ level: 'error', text: 'Queue is empty — no videos to upload' });
        } else {
          issues.push({ level: 'ok', text: `${ch.videos.length} video(s) in queue` });
        }

        // 3. Missing refresh token?
        if (!ch.refreshToken) {
          issues.push({ level: 'error', text: 'refreshToken missing — YouTube reconnect needed' });
        } else {
          issues.push({ level: 'ok', text: 'refreshToken present' });
        }

        // 4. Auth errors in recent logs?
        const authErrorLog = recentLogs.find((l) => {
          const m = (l.message || '').toLowerCase();
          return (
            l.status === 'failed' &&
            (m.includes('invalid_grant') || m.includes('auth') || m.includes('token') ||
             m.includes('401') || m.includes('403') || m.includes('unauthorized') ||
             m.includes('permission'))
          );
        });
        if (authErrorLog) {
          issues.push({
            level: 'error',
            text: `YouTube auth error in logs: "${authErrorLog.message}"`,
          });
        }

        // 5. Plan limit? (use live recalculated count — only uploaded videos)
        if (liveUsage) {
          const { videosThisMonth: used, maxVideosPerMonth: max } = liveUsage;
          if (max > 0 && used >= max) {
            issues.push({
              level: 'error',
              text: `Monthly limit reached: ${used}/${max} videos uploaded on ${plan?.displayName ?? 'Free'} plan`,
            });
          } else {
            issues.push({ level: 'ok', text: `Usage: ${used}/${max} videos uploaded this month` });
          }
        } else {
          issues.push({ level: 'warning', text: 'No active subscription found — uploads may be blocked' });
        }

        // 6. No userId on channel?
        if (!ch.userId) {
          issues.push({ level: 'error', text: 'Channel has no userId — not linked to any user account' });
        }

        // 7. All recent logs are "Too early" / missed window?
        const recentSkipped = recentLogs.filter(
          (l) => l.status === 'skipped' || (l.status === 'failed' && l.message?.includes('Too'))
        );
        if (recentSkipped.length >= 5 && recentLogs.length >= 5) {
          issues.push({
            level: 'warning',
            text: `Last ${recentSkipped.length} runs all skipped. Upload window may be misconfigured.`,
          });
        }

        // 8. Missed window too often?
        const missedWindow = recentLogs.filter((l) => (l.message || '').includes('Missed window'));
        if (missedWindow.length >= 2) {
          issues.push({
            level: 'warning',
            text: `Upload window missed ${missedWindow.length} times — cron may not be running at the right time`,
          });
        }

        return {
          channel: {
            id: ch.id,
            name: ch.name,
            youtubeChannelId: ch.youtubeChannelId,
            isActive: ch.isActive,
            uploadTime: ch.uploadTime,
            frequency: ch.frequency,
            timezone: ch.timezone,
            lastUploadDate: ch.lastUploadDate,
            hasRefreshToken: !!ch.refreshToken,
            queuedVideos: ch.videos.map((v) => ({ id: v.id, title: v.title, createdAt: v.createdAt })),
          },
          issues,
          recentLogs,
          failedVideos,
        };
      })
    );

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      plan: plan
        ? {
            name: plan.name,
            displayName: plan.displayName,
            maxVideosPerMonth: plan.maxVideosPerMonth,
            maxChannels: plan.maxChannels,
          }
        : null,
      usage: liveUsage
        ? {
            videosThisMonth: liveUsage.videosThisMonth,
            channelsConnected: usage?.channelsConnected ?? 0,
            aiCreditsUsed: usage?.aiCreditsUsed ?? 0,
          }
        : null,
      channels: channelDiagnoses,
    });
  } catch (err: any) {
    console.error('[UserDebug]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
