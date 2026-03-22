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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}