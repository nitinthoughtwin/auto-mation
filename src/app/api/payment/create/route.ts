import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { planId, billingPeriod } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get the plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Calculate amount
    const amount = billingPeriod === 'yearly'
      ? plan.priceINR * 12 * (100 - (plan.yearlyDiscountPercent || 0)) / 100
      : plan.priceINR;

    // Calculate GST (18%)
    const gstAmount = Math.round(amount * 0.18);
    const totalAmount = amount + gstAmount;

    // Create order in Razorpay
    const orderData = {
      amount: totalAmount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${session.user.id.slice(0, 8)}`,
      notes: {
        userId: session.user.id,
        planId: plan.id,
        planName: plan.name,
        billingPeriod,
      },
    };

    // Create order via Razorpay API
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      console.error('Razorpay order error:', error);
      return NextResponse.json(
        { error: 'Failed to create payment order' },
        { status: 500 }
      );
    }

    const order = await orderResponse.json();

    // Create subscription record (pending until payment verified)
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Cancel existing active subscriptions
    await db.subscription.updateMany({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'trialing'] },
      },
      data: { status: 'cancelled' },
    });

    const subscription = await db.subscription.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        status: 'pending',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        razorpayPlanId: plan.id,
      },
    });

    // Create payment record
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const payment = await db.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: totalAmount,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: order.id,
        gstAmount,
        gstPercentage: 18.0,
        invoiceNumber,
      },
    });

    // Create usage record
    await db.usage.create({
      data: {
        subscriptionId: subscription.id,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      paymentId: payment.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}