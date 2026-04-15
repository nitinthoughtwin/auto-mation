import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const channels = await db.channel.findMany({
    select: { id: true, name: true, lastUploadDate: true },
  });

  console.log('Current channels:');
  channels.forEach(c => {
    console.log(`  ${c.name} — lastUploadDate: ${c.lastUploadDate ?? 'NULL'}`);
  });

  // Set lastUploadDate to yesterday so cron uploads today at scheduled time
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await db.channel.updateMany({
    where: { lastUploadDate: null },
    data: { lastUploadDate: yesterday },
  });

  console.log(`\n✅ Set lastUploadDate = yesterday (${yesterday.toISOString()}) for all channels with null value`);
  console.log('Cron will upload at next scheduled time today/tomorrow.');

  await db.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
