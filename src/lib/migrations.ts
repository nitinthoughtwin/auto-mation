import 'server-only';
import { db } from './db';

let migrationRan = false;

// Run database migrations on startup
// This adds missing columns without resetting data
export async function runMigrations() {
  if (migrationRan) return;
  migrationRan = true;

  try {
    console.log('[Migration] Checking database schema...');

    // Get current Video table columns
    const videoColumns = await db.$queryRaw<Array<{ name: string }>>`
      PRAGMA table_info(Video);
    `;
    
    const existingColumns = videoColumns.map(c => c.name);

    // Define required columns for Video table
    const requiredColumns = [
      { name: 'driveFileId', sql: 'ALTER TABLE Video ADD COLUMN driveFileId TEXT' },
      { name: 'driveWebViewLink', sql: 'ALTER TABLE Video ADD COLUMN driveWebViewLink TEXT' },
      { name: 'thumbnailDriveId', sql: 'ALTER TABLE Video ADD COLUMN thumbnailDriveId TEXT' },
    ];

    // Add missing columns
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`[Migration] Adding missing column: ${col.name}`);
        try {
          await db.$executeRawUnsafe(col.sql);
          console.log(`[Migration] ✅ Added column: ${col.name}`);
        } catch (err: any) {
          if (!err.message.includes('duplicate column')) {
            console.error(`[Migration] ❌ Error adding ${col.name}:`, err.message);
          }
        }
      }
    }

    // Check DriveVideo table exists
    try {
      await db.$queryRaw`SELECT 1 FROM DriveVideo LIMIT 1`;
    } catch {
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
        )
      `);
      console.log('[Migration] ✅ Created DriveVideo table');
    }

    console.log('[Migration] Database schema check complete');
  } catch (error) {
    console.error('[Migration] Error:', error);
  }
}