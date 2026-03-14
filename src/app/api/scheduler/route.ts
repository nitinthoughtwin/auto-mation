import { NextRequest, NextResponse } from 'next/server';
import { processScheduledUploads } from '@/lib/scheduler';
import { db } from '@/lib/db';

// GET - Triggered by cron-job.org
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Scheduler] Triggered by cron-job.org at:', new Date().toISOString());
    
    const result = await processScheduledUploads();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({ 
      success: true, 
      message: `Scheduler completed: ${result.processed} uploaded, ${result.skipped} skipped`,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('[Scheduler] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Scheduler failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST - Manual trigger from dashboard
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Scheduler] Manual trigger at:', new Date().toISOString());
    
    const result = await processScheduledUploads();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({ 
      success: true, 
      message: `Scheduler completed: ${result.processed} uploaded, ${result.skipped} skipped`,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('[Scheduler] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Scheduler failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}