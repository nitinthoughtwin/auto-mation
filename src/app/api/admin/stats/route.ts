import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total users
    const totalUsers = await db.user.count();

    // Get total subscriptions
    const totalSubscriptions = await db.subscription.count();
    const activeSubscriptions = await db.subscription.count({
      where: { status: 'active' },
    });

    // Get total revenue
    const payments = await db.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });
    const totalRevenue = payments._sum.amount || 0;

    // Get total videos
    const totalVideos = await db.video.count();

    // Get total channels
    const totalChannels = await db.channel.count();

    // Get recent users
    const recentUsers = await db.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Get recent payments
    const recentPayments = await db.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { status: 'completed' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      totalUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      totalVideos,
      totalChannels,
      recentUsers,
      recentPayments,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}