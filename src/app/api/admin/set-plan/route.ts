import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/admin/set-plan
 * Body: { planName: string, userId?: string }
 *
 * Assigns a plan to a user without payment — for manual testing only.
 * Requires admin role.
 *
 * planName values: "free" | "starter" | "basic" | "pro" | "premium"
 * (or whatever names are in your Plan table)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { planName, userId } = await request.json();
  const targetUserId = userId || session.user.id;

  if (!planName) {
    return NextResponse.json({ error: 'planName is required' }, { status: 400 });
  }

  const plan = await db.plan.findFirst({ where: { name: planName, isActive: true } });
  if (!plan) {
    const allPlans = await db.plan.findMany({ select: { name: true } });
    return NextResponse.json({
      error: `Plan "${planName}" not found`,
      availablePlans: allPlans.map((p) => p.name),
    }, { status: 404 });
  }

  // Delete existing active subscriptions for this user
  const existing = await db.subscription.findMany({
    where: { userId: targetUserId },
    include: { usage: true },
  });
  for (const sub of existing) {
    if (sub.usage) await db.usage.delete({ where: { subscriptionId: sub.id } });
    await db.subscription.delete({ where: { id: sub.id } });
  }

  // Create a fresh 1-year active subscription
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const subscription = await db.subscription.create({
    data: {
      userId: targetUserId,
      planId: plan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  await db.usage.create({
    data: {
      subscriptionId: subscription.id,
      videosUploaded: 0,
      videosThisMonth: 0,
      channelsConnected: 0,
      storageUsedMB: 0,
      aiCreditsUsed: 0,
      lastResetAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    plan: plan.name,
    displayName: plan.displayName,
    limits: {
      maxChannels: plan.maxChannels,
      maxVideosPerMonth: plan.maxVideosPerMonth,
      maxStorageMB: plan.maxStorageMB,
      aiCreditsPerMonth: plan.aiCreditsPerMonth,
    },
    periodEnd,
  });
}

/** GET /api/admin/set-plan — list available plans */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const plans = await db.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      name: true,
      displayName: true,
      priceINR: true,
      maxChannels: true,
      maxVideosPerMonth: true,
      maxStorageMB: true,
      aiCreditsPerMonth: true,
    },
  });

  return NextResponse.json({ plans });
}
