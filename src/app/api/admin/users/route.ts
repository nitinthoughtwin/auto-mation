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

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
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
          select: {
            status: true,
            plan: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Flatten subscriptions array → single subscription object for the frontend
    const formatted = users.map((u) => ({
      ...u,
      subscription: u.subscriptions[0] ?? null,
      subscriptions: undefined,
    }));

    return NextResponse.json({ users: formatted });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
