import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const plans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Try out YouTube automation',
    priceINR: 0,
    priceUSD: 0,
    yearlyDiscountPercent: null,
    maxVideosPerMonth: 3,
    maxChannels: 1,
    maxStorageMB: 512,
    maxVideoSizeMB: 100,
    aiCreditsPerMonth: 0,
    features: JSON.stringify([
      '1 YouTube channel',
      '3 video uploads/month',
      'Basic scheduling (daily)',
      '512 MB storage',
      'No AI metadata generation',
      'Community support',
    ]),
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'For individual creators getting started',
    priceINR: 9900,   // ₹99 in paise
    priceUSD: 119,
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 10,
    maxChannels: 1,
    maxStorageMB: 2048,
    maxVideoSizeMB: 300,
    aiCreditsPerMonth: 5,
    features: JSON.stringify([
      '1 YouTube channel',
      '10 video uploads/month',
      'All scheduling options',
      '5 AI title & description credits/month',
      '2 GB storage',
      'Google Drive import',
      'Email support',
    ]),
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'basic',
    displayName: 'Basic',
    description: 'Grow your channel with more uploads',
    priceINR: 29900,  // ₹299 in paise
    priceUSD: 359,
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 30,
    maxChannels: 1,
    maxStorageMB: 5120,
    maxVideoSizeMB: 500,
    aiCreditsPerMonth: 15,
    features: JSON.stringify([
      '1 YouTube channel',
      '30 video uploads/month',
      'All scheduling options',
      '15 AI title & description credits/month',
      '5 GB storage',
      'Google Drive import (unlimited)',
      'Bulk video upload',
      'Custom thumbnails',
      'Priority email support',
    ]),
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'Manage multiple channels like a pro',
    priceINR: 49900,  // ₹499 in paise
    priceUSD: 599,
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 60,  // 30 per channel × 2 channels
    maxChannels: 2,
    maxStorageMB: 10240,
    maxVideoSizeMB: 1024,
    aiCreditsPerMonth: 30,
    features: JSON.stringify([
      '2 YouTube channels',
      '30 video uploads/month per channel',
      'All scheduling options',
      '30 AI title & description credits/month',
      '10 GB storage',
      'Google Drive import (unlimited)',
      'Bulk video upload',
      'Custom thumbnails',
      'Priority support',
    ]),
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'premium',
    displayName: 'Premium',
    description: 'Scale across 5 channels effortlessly',
    priceINR: 99900,  // ₹999 in paise
    priceUSD: 1199,
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 150, // 30 per channel × 5 channels
    maxChannels: 5,
    maxStorageMB: 25600,
    maxVideoSizeMB: 2048,
    aiCreditsPerMonth: 75,
    features: JSON.stringify([
      '5 YouTube channels',
      '30 video uploads/month per channel',
      'All scheduling options',
      '75 AI title & description credits/month',
      '25 GB storage',
      'Google Drive import (unlimited)',
      'Bulk video upload',
      'Custom thumbnails',
      'Dedicated support',
      'Early access to new features',
    ]),
    isActive: true,
    sortOrder: 4,
  },
];

async function main() {
  console.log('Seeding plans...');

  for (const plan of plans) {
    const existing = await db.plan.findUnique({ where: { name: plan.name } });

    if (existing) {
      await db.plan.update({
        where: { name: plan.name },
        data: plan,
      });
      console.log(`Updated plan: ${plan.displayName}`);
    } else {
      await db.plan.create({ data: plan });
      console.log(`Created plan: ${plan.displayName}`);
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
