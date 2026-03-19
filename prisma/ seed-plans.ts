import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'free',
    displayName: 'Free Plan',
    description: 'Perfect for getting started with YouTube automation',
    priceINR: 0,
    priceUSD: 0,
    maxVideosPerMonth: 10,
    maxChannels: 1,
    maxStorageMB: 500,
    aiCreditsPerMonth: 10,
    maxVideoSizeMB: 100,
    features: JSON.stringify([
      '10 videos per month',
      '1 YouTube channel',
      '500MB storage',
      '10 AI title generations',
      'Basic scheduling',
      'Email support',
    ]),
    sortOrder: 1,
  },
  {
    name: 'pro',
    displayName: 'Pro Plan',
    description: 'For creators who want to scale their content',
    priceINR: 49900, // ₹499 in paise
    priceUSD: 599, // $5.99 in cents
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 100,
    maxChannels: 3,
    maxStorageMB: 5000, // 5GB
    aiCreditsPerMonth: 100,
    maxVideoSizeMB: 500,
    features: JSON.stringify([
      '100 videos per month',
      '3 YouTube channels',
      '5GB storage',
      '100 AI title generations',
      'Advanced scheduling',
      'Random delay feature',
      'Priority support',
      'Video analytics',
    ]),
    sortOrder: 2,
  },
  {
    name: 'premium',
    displayName: 'Premium Plan',
    description: 'For power users and agencies',
    priceINR: 149900, // ₹1,499 in paise
    priceUSD: 1799, // $17.99 in cents
    yearlyDiscountPercent: 25,
    maxVideosPerMonth: 1000,
    maxChannels: 10,
    maxStorageMB: 50000, // 50GB
    aiCreditsPerMonth: 1000,
    maxVideoSizeMB: 2000, // 2GB per video
    features: JSON.stringify([
      '1000 videos per month',
      '10 YouTube channels',
      '50GB storage',
      '1000 AI title generations',
      'Priority upload scheduling',
      'All Pro features',
      'Facebook & Instagram support',
      'Multi-platform streaming',
      'API access',
      'Dedicated support',
      'Custom integrations',
    ]),
    sortOrder: 3,
  },
];

async function main() {
  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });

    if (existing) {
      await prisma.plan.update({
        where: { name: plan.name },
        data: plan,
      });
      console.log(`Updated plan: ${plan.displayName}`);
    } else {
      await prisma.plan.create({
        data: plan,
      });
      console.log(`Created plan: ${plan.displayName}`);
    }
  }

  console.log('Done seeding plans!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });