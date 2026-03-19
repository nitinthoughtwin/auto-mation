import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get current usage for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscription with plan limits
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'trialing'] },
      },
      include: {
        plan: true,
        usage: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get actual counts from database
    const channelCount = await prisma.channel.count({
      where: { userId: session.user.id },
    });

    const videoCountThisMonth = await prisma.video.count({
      where: {
        channel: { userId: session.user.id },
        createdAt: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd,
        },
      },
    });

    // Calculate total storage used
    const videos = await prisma.video.findMany({
      where: { channel: { userId: session.user.id } },
      select: { fileSize: true, thumbnailSize: true },
    });

    const totalStorageBytes = videos.reduce((acc, v) => {
      return acc + (v.fileSize || 0) + (v.thumbnailSize || 0);
    }, 0);
    const storageUsedMB = totalStorageBytes / (1024 * 1024);

    // Update usage record
    if (subscription.usage) {
      await prisma.usage.update({
        where: { id: subscription.usage.id },
        data: {
          videosThisMonth: videoCountThisMonth,
          channelsConnected: channelCount,
          storageUsedMB,
          updatedAt: new Date(),
        },
      });
    }

    // Calculate usage percentages
    const usage = {
      videos: {
        used: videoCountThisMonth,
        limit: subscription.plan.maxVideosPerMonth,
        percent: Math.round((videoCountThisMonth / subscription.plan.maxVideosPerMonth) * 100),
      },
      channels: {
        used: channelCount,
        limit: subscription.plan.maxChannels,
        percent: Math.round((channelCount / subscription.plan.maxChannels) * 100),
      },
      storage: {
        usedMB: Math.round(storageUsedMB * 100) / 100,
        limitMB: subscription.plan.maxStorageMB,
        percent: Math.round((storageUsedMB / subscription.plan.maxStorageMB) * 100),
      },
      aiCredits: {
        used: subscription.usage?.aiCreditsUsed || 0,
        limit: subscription.plan.aiCreditsPerMonth,
        percent: Math.round(((subscription.usage?.aiCreditsUsed || 0) / subscription.plan.aiCreditsPerMonth) * 100),
      },
    };

    // Check if limits exceeded
    const limitsExceeded = {
      videos: videoCountThisMonth >= subscription.plan.maxVideosPerMonth,
      channels: channelCount >= subscription.plan.maxChannels,
      storage: storageUsedMB >= subscription.plan.maxStorageMB,
      aiCredits: (subscription.usage?.aiCreditsUsed || 0) >= subscription.plan.aiCreditsPerMonth,
    };

    return NextResponse.json({
      usage,
      limitsExceeded,
      plan: {
        name: subscription.plan.name,
        displayName: subscription.plan.displayName,
      },
      periodEnd: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}

// Increment AI credits usage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { credits = 1 } = body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'trialing'] },
      },
      include: {
        plan: true,
        usage: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      );
    }

    // Check if credits available
    const currentUsage = subscription.usage?.aiCreditsUsed || 0;
    const limit = subscription.plan.aiCreditsPerMonth;

    if (currentUsage + credits > limit) {
      return NextResponse.json(
        { error: 'AI credits limit exceeded', limit, used: currentUsage },
        { status: 403 }
      );
    }

    // Update usage
    if (subscription.usage) {
      await prisma.usage.update({
        where: { id: subscription.usage.id },
        data: {
          aiCreditsUsed: { increment: credits },
        },
      });
    } else {
      await prisma.usage.create({
        data: {
          subscriptionId: subscription.id,
          aiCreditsUsed: credits,
        },
      });
    }

    return NextResponse.json({ 
      success: true,
      creditsUsed: credits,
      remaining: limit - currentUsage - credits,
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    );
  }
}