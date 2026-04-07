import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user
    const user = await db.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Delete user account and all associated data
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete in dependency order to avoid FK constraint errors
    // 1. Videos (via channels)
    const channels = await db.channel.findMany({
      where: { userId },
      select: { id: true },
    });
    const channelIds = channels.map(c => c.id);

    if (channelIds.length > 0) {
      await db.video.deleteMany({ where: { channelId: { in: channelIds } } });
      await db.schedulerLog.deleteMany({ where: { channelId: { in: channelIds } } });
      await db.channel.deleteMany({ where: { userId } });
    }

    // 2. Payments (via subscriptions)
    const subscriptions = await db.subscription.findMany({
      where: { userId },
      select: { id: true },
    });
    const subscriptionIds = subscriptions.map(s => s.id);

    if (subscriptionIds.length > 0) {
      await db.payment.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
      await db.usage.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
      await db.subscription.deleteMany({ where: { userId } });
    }

    // 3. Auth records (Account + Session have onDelete: Cascade, but be explicit)
    await db.account.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });

    // 4. Delete the user
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}