import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get current user's subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find active subscription
    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'trialing'] },
      },
      include: {
        plan: true,
        usage: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      // Create free subscription if none exists
      const freePlan = await db.plan.findUnique({
        where: { name: 'free' },
      });

      if (!freePlan) {
        return NextResponse.json(
          { error: 'Free plan not found' },
          { status: 500 }
        );
      }

      const newSubscription = await db.subscription.create({
        data: {
          userId: session.user.id,
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        include: {
          plan: true,
          usage: true,
        },
      });

      // Create usage record
      await db.usage.create({
        data: {
          subscriptionId: newSubscription.id,
        },
      });

      return NextResponse.json({ 
        subscription: {
          ...newSubscription,
          plan: {
            ...newSubscription.plan,
            features: JSON.parse(newSubscription.plan.features),
          },
        },
      });
    }

    return NextResponse.json({ 
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// Cancel subscription
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Update subscription to cancel at period end
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription will be cancelled at the end of current period',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}