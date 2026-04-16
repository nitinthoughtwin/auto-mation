// Usage: node scripts/insert-library-videos.mjs library_videos.tsv
// Requires: DATABASE_URL in .env

import { readFileSync } from 'fs';
import { createConnection } from 'pg';

// Read DATABASE_URL from .env
const envFile = readFileSync('.env', 'utf8');
const dbUrl = envFile.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
if (!dbUrl) { console.error('DATABASE_URL not found in .env'); process.exit(1); }

const tsvFile = process.argv[2];
if (!tsvFile) { console.error('Usage: node scripts/insert-library-videos.mjs <file.tsv>'); process.exit(1); }

const rows = readFileSync(tsvFile, 'utf8')
  .split('\n')
  .filter(line => line.trim())
  .map(line => line.split('\t'));

console.log(`Found ${rows.length} rows to insert`);

const client = new (await import('pg')).default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

let inserted = 0, skipped = 0;

// Insert in batches of 500
const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const values = [];
  const params = [];
  let p = 1;

  for (const row of batch) {
    const [id, categoryId, driveFileId, name, mimeType, size, thumbnailLink, webViewLink, downloadUrl, createdTime, addedToQueue, createdAt, updatedAt, durationMillis] = row;
    values.push(`($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`);
    params.push(
      id,
      categoryId,
      driveFileId,
      name,
      mimeType,
      size ? parseInt(size) : null,
      thumbnailLink || null,
      webViewLink || null,
      downloadUrl || null,
      createdTime || null,
      addedToQueue === 'true',
      createdAt || null,
      updatedAt || null,
      durationMillis ? parseInt(durationMillis) : null,
    );
  }

  try {
    const sql = `
      INSERT INTO library_videos
        (id, "categoryId", "driveFileId", name, "mimeType", size, "thumbnailLink", "webViewLink", "downloadUrl", "createdTime", "addedToQueue", "createdAt", "updatedAt", "durationMillis")
      VALUES ${values.join(',')}
      ON CONFLICT ("driveFileId") DO NOTHING
    `;
    const res = await client.query(sql, params);
    inserted += res.rowCount ?? batch.length;
    skipped += batch.length - (res.rowCount ?? 0);
    console.log(`Progress: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  } catch (err) {
    console.error(`Batch ${i}-${i + BATCH} failed:`, err.message);
  }
}

await client.end();
console.log(`\nDone! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
