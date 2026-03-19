import { prisma } from '@/lib/db';

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

export async function checkUserLimits(userId: string, type: 'video' | 'channel' | 'storage' | 'ai', additionalBytes?: number): Promise<LimitCheckResult> {
  // Get user's active subscription with plan
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: {
      plan: true,
      usage: true,
    },
  });

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription' };
  }

  switch (type) {
    case 'video': {
      const currentCount = await prisma.video.count({
        where: {
          channel: { userId },
          createdAt: {
            gte: subscription.currentPeriodStart,
            lte: subscription.currentPeriodEnd,
          },
        },
      });
      const limit = subscription.plan.maxVideosPerMonth;
      return {
        allowed: currentCount < limit,
        current: currentCount,
        limit,
        reason: currentCount >= limit ? `Monthly video limit (${limit}) reached. Upgrade your plan.` : undefined,
      };
    }

    case 'channel': {
      const currentCount = await prisma.channel.count({
        where: { userId },
      });
      const limit = subscription.plan.maxChannels;
      return {
        allowed: currentCount < limit,
        current: currentCount,
        limit,
        reason: currentCount >= limit ? `Channel limit (${limit}) reached. Upgrade your plan.` : undefined,
      };
    }

    case 'storage': {
      const videos = await prisma.video.findMany({
        where: { channel: { userId } },
        select: { fileSize: true, thumbnailSize: true },
      });
      const usedMB = videos.reduce((acc, v) => acc + (v.fileSize || 0) + (v.thumbnailSize || 0), 0) / (1024 * 1024);
      const additionalMB = (additionalBytes || 0) / (1024 * 1024);
      const limit = subscription.plan.maxStorageMB;
      return {
        allowed: usedMB + additionalMB <= limit,
        current: Math.round(usedMB * 100) / 100,
        limit,
        reason: usedMB + additionalMB > limit ? `Storage limit (${limit}MB) reached. Upgrade your plan.` : undefined,
      };
    }

    case 'ai': {
      const used = subscription.usage?.aiCreditsUsed || 0;
      const limit = subscription.plan.aiCreditsPerMonth;
      return {
        allowed: used < limit,
        current: used,
        limit,
        reason: used >= limit ? `AI credits limit (${limit}) reached. Upgrade your plan.` : undefined,
      };
    }

    default:
      return { allowed: false, reason: 'Invalid limit type' };
  }
}

export async function checkVideoFileSize(userId: string, fileSizeBytes: number): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: { plan: true },
  });

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription' };
  }

  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const limit = subscription.plan.maxVideoSizeMB;

  return {
    allowed: fileSizeMB <= limit,
    current: Math.round(fileSizeMB * 100) / 100,
    limit,
    reason: fileSizeMB > limit ? `Video size (${Math.round(fileSizeMB)}MB) exceeds limit (${limit}MB). Upgrade your plan.` : undefined,
  };
}

export async function incrementVideoCount(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: { usage: true },
  });

  if (subscription?.usage) {
    await prisma.usage.update({
      where: { id: subscription.usage.id },
      data: {
        videosThisMonth: { increment: 1 },
        videosUploaded: { increment: 1 },
      },
    });
  }
}

export async function incrementStorageUsed(userId: string, additionalBytes: number): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: { usage: true },
  });

  if (subscription?.usage) {
    const additionalMB = additionalBytes / (1024 * 1024);
    await prisma.usage.update({
      where: { id: subscription.usage.id },
      data: {
        storageUsedMB: { increment: additionalMB },
      },
    });
  }
}

export async function getRemainingCredits(userId: string): Promise<number> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    include: {
      plan: true,
      usage: true,
    },
  });

  if (!subscription) return 0;

  const used = subscription.usage?.aiCreditsUsed || 0;
  const limit = subscription.plan.aiCreditsPerMonth;

  return Math.max(0, limit - used);
}