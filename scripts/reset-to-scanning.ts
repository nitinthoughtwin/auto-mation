import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Reset these videos back to scanning so cron retries makeVideoPublic
  const videoIds = ['pllOi5niLKk', 'YQHxOQ2BfC4']; // YouTube video IDs

  const result = await db.video.updateMany({
    where: { uploadedVideoId: { in: videoIds } },
    data: {
      status: 'scanning',
      error: null,
      updatedAt: new Date(Date.now() - 15 * 60 * 1000), // set 15 min ago so timeout triggers immediately
    },
  });

  console.log(`✅ Reset ${result.count} videos to scanning`);
  await db.$disconnect();
}

main().catch(async e => { console.error(e); await db.$disconnect(); });
