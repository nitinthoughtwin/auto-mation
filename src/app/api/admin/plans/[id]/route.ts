import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get single plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}

// PUT - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if plan exists
    const existingPlan = await db.plan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (body.name && body.name !== existingPlan.name) {
      const nameExists = await db.plan.findUnique({
        where: { name: body.name }
      });
      if (nameExists) {
        return NextResponse.json(
          { error: 'Plan with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.priceINR !== undefined) updateData.priceINR = parseInt(body.priceINR) || 0;
    if (body.priceUSD !== undefined) updateData.priceUSD = parseInt(body.priceUSD) || 0;
    if (body.yearlyPriceINR !== undefined) updateData.yearlyPriceINR = parseInt(body.yearlyPriceINR) || 0;
    if (body.yearlyPriceUSD !== undefined) updateData.yearlyPriceUSD = parseInt(body.yearlyPriceUSD) || 0;
    if (body.yearlyDiscountPercent !== undefined) {
      updateData.yearlyDiscountPercent = body.yearlyDiscountPercent ? parseInt(body.yearlyDiscountPercent) : null;
    }
    if (body.maxVideosPerMonth !== undefined) updateData.maxVideosPerMonth = parseInt(body.maxVideosPerMonth) || 10;
    if (body.maxChannels !== undefined) updateData.maxChannels = parseInt(body.maxChannels) || 1;
    if (body.maxStorageMB !== undefined) updateData.maxStorageMB = parseInt(body.maxStorageMB) || 500;
    if (body.maxVideoSizeMB !== undefined) updateData.maxVideoSizeMB = parseInt(body.maxVideoSizeMB) || 100;
    if (body.aiCreditsPerMonth !== undefined) updateData.aiCreditsPerMonth = parseInt(body.aiCreditsPerMonth) || 10;
    if (body.features !== undefined) updateData.features = JSON.stringify(body.features);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = parseInt(body.sortOrder) || 0;

    const plan = await db.plan.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if plan exists
    const existingPlan = await db.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check if plan has active subscriptions
    if (existingPlan._count.subscriptions > 0) {
      return NextResponse.json(
        { error: `Cannot delete plan with ${existingPlan._count.subscriptions} existing subscriptions. Deactivate it instead.` },
        { status: 400 }
      );
    }

    await db.plan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}