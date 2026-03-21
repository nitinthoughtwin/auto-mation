import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const plans = [
  {
    id: 'plan-free-001',
    name: 'free',
    displayName: 'Free Plan',
    description: 'Perfect for getting started with YouTube automation',
    priceINR: 0,
    priceUSD: 0,
    yearlyPriceINR: 0,
    yearlyPriceUSD: 0,
    yearlyDiscountPercent: null,
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
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'plan-pro-001',
    name: 'pro',
    displayName: 'Pro Plan',
    description: 'For creators who want to scale their content',
    priceINR: 49900,
    priceUSD: 599,
    yearlyPriceINR: 479000,
    yearlyPriceUSD: 5750,
    yearlyDiscountPercent: 20,
    maxVideosPerMonth: 100,
    maxChannels: 3,
    maxStorageMB: 5000,
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
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'plan-premium-001',
    name: 'premium',
    displayName: 'Premium Plan',
    description: 'For power users and agencies',
    priceINR: 149900,
    priceUSD: 1799,
    yearlyPriceINR: 1349100,
    yearlyPriceUSD: 16191,
    yearlyDiscountPercent: 25,
    maxVideosPerMonth: 1000,
    maxChannels: 10,
    maxStorageMB: 50000,
    aiCreditsPerMonth: 1000,
    maxVideoSizeMB: 2000,
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
    isActive: true,
    sortOrder: 3,
  },
];

export async function GET() {
  try {
    console.log('[Seed Plans] Checking for existing plans...');
    
    const existingPlans = await db.plan.findMany();
    console.log(`[Seed Plans] Found ${existingPlans.length} existing plans`);

    if (existingPlans.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Plans already exist',
        count: existingPlans.length,
        plans: existingPlans.map(p => ({ name: p.name, displayName: p.displayName })),
      });
    }

    console.log('[Seed Plans] Seeding plans...');

    for (const plan of plans) {
      await db.plan.create({
        data: plan,
      });
      console.log(`[Seed Plans] Created: ${plan.displayName}`);
    }

    const allPlans = await db.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: 'Plans seeded successfully',
      count: allPlans.length,
      plans: allPlans.map(p => ({
        name: p.name,
        displayName: p.displayName,
        priceINR: p.priceINR / 100,
        yearlyPriceINR: p.yearlyPriceINR / 100,
      })),
    });
  } catch (error: any) {
    console.error('[Seed Plans] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}