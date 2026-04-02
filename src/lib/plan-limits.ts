import { db } from '@/lib/db';

export interface PlanLimits {
  maxVideosPerMonth: number;
  maxChannels: number;
  maxStorageMB: number;
  aiCreditsPerMonth: number;
  maxVideoSizeMB: number;
  planName: string;
  planDisplayName: string;
}

export interface UsageSummary {
  videosThisMonth: number;
  channelsConnected: number;
  storageUsedMB: number;
  aiCreditsUsed: number;
}

/**
 * Returns the active plan limits and current usage for a user.
 * Throws if no active subscription found.
 */
export async function getUserPlanAndUsage(userId: string): Promise<{
  limits: PlanLimits;
  usage: UsageSummary;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
}> {
  const subscription = await db.subscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing'] } },
    include: { plan: true, usage: true },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const limits: PlanLimits = {
    maxVideosPerMonth: subscription.plan.maxVideosPerMonth,
    maxChannels: subscription.plan.maxChannels,
    maxStorageMB: subscription.plan.maxStorageMB,
    aiCreditsPerMonth: subscription.plan.aiCreditsPerMonth,
    maxVideoSizeMB: subscription.plan.maxVideoSizeMB ?? 500,
    planName: subscription.plan.name,
    planDisplayName: subscription.plan.displayName,
  };

  const videosThisMonth = await db.video.count({
    where: {
      channel: { userId },
      createdAt: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd,
      },
    },
  });

  const channelsConnected = await db.channel.count({ where: { userId } });

  const allVideos = await db.video.findMany({
    where: { channel: { userId } },
    select: { fileSize: true, thumbnailSize: true },
  });
  const storageUsedMB =
    allVideos.reduce((acc, v) => acc + (v.fileSize || 0) + (v.thumbnailSize || 0), 0) /
    (1024 * 1024);

  const usage: UsageSummary = {
    videosThisMonth,
    channelsConnected,
    storageUsedMB,
    aiCreditsUsed: subscription.usage?.aiCreditsUsed || 0,
  };

  return {
    limits,
    usage,
    subscriptionId: subscription.id,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  };
}

export function checkVideoLimit(limits: PlanLimits, usage: UsageSummary, count = 1) {
  const remaining = limits.maxVideosPerMonth - usage.videosThisMonth;
  if (remaining <= 0) {
    return {
      allowed: false,
      message: `Video limit reached (${usage.videosThisMonth}/${limits.maxVideosPerMonth} this month on ${limits.planDisplayName}). Upgrade your plan.`,
    };
  }
  if (count > remaining) {
    return {
      allowed: false,
      message: `Only ${remaining} video slot${remaining !== 1 ? 's' : ''} remaining on ${limits.planDisplayName} (${usage.videosThisMonth}/${limits.maxVideosPerMonth} used). Upgrade to upload more.`,
    };
  }
  return { allowed: true, message: '' };
}

export function checkChannelLimit(limits: PlanLimits, usage: UsageSummary) {
  if (usage.channelsConnected >= limits.maxChannels) {
    return {
      allowed: false,
      message: `Channel limit reached (${usage.channelsConnected}/${limits.maxChannels} on ${limits.planDisplayName}). Upgrade your plan to connect more channels.`,
    };
  }
  return { allowed: true, message: '' };
}

export function checkStorageLimit(limits: PlanLimits, usage: UsageSummary, fileSizeBytes: number) {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  if (fileSizeMB > limits.maxVideoSizeMB) {
    return {
      allowed: false,
      message: `File size ${fileSizeMB.toFixed(0)} MB exceeds the ${limits.maxVideoSizeMB} MB per-video limit on ${limits.planDisplayName}.`,
    };
  }
  if (usage.storageUsedMB + fileSizeMB > limits.maxStorageMB) {
    const remainingMB = limits.maxStorageMB - usage.storageUsedMB;
    return {
      allowed: false,
      message: `Storage limit reached. Only ${remainingMB.toFixed(0)} MB remaining on ${limits.planDisplayName} (${limits.maxStorageMB} MB total). Upgrade for more storage.`,
    };
  }
  return { allowed: true, message: '' };
}
