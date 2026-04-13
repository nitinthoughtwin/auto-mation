import { NextRequest, NextResponse } from 'next/server';
import { processScheduledUploads } from '@/lib/scheduler';
import Redis from 'ioredis';

async function pingRedis() {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) return;
  const redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 5000 });
  try {
    await redis.ping();
  } catch (err) {
    // Redis ping failed — log but don't crash the cron job
    console.warn('⚠️ Redis ping failed (non-critical):', (err as Error).message);
  } finally {
    redis.disconnect();
  }
}

// GET - Cron job endpoint for cron-job.org
// This endpoint is called automatically by cron-job.org on a schedule
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const urlSecret = request.nextUrl.searchParams.get('secret');
    
    // If CRON_SECRET is set, verify it
    if (cronSecret) {
      const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret;
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('🕐 Cron job triggered at:', new Date().toISOString());

    // Keep Redis active (prevents Upstash from archiving due to inactivity)
    await pingRedis();

    // Process scheduled uploads
    const result = await processScheduledUploads();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Cron job completed in ${duration}ms:`, result);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      processed: result.processed,
      skipped: result.skipped,
      results: result.results,
    });
    
  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST - Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}