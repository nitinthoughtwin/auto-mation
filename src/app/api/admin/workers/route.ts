import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startWorkers, stopWorkers } from '@/lib/workers';
import { getQueueStats, QUEUE_NAMES } from '@/lib/queue';

// Track if workers have been started
let workersInstance: ReturnType<typeof startWorkers> | null = null;

// GET - Get worker and queue stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const queueStats = await getQueueStats();
    const redisConfigured = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

    return NextResponse.json({
      success: true,
      redis: {
        configured: redisConfigured,
        url: redisConfigured ? '(configured)' : '(not configured)',
      },
      workers: {
        running: workersInstance !== null,
        queues: Object.values(QUEUE_NAMES),
      },
      stats: queueStats,
    });
  } catch (error: any) {
    console.error('[Admin Workers] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get worker stats' },
      { status: 500 }
    );
  }
}

// POST - Start/Stop workers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      if (workersInstance) {
        return NextResponse.json({
          success: true,
          message: 'Workers already running',
        });
      }

      workersInstance = startWorkers();

      return NextResponse.json({
        success: true,
        message: 'Workers started',
        workers: {
          email: workersInstance.email !== null,
          payment: workersInstance.payment !== null,
          subscription: workersInstance.subscription !== null,
          video: workersInstance.video !== null,
        },
      });
    }

    if (action === 'stop') {
      if (!workersInstance) {
        return NextResponse.json({
          success: true,
          message: 'Workers not running',
        });
      }

      await stopWorkers(workersInstance);
      workersInstance = null;

      return NextResponse.json({
        success: true,
        message: 'Workers stopped',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Workers] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manage workers' },
      { status: 500 }
    );
  }
}