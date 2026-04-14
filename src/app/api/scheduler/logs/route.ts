import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only return logs for channels belonging to this user
    const userChannels = await db.channel.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const channelIds = userChannels.map(c => c.id);

    const logs = await db.schedulerLog.findMany({
      where: { channelId: { in: channelIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('[Scheduler Logs] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
