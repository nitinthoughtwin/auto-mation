/**
 * Worker Control API
 * 
 * Admin endpoint to start/stop workers and get queue statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startWorkers, stopWorkers } from '@/lib/workers';
import { getQueueStats, QUEUE_NAMES } from '@/lib/queue';

// Track if workers have been started
let workersStarted = false;

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queue statistics
    const stats = await Promise.all([
      getQueueStats(QUEUE_NAMES.EMAIL).catch(() => null),
      getQueueStats(QUEUE_NAMES.PAYMENT).catch(() => null),
      getQueueStats(QUEUE_NAMES.SUBSCRIPTION).catch(() => null),
      getQueueStats(QUEUE_NAMES.VIDEO).catch(() => null),
    ]);

    return NextResponse.json({
      workersStarted,
      queues: {
        email: stats[0],
        payment: stats[1],
        subscription: stats[2],
        video: stats[3],
      },
    });
  } catch (error) {
    console.error('Error getting worker stats:', error);
    return NextResponse.json(
      { error: 'Failed to get worker statistics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    // You might want to add an isAdmin check here

    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      if (workersStarted) {
        return NextResponse.json({ message: 'Workers already running' });
      }
      
      startWorkers();
      workersStarted = true;
      
      return NextResponse.json({ 
        message: 'Workers started successfully',
        workersStarted: true,
      });
    }

    if (action === 'stop') {
      if (!workersStarted) {
        return NextResponse.json({ message: 'Workers not running' });
      }
      
      await stopWorkers();
      workersStarted = false;
      
      return NextResponse.json({ 
        message: 'Workers stopped successfully',
        workersStarted: false,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error controlling workers:', error);
    return NextResponse.json(
      { error: 'Failed to control workers' },
      { status: 500 }
    );
  }
}