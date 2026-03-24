import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List all plans
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await db.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

// POST - Create new plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      displayName,
      description,
      priceINR,
      priceUSD,
      yearlyPriceINR,
      yearlyPriceUSD,
      yearlyDiscountPercent,
      maxVideosPerMonth,
      maxChannels,
      maxStorageMB,
      maxVideoSizeMB,
      aiCreditsPerMonth,
      features,
      isActive,
      sortOrder
    } = body;

    // Validate required fields
    if (!name || !displayName) {
      return NextResponse.json(
        { error: 'Name and display name are required' },
        { status: 400 }
      );
    }

    // Check if plan name already exists
    const existingPlan = await db.plan.findUnique({
      where: { name }
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Plan with this name already exists' },
        { status: 400 }
      );
    }

    const plan = await db.plan.create({
      data: {
        name,
        displayName,
        description: description || null,
        priceINR: parseInt(priceINR) || 0,
        priceUSD: parseInt(priceUSD) || 0,
        yearlyPriceINR: parseInt(yearlyPriceINR) || 0,
        yearlyPriceUSD: parseInt(yearlyPriceUSD) || 0,
        yearlyDiscountPercent: yearlyDiscountPercent ? parseInt(yearlyDiscountPercent) : null,
        maxVideosPerMonth: parseInt(maxVideosPerMonth) || 10,
        maxChannels: parseInt(maxChannels) || 1,
        maxStorageMB: parseInt(maxStorageMB) || 500,
        maxVideoSizeMB: parseInt(maxVideoSizeMB) || 100,
        aiCreditsPerMonth: parseInt(aiCreditsPerMonth) || 10,
        features: JSON.stringify(features || []),
        isActive: isActive ?? true,
        sortOrder: parseInt(sortOrder) || 0
      }
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}