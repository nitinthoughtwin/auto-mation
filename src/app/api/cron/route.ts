import { NextRequest, NextResponse } from 'next/server';
import { processScheduledUploads } from '@/lib/scheduler';

/**
 * Cron Endpoint for External Schedulers
 * 
 * This endpoint is designed to be called by external cron services:
 * - cron-job.org
 * - Vercel Cron Jobs
 * - GitHub Actions Scheduled Workflows
 * - Any other cron service
 * 
 * Recommended interval: Every 5-15 minutes
 * 
 * Security: In production, add authorization header check
 */

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization for production
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Cron job triggered at:', new Date().toISOString());
    
    const result = await processScheduledUploads();
    
    console.log('Cron job completed:', result);
    
    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      message: `Scheduler completed: ${result.processed} uploaded, ${result.skipped} skipped`,
      ...result
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message || 'Cron job failed' 
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}