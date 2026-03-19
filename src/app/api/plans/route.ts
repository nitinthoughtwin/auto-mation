import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Parse features JSON and format prices
    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features),
      priceINR: plan.priceINR / 100, // Convert paise to rupees
      priceUSD: plan.priceUSD / 100, // Convert cents to dollars
      yearlyPriceINR: plan.yearlyDiscountPercent 
        ? Math.round((plan.priceINR * 12 * (100 - plan.yearlyDiscountPercent)) / 100 / 100)
        : Math.round((plan.priceINR * 12) / 100),
      yearlyPriceUSD: plan.yearlyDiscountPercent
        ? Math.round((plan.priceUSD * 12 * (100 - plan.yearlyDiscountPercent)) / 100 / 100)
        : Math.round((plan.priceUSD * 12) / 100),
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
