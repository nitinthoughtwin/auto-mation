import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  const root = path.join(__dirname, '..');

  // ── Import VideoCategories ──
  console.log('Importing video_categories...');
  const categories = parseCSV(path.join(root, 'video_categories.csv'));
  let catOk = 0, catSkip = 0;
  for (const row of categories) {
    if (!row.id || !row.name) continue;
    try {
      await db.videoCategory.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          name: row.name,
          description: row.description || null,
          thumbnailUrl: row.thumbnailUrl || null,
          driveUrl: row.driveUrl || '',
          folderId: row.folderId || null,
          isActive: row.isActive === 'true',
          sortOrder: parseInt(row.sortOrder) || 0,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      catOk++;
    } catch (e: any) {
      console.error(`  Skip category "${row.name}": ${e.message}`);
      catSkip++;
    }
  }
  console.log(`  ✅ ${catOk} imported, ${catSkip} skipped`);

  // ── Import LibraryVideos ──
  console.log('Importing library_videos...');
  const videos = parseCSV(path.join(root, 'library_videos.csv'));
  let vidOk = 0, vidSkip = 0;
  for (const row of videos) {
    if (!row.id || !row.driveFileId || !row.categoryId) continue;
    // skip if category not imported
    const catExists = await db.videoCategory.findUnique({ where: { id: row.categoryId } });
    if (!catExists) { vidSkip++; continue; }
    try {
      await db.libraryVideo.upsert({
        where: { driveFileId: row.driveFileId },
        update: {},
        create: {
          id: row.id,
          categoryId: row.categoryId,
          driveFileId: row.driveFileId,
          name: row.name || '',
          mimeType: row.mimeType || 'video/mp4',
          size: row.size ? parseInt(row.size) : null,
          thumbnailLink: row.thumbnailLink || null,
          webViewLink: row.webViewLink || null,
          downloadUrl: row.downloadUrl || null,
          durationMillis: row.durationMillis ? parseInt(row.durationMillis) : null,
          createdTime: row.createdTime ? new Date(row.createdTime) : null,
          addedToQueue: row.addedToQueue === 'true',
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      vidOk++;
    } catch (e: any) {
      console.error(`  Skip video "${row.name}": ${e.message}`);
      vidSkip++;
    }
  }
  console.log(`  ✅ ${vidOk} imported, ${vidSkip} skipped`);

  console.log('\n🎉 Import complete!');
  await db.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
