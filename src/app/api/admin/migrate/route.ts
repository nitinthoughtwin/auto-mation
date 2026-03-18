import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API endpoint to add missing database columns or reset database
// This works by checking the current schema and adding any missing columns
export async function POST(request: NextRequest) {
  try {
    // Check for secret key to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.MIGRATION_SECRET || 'gpmart-migrate-2024';
    
    if (authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a reset request
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body, continue with migration
    }

    // Reset database - delete all records
    if (body.action === 'reset') {
      console.log('[Migration] Resetting database...');
      
      // Delete all videos first (foreign key constraint)
      const deletedVideos = await db.video.deleteMany({});
      console.log(`[Migration] Deleted ${deletedVideos.count} videos`);
      
      // Delete all channels
      const deletedChannels = await db.channel.deleteMany({});
      console.log(`[Migration] Deleted ${deletedChannels.count} channels`);
      
      // Delete all drive videos
      const deletedDriveVideos = await db.driveVideo.deleteMany({});
      console.log(`[Migration] Deleted ${deletedDriveVideos.count} drive videos`);
      
      // Delete all scheduler logs
      const deletedLogs = await db.schedulerLog.deleteMany({});
      console.log(`[Migration] Deleted ${deletedLogs.count} scheduler logs`);

      return NextResponse.json({
        success: true,
        message: 'Database reset complete',
        deleted: {
          videos: deletedVideos.count,
          channels: deletedChannels.count,
          driveVideos: deletedDriveVideos.count,
          schedulerLogs: deletedLogs.count
        }
      });
    }

    console.log('[Migration] Starting database schema update...');
    const results: string[] = [];

    // Get current Video table columns
    const videoColumns = await db.$queryRaw<Array<{ name: string; type: string }>>`
      PRAGMA table_info(Video);
    `;
    
    const existingColumns = videoColumns.map(c => c.name);
    console.log('[Migration] Existing Video columns:', existingColumns);

    // Define required columns for Video table
    const requiredVideoColumns = [
      { name: 'driveFileId', sql: 'ALTER TABLE Video ADD COLUMN driveFileId TEXT;' },
      { name: 'driveWebViewLink', sql: 'ALTER TABLE Video ADD COLUMN driveWebViewLink TEXT;' },
      { name: 'thumbnailDriveId', sql: 'ALTER TABLE Video ADD COLUMN thumbnailDriveId TEXT;' },
    ];

    // Add missing columns
    for (const col of requiredVideoColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`[Migration] Adding column: ${col.name}`);
        try {
          await db.$executeRawUnsafe(col.sql);
          results.push(`Added column: ${col.name}`);
        } catch (err: any) {
          if (err.message.includes('duplicate column')) {
            results.push(`Column already exists: ${col.name}`);
          } else {
            results.push(`Error adding ${col.name}: ${err.message}`);
          }
        }
      } else {
        results.push(`Column exists: ${col.name}`);
      }
    }

    // Check DriveVideo table exists
    try {
      const driveVideoColumns = await db.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info(DriveVideo);
      `;
      results.push(`DriveVideo table exists with ${driveVideoColumns.length} columns`);
    } catch (err: any) {
      // Table doesn't exist, create it
      console.log('[Migration] Creating DriveVideo table...');
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS DriveVideo (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          channelId TEXT,
          driveFileId TEXT UNIQUE,
          name TEXT NOT NULL,
          mimeType TEXT NOT NULL,
          webViewLink TEXT,
          thumbnailLink TEXT,
          size INTEGER,
          createdTime DATETIME,
          addedToQueue BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      results.push('Created DriveVideo table');
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema update completed',
      results,
      currentVideoColumns: existingColumns
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check current schema
export async function GET(request: NextRequest) {
  try {
    const videoColumns = await db.$queryRaw<Array<{ name: string; type: string }>>`
      PRAGMA table_info(Video);
    `;

    let driveVideoColumns: Array<{ name: string; type: string }> = [];
    try {
      driveVideoColumns = await db.$queryRaw`
        PRAGMA table_info(DriveVideo);
      `;
    } catch {
      // Table doesn't exist
    }

    return NextResponse.json({
      success: true,
      videoTable: videoColumns,
      driveVideoTable: driveVideoColumns.length > 0 ? driveVideoColumns : 'Table does not exist'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}