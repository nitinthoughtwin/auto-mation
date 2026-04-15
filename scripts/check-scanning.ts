import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const scanning = await db.video.findMany({
    where: { status: 'scanning' },
    select: { id: true, title: true, status: true, uploadedVideoId: true, updatedAt: true, channel: { select: { name: true } } },
  });

  console.log(`Scanning videos: ${scanning.length}`);
  scanning.forEach(v => {
    const mins = Math.floor((Date.now() - new Date(v.updatedAt).getTime()) / 60000);
    console.log(`  "${v.title}" — uploadedVideoId: ${v.uploadedVideoId ?? 'NULL'} — ${mins} min ago — channel: ${v.channel.name}`);
  });

  await db.$disconnect();
}

main().catch(async e => { console.error(e); await db.$disconnect(); });
