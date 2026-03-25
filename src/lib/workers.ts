/**
 * Queue Workers
 * 
 * These workers process jobs from the BullMQ queues.
 * Import and start these workers in your application startup.
 */

import { Job } from 'bullmq';
import {
  createEmailWorker,
  createPaymentWorker,
  createSubscriptionWorker,
  createVideoWorker,
} from './queue';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendPaymentReceiptEmail,
} from './email';
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

// Email worker processor
async function processEmailJob(job: Job): Promise<void> {
  const { type, to, subject, data } = job.data;

  console.log(`Processing email job: ${type} to ${to}`);

  try {
    switch (type) {
      case 'verification':
        await sendVerificationEmail(to, data.token as string, data.name as string);
        break;

      case 'password-reset':
        await sendPasswordResetEmail(to, data.token as string, data.name as string);
        break;

      case 'welcome':
        await sendWelcomeEmail(to, data.name as string);
        break;

      case 'subscription':
        await sendSubscriptionEmail(
          to,
          data.name as string,
          data.planName as string,
          data.type as 'started' | 'renewed' | 'expired'
        );
        break;

      case 'payment-receipt':
        await sendPaymentReceiptEmail(
          to,
          data.name as string,
          data.amount as number,
          data.planName as string,
          data.paymentId as string,
          data.date as string
        );
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    console.log(`Email job completed: ${type} to ${to}`);
  } catch (error) {
    console.error(`Email job failed: ${type} to ${to}`, error);
    Sentry.captureException(error, {
      tags: { job: 'email', type },
      extra: { to, subject },
    });
    throw error;
  }
}

// Payment worker processor
async function processPaymentJob(job: Job): Promise<void> {
  const { type, paymentId, subscriptionId, userId, data } = job.data;

  console.log(`Processing payment job: ${type} for user ${userId}`);

  try {
    switch (type) {
      case 'webhook':
        // Handle payment webhook
        // This would be called when a webhook needs async processing
        console.log('Processing webhook:', { paymentId, subscriptionId, userId });
        break;

      case 'subscription-check':
        // Check subscription status
        const subscription = await db.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
          include: {
            plan: true,
          },
        });

        if (subscription && subscription.endDate < new Date()) {
          // Subscription expired
          await db.subscription.update({
            where: { id: subscription.id },
            data: { status: 'EXPIRED' },
          });

          // Schedule notification
          console.log(`Subscription ${subscription.id} expired for user ${userId}`);
        }
        break;

      case 'renewal-reminder':
        // Send renewal reminder
        console.log('Sending renewal reminder:', { userId, subscriptionId });
        break;

      default:
        throw new Error(`Unknown payment job type: ${type}`);
    }

    console.log(`Payment job completed: ${type} for user ${userId}`);
  } catch (error) {
    console.error(`Payment job failed: ${type} for user ${userId}`, error);
    Sentry.captureException(error, {
      tags: { job: 'payment', type },
      extra: { paymentId, subscriptionId, userId },
    });
    throw error;
  }
}

// Subscription worker processor
async function processSubscriptionJob(job: Job): Promise<void> {
  const { type, subscriptionId, userId, planId } = job.data;

  console.log(`Processing subscription job: ${type} for user ${userId}`);

  try {
    switch (type) {
      case 'expire':
        // Mark subscription as expired
        await db.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'EXPIRED' },
        });
        console.log(`Subscription ${subscriptionId} expired`);
        break;

      case 'renew':
        // Handle subscription renewal
        const plan = await db.plan.findUnique({
          where: { id: planId },
        });

        if (!plan) {
          throw new Error(`Plan not found: ${planId}`);
        }

        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + plan.duration);

        await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'ACTIVE',
            endDate: newEndDate,
          },
        });
        console.log(`Subscription ${subscriptionId} renewed until ${newEndDate}`);
        break;

      case 'reminder':
        // Send expiration reminder
        console.log(`Sending expiration reminder for subscription ${subscriptionId}`);
        break;

      default:
        throw new Error(`Unknown subscription job type: ${type}`);
    }

    console.log(`Subscription job completed: ${type} for user ${userId}`);
  } catch (error) {
    console.error(`Subscription job failed: ${type} for user ${userId}`, error);
    Sentry.captureException(error, {
      tags: { job: 'subscription', type },
      extra: { subscriptionId, userId, planId },
    });
    throw error;
  }
}

// Video worker processor
async function processVideoJob(job: Job): Promise<void> {
  const { type, videoId, userId, data } = job.data;

  console.log(`Processing video job: ${type} for video ${videoId}`);

  try {
    switch (type) {
      case 'process':
        // Process video (e.g., extract metadata, generate thumbnail)
        console.log(`Processing video ${videoId}`);
        break;

      case 'thumbnail':
        // Generate thumbnail
        console.log(`Generating thumbnail for video ${videoId}`);
        break;

      case 'transcode':
        // Transcode video to different qualities
        console.log(`Transcoding video ${videoId}`);
        break;

      case 'delete':
        // Delete video and associated files
        console.log(`Deleting video ${videoId}`);
        break;

      default:
        throw new Error(`Unknown video job type: ${type}`);
    }

    console.log(`Video job completed: ${type} for video ${videoId}`);
  } catch (error) {
    console.error(`Video job failed: ${type} for video ${videoId}`, error);
    Sentry.captureException(error, {
      tags: { job: 'video', type },
      extra: { videoId, userId },
    });
    throw error;
  }
}

// Worker instances (lazy initialization)
let emailWorker: ReturnType<typeof createEmailWorker> | null = null;
let paymentWorker: ReturnType<typeof createPaymentWorker> | null = null;
let subscriptionWorker: ReturnType<typeof createSubscriptionWorker> | null = null;
let videoWorker: ReturnType<typeof createVideoWorker> | null = null;

/**
 * Start all workers
 * Call this in your application startup (e.g., in a custom server or API route)
 */
export function startWorkers(): void {
  if (emailWorker) {
    console.log('Workers already started');
    return;
  }

  console.log('Starting job queue workers...');

  // Start email worker
  emailWorker = createEmailWorker(processEmailJob);
  emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed`);
  });
  emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message);
  });

  // Start payment worker
  paymentWorker = createPaymentWorker(processPaymentJob);
  paymentWorker.on('completed', (job) => {
    console.log(`Payment job ${job.id} completed`);
  });
  paymentWorker.on('failed', (job, err) => {
    console.error(`Payment job ${job?.id} failed:`, err.message);
  });

  // Start subscription worker
  subscriptionWorker = createSubscriptionWorker(processSubscriptionJob);
  subscriptionWorker.on('completed', (job) => {
    console.log(`Subscription job ${job.id} completed`);
  });
  subscriptionWorker.on('failed', (job, err) => {
    console.error(`Subscription job ${job?.id} failed:`, err.message);
  });

  // Start video worker
  videoWorker = createVideoWorker(processVideoJob);
  videoWorker.on('completed', (job) => {
    console.log(`Video job ${job.id} completed`);
  });
  videoWorker.on('failed', (job, err) => {
    console.error(`Video job ${job?.id} failed:`, err.message);
  });

  console.log('All workers started successfully');
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  console.log('Stopping job queue workers...');

  const stopPromises: Promise<void>[] = [];

  if (emailWorker) {
    stopPromises.push(emailWorker.close());
  }
  if (paymentWorker) {
    stopPromises.push(paymentWorker.close());
  }
  if (subscriptionWorker) {
    stopPromises.push(subscriptionWorker.close());
  }
  if (videoWorker) {
    stopPromises.push(videoWorker.close());
  }

  await Promise.all(stopPromises);

  emailWorker = null;
  paymentWorker = null;
  subscriptionWorker = null;
  videoWorker = null;

  console.log('All workers stopped');
}

export {
  emailWorker,
  paymentWorker,
  subscriptionWorker,
  videoWorker,
};
