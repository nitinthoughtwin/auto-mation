import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook request' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log('Razorpay webhook event:', event);

    switch (event) {
      case 'payment.authorized': {
        const payment = payload.payload.payment.entity;
        const orderId = payment.order_id;

        // Find payment by order ID
        const paymentRecord = await db.payment.findFirst({
          where: { razorpayOrderId: orderId },
          include: { subscription: true },
        });

        if (paymentRecord) {
          // Update payment
          await db.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: 'completed',
              razorpayPaymentId: payment.id,
              paymentMethod: payment.method,
            },
          });

          // Activate subscription
          await db.subscription.update({
            where: { id: paymentRecord.subscriptionId },
            data: {
              status: 'active',
              razorpaySubscriptionId: payment.subscription_id,
            },
          });
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payload.payment.entity;
        const orderId = payment.order_id;

        const paymentRecord = await db.payment.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (paymentRecord) {
          await db.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: 'failed',
              razorpayPaymentId: payment.id,
            },
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.payload.subscription.entity;
        const subId = subscription.id;

        await db.subscription.updateMany({
          where: { razorpaySubscriptionId: subId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
          },
        });
        break;
      }

      case 'subscription.charged': {
        const subscription = payload.payload.subscription.entity;
        const subId = subscription.id;

        // Update subscription period
        const currentPeriodEnd = new Date(subscription.current_end * 1000);
        
        await db.subscription.updateMany({
          where: { razorpaySubscriptionId: subId },
          data: {
            currentPeriodEnd,
            status: 'active',
          },
        });

        // Reset usage for new period
        const sub = await db.subscription.findFirst({
          where: { razorpaySubscriptionId: subId },
          include: { usage: true },
        });

        if (sub?.usage) {
          await db.usage.update({
            where: { id: sub.usage.id },
            data: {
              videosThisMonth: 0,
              aiCreditsUsed: 0,
              lastResetAt: new Date(),
            },
          });
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
