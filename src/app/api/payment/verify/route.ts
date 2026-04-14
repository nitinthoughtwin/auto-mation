import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Demo mode - enable when real credentials are not configured
const isDemoMode = !RAZORPAY_KEY_SECRET ||
  RAZORPAY_KEY_SECRET === 'YOUR_RAZORPAY_KEY_SECRET';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      demoMode,
    } = body;

    console.log('[Payment Verify] Received:', { razorpay_order_id, razorpay_payment_id, demoMode });

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Handle demo mode
    if (demoMode || isDemoMode || razorpay_order_id.startsWith('demo_order_')) {
      return await handleDemoVerify(razorpay_order_id, razorpay_payment_id);
    }

    // Real Razorpay verification
    if (!RAZORPAY_KEY_SECRET) {
      console.error('[Payment Verify] RAZORPAY_KEY_SECRET not set');
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    if (!razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment signature' },
        { status: 400 }
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[Payment Verify] Signature mismatch');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    return await completePaymentVerification(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } catch (error) {
    console.error('[Payment Verify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

// Demo verification handler
async function handleDemoVerify(orderId: string, paymentId: string) {
  // Find the payment record
  const payment = await db.payment.findFirst({
    where: { razorpayOrderId: orderId },
    include: {
      subscription: true,
    },
  });

  if (!payment) {
    console.error('[Payment Verify Demo] Payment record not found for order:', orderId);
    return NextResponse.json(
      { error: 'Payment record not found' },
      { status: 404 }
    );
  }

  console.log('[Payment Verify Demo] Found payment:', payment.id);

  // Generate demo signature
  const demoSignature = `demo_sig_${Date.now()}`;

  // Update payment status
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      razorpayPaymentId: paymentId,
      razorpaySignature: demoSignature,
      paymentMethod: 'demo',
    },
  });

  // Cancel all other active/trialing subscriptions for this user (now that payment succeeded)
  await db.subscription.updateMany({
    where: {
      userId: payment.subscription.userId,
      status: { in: ['active', 'trialing'] },
      id: { not: payment.subscriptionId },
    },
    data: { status: 'cancelled' },
  });

  // Activate subscription
  await db.subscription.update({
    where: { id: payment.subscriptionId },
    data: {
      status: 'active',
      razorpaySubscriptionId: paymentId,
    },
  });

  console.log('[Payment Verify Demo] Subscription activated:', payment.subscriptionId);

  return NextResponse.json({
    success: true,
    demoMode: true,
    message: 'Demo payment verified successfully. This is a test payment.',
  });
}

// Real payment verification
async function completePaymentVerification(
  orderId: string,
  paymentId: string,
  signature: string
) {
  // Find the payment record
  const payment = await db.payment.findFirst({
    where: { razorpayOrderId: orderId },
    include: {
      subscription: true,
    },
  });

  if (!payment) {
    console.error('[Payment Verify] Payment record not found for order:', orderId);
    return NextResponse.json(
      { error: 'Payment record not found' },
      { status: 404 }
    );
  }

  console.log('[Payment Verify] Found payment:', payment.id);

  // Update payment status
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      paymentMethod: 'razorpay',
    },
  });

  // Cancel all other active/trialing subscriptions for this user (now that payment succeeded)
  await db.subscription.updateMany({
    where: {
      userId: payment.subscription.userId,
      status: { in: ['active', 'trialing'] },
      id: { not: payment.subscriptionId },
    },
    data: { status: 'cancelled' },
  });

  // Activate subscription
  await db.subscription.update({
    where: { id: payment.subscriptionId },
    data: {
      status: 'active',
      razorpaySubscriptionId: paymentId,
    },
  });

  console.log('[Payment Verify] Subscription activated:', payment.subscriptionId);

  return NextResponse.json({
    success: true,
    message: 'Payment verified successfully',
  });
}
