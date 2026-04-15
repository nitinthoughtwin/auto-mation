import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const videos = await db.video.findMany({
    where: { uploadedVideoId: { not: null } },
    select: { id: true, title: true, status: true, uploadedVideoId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  console.log('Recent uploaded videos:');
  videos.forEach(v => {
    console.log(`  id: ${v.id} | ytId: ${v.uploadedVideoId} | status: ${v.status} | "${v.title}"`);
  });

  await db.$disconnect();
}

main().catch(async e => { console.error(e); await db.$disconnect(); });
