import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get user's payment history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscriptions
    const subscriptions = await db.subscription.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const subscriptionIds = subscriptions.map(s => s.id);

    // Get payments for all user's subscriptions
    const payments = await db.payment.findMany({
      where: {
        subscriptionId: { in: subscriptionIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}