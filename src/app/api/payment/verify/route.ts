import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log('[Payment Verify] Received:', { razorpay_order_id, razorpay_payment_id });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      console.error('[Payment Verify] RAZORPAY_KEY_SECRET not set');
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
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

    // Find the payment record
    const payment = await db.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        subscription: true,
      },
    });

    if (!payment) {
      console.error('[Payment Verify] Payment record not found for order:', razorpay_order_id);
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
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: 'razorpay',
      },
    });

    // Activate subscription
    await db.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: 'active',
        razorpaySubscriptionId: razorpay_payment_id,
      },
    });

    console.log('[Payment Verify] Subscription activated:', payment.subscriptionId);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('[Payment Verify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}