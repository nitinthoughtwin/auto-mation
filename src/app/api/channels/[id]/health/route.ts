import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { refreshAccessToken } from '@/lib/youtube';
import { getUserPlanAndUsage, checkVideoLimit } from '@/lib/plan-limits';

export interface ChannelWarning {
  type: 'youtube_auth' | 'plan_limit' | 'upload_failures' | 'no_refresh_token';
  severity: 'error' | 'warning';
  title: string;
  message: string;
  action?: { label: string; href: string };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const channel = await db.channel.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true, refreshToken: true, accessToken: true, isActive: true },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const warnings: ChannelWarning[] = [];

    // ── 1. Check if refresh token is missing ──
    if (!channel.refreshToken) {
      warnings.push({
        type: 'no_refresh_token',
        severity: 'error',
        title: 'YouTube connection incomplete',
        message: 'Your YouTube account is not fully connected. Please reconnect to enable automatic uploads.',
        action: { label: 'Reconnect YouTube', href: '/connect-youtube' },
      });
      // Skip further token checks
      return NextResponse.json({ warnings });
    }

    // ── 2. Test YouTube token (try a refresh) ──
    let tokenOk = true;
    try {
      await refreshAccessToken(channel.refreshToken);
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      const isAuthError =
        msg.includes('invalid_grant') ||
        msg.includes('token has been expired') ||
        msg.includes('token has been revoked') ||
        msg.includes('invalid_client') ||
        msg.includes('unauthorized') ||
        err?.code === 401 ||
        err?.status === 401;
      if (isAuthError) {
        tokenOk = false;
        warnings.push({
          type: 'youtube_auth',
          severity: 'error',
          title: 'YouTube permission expired',
          message:
            'Your YouTube account permission has expired or been revoked. Videos will not upload until you reconnect.',
          action: { label: 'Reconnect YouTube', href: '/connect-youtube' },
        });
      }
      // If it's a network error or non-auth error, don't show a warning
    }

    // ── 3. Check recent upload failures (last 5 scheduler logs for this channel) ──
    if (tokenOk) {
      const recentLogs = await db.schedulerLog.findMany({
        where: {
          channelId: id,
          status: 'failed',
          NOT: { action: 'heartbeat' },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { message: true, createdAt: true },
      });

      // Check for auth-related errors in recent failure messages
      const authFailure = recentLogs.find((log) => {
        const msg = (log.message || '').toLowerCase();
        return (
          msg.includes('invalid_grant') ||
          msg.includes('unauthorized') ||
          msg.includes('token') ||
          msg.includes('auth') ||
          msg.includes('permission') ||
          msg.includes('403') ||
          msg.includes('401')
        );
      });

      if (authFailure) {
        warnings.push({
          type: 'youtube_auth',
          severity: 'error',
          title: 'YouTube permission issue detected',
          message: `Recent uploads failed due to authentication errors. Please reconnect your YouTube account.`,
          action: { label: 'Reconnect YouTube', href: '/connect-youtube' },
        });
      } else if (recentLogs.length >= 3) {
        // 3 or more consecutive failures (non-auth)
        const lastError = recentLogs[0]?.message || 'Unknown error';
        warnings.push({
          type: 'upload_failures',
          severity: 'warning',
          title: `${recentLogs.length} recent upload failures`,
          message: `Last error: ${lastError.slice(0, 120)}`,
        });
      }
    }

    // ── 4. Check plan limits ──
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const check = checkVideoLimit(limits, usage);
      if (!check.allowed) {
        warnings.push({
          type: 'plan_limit',
          severity: 'warning',
          title: 'Monthly upload limit reached',
          message: `You've used all ${limits.maxVideosPerMonth} videos allowed on the ${limits.planDisplayName} plan this month.`,
          action: { label: 'Upgrade Plan', href: '/pricing' },
        });
      } else if (limits.maxVideosPerMonth > 0) {
        const remaining = limits.maxVideosPerMonth - usage.videosThisMonth;
        if (remaining <= 2 && remaining > 0) {
          warnings.push({
            type: 'plan_limit',
            severity: 'warning',
            title: `Only ${remaining} upload${remaining === 1 ? '' : 's'} left this month`,
            message: `You've used ${usage.videosThisMonth} of ${limits.maxVideosPerMonth} videos on your ${limits.planDisplayName} plan.`,
            action: { label: 'Upgrade Plan', href: '/pricing' },
          });
        }
      }
    } catch {
      // No subscription → free plan check fallback
    }

    return NextResponse.json({ warnings });
  } catch (error: any) {
    console.error('[Channel Health]', error);
    return NextResponse.json({ warnings: [] });
  }
}
