import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Active plans — Free + Pro only
const activePlans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Get started with YouTube automation',
    priceINR: 0,
    priceUSD: 0,
    yearlyPriceINR: 0,
    yearlyPriceUSD: 0,
    yearlyDiscountPercent: null,
    maxVideosPerMonth: 3,
    maxChannels: 1,
    maxStorageMB: 1024,
    maxVideoSizeMB: 500,
    aiCreditsPerMonth: 0,
    features: JSON.stringify([
      '1 YouTube channel',
      '3 video uploads/month',
      'All schedule types',
      'Google Drive import',
      'Video library access',
      'No AI metadata generation',
    ]),
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'For serious creators who want more uploads',
    priceINR: 19900,       // ₹199/month in paise
    priceUSD: 299,
    yearlyPriceINR: 49900, // ₹499/3 months in paise (quarterly)
    yearlyPriceUSD: 599,
    yearlyDiscountPercent: 16, // Save ₹98 vs 3×₹199 = ₹597
    maxVideosPerMonth: 30,
    maxChannels: 1,
    maxStorageMB: 10240,
    maxVideoSizeMB: 2048,
    aiCreditsPerMonth: 9999, // Effectively unlimited
    features: JSON.stringify([
      '1 YouTube channel',
      '30 video uploads/month',
      'All schedule types',
      'Google Drive import',
      'Video library access',
      'Unlimited AI title & description',
    ]),
    isActive: true,
    sortOrder: 1,
  },
];

// Old plans to deactivate (keep records for existing subscribers)
const deactivatePlans = ['starter', 'basic', 'premium'];

async function main() {
  console.log('Seeding plans...');

  for (const plan of activePlans) {
    const existing = await db.plan.findUnique({ where: { name: plan.name } });
    if (existing) {
      await db.plan.update({ where: { name: plan.name }, data: plan });
      console.log(`Updated plan: ${plan.displayName}`);
    } else {
      await db.plan.create({ data: plan });
      console.log(`Created plan: ${plan.displayName}`);
    }
  }

  // Deactivate old plans so they don't appear on pricing page
  for (const name of deactivatePlans) {
    const existing = await db.plan.findUnique({ where: { name } });
    if (existing) {
      await db.plan.update({ where: { name }, data: { isActive: false } });
      console.log(`Deactivated plan: ${name}`);
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
