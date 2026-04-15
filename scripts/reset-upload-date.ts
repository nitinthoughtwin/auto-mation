import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const result = await db.channel.updateMany({
    data: { lastUploadDate: yesterday },
  });

  console.log(`✅ Reset ${result.count} channels lastUploadDate to yesterday`);
  await db.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
