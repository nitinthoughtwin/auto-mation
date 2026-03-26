import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendPaymentReminderEmail,
  sendPasswordChangedEmail,
} from './email';
import { db } from './db';
import { QUEUE_NAMES, EmailJobData, PaymentJobData, SubscriptionJobData, VideoJobData } from './queue';

// Redis connection
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

const createRedisConnection = (): Redis | null => {
  if (!REDIS_URL) {
    return null;
  }
  
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// Email Worker
export const startEmailWorker = (): Worker | null => {
  const connection = createRedisConnection();
  if (!connection) {
    console.log('[Worker] Email worker not started - Redis not configured');
    return null;
  }

  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { type, email, data } = job.data;
      
      console.log(`[Email Worker] Processing ${type} email for ${email}`);
      
      try {
        switch (type) {
          case 'verification':
            await sendVerificationEmail(email, data.token, data.name);
            break;
            
          case 'welcome':
            await sendWelcomeEmail(email, data.name);
            break;
            
          case 'password-reset':
            await sendPasswordResetEmail(email, data.token, data.name);
            break;
            
          case 'subscription':
            await sendSubscriptionEmail(email, data.planName, data.amount, data.nextBillingDate);
            break;
            
          case 'payment-reminder':
            await sendPaymentReminderEmail(email, data.planName, data.amount, data.dueDate);
            break;
            
          case 'password-changed':
            await sendPasswordChangedEmail(email);
            break;
            
          default:
            console.warn(`[Email Worker] Unknown email type: ${type}`);
        }
        
        console.log(`[Email Worker] Successfully sent ${type} email to ${email}`);
        return { success: true };
      } catch (error) {
        console.error(`[Email Worker] Failed to send ${type} email:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 60000, // 100 emails per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Email Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Email Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Worker] Email worker started');
  return worker;
};

// Payment Worker
export const startPaymentWorker = (): Worker | null => {
  const connection = createRedisConnection();
  if (!connection) {
    console.log('[Worker] Payment worker not started - Redis not configured');
    return null;
  }

  const worker = new Worker<PaymentJobData>(
    QUEUE_NAMES.PAYMENT,
    async (job: Job<PaymentJobData>) => {
      const { type, paymentId, data } = job.data;
      
      console.log(`[Payment Worker] Processing ${type} for payment ${paymentId}`);
      
      try {
        switch (type) {
          case 'process-payment':
            // Handle payment processing
            const payment = await db.payment.findUnique({
              where: { id: paymentId },
              include: { user: true, subscription: true },
            });
            
            if (!payment) {
              throw new Error(`Payment ${paymentId} not found`);
            }
            
            // Update payment status
            await db.payment.update({
              where: { id: paymentId },
              data: { status: 'completed' },
            });
            
            console.log(`[Payment Worker] Payment ${paymentId} processed`);
            break;
            
          case 'refund':
            // Handle refund
            await db.payment.update({
              where: { id: paymentId },
              data: { status: 'refunded' },
            });
            
            console.log(`[Payment Worker] Payment ${paymentId} refunded`);
            break;
            
          case 'subscription-renewal':
            // Handle subscription renewal
            const subscription = await db.subscription.findFirst({
              where: { id: data.subscriptionId },
            });
            
            if (subscription) {
              const newPeriodEnd = new Date(subscription.currentPeriodEnd);
              newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
              
              await db.subscription.update({
                where: { id: subscription.id },
                data: {
                  currentPeriodStart: subscription.currentPeriodEnd,
                  currentPeriodEnd: newPeriodEnd,
                },
              });
              
              console.log(`[Payment Worker] Subscription renewed`);
            }
            break;
            
          default:
            console.warn(`[Payment Worker] Unknown payment type: ${type}`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`[Payment Worker] Failed to process ${type}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Payment Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Payment Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Worker] Payment worker started');
  return worker;
};

// Subscription Worker
export const startSubscriptionWorker = (): Worker | null => {
  const connection = createRedisConnection();
  if (!connection) {
    console.log('[Worker] Subscription worker not started - Redis not configured');
    return null;
  }

  const worker = new Worker<SubscriptionJobData>(
    QUEUE_NAMES.SUBSCRIPTION,
    async (job: Job<SubscriptionJobData>) => {
      const { type, subscriptionId, data } = job.data;
      
      console.log(`[Subscription Worker] Processing ${type} for subscription ${subscriptionId}`);
      
      try {
        switch (type) {
          case 'check-expiration':
            const subscription = await db.subscription.findUnique({
              where: { id: subscriptionId },
              include: { user: true },
            });
            
            if (subscription && subscription.currentPeriodEnd < new Date()) {
              await db.subscription.update({
                where: { id: subscriptionId },
                data: { status: 'expired' },
              });
              
              console.log(`[Subscription Worker] Subscription ${subscriptionId} expired`);
            }
            break;
            
          case 'send-reminder':
            // Send renewal reminder
            const sub = await db.subscription.findUnique({
              where: { id: subscriptionId },
              include: { user: true, plan: true },
            });
            
            if (sub && sub.user.email) {
              await sendPaymentReminderEmail(
                sub.user.email,
                sub.plan?.name || 'Unknown',
                sub.plan?.price || 0,
                sub.currentPeriodEnd
              );
            }
            break;
            
          case 'update-usage':
            // Update usage stats
            const subForUsage = await db.subscription.findUnique({
              where: { id: subscriptionId },
              include: { usage: true },
            });
            
            if (subForUsage?.usage) {
              await db.usage.update({
                where: { id: subForUsage.usage.id },
                data: data.usageUpdate || {},
              });
            }
            break;
            
          default:
            console.warn(`[Subscription Worker] Unknown subscription type: ${type}`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`[Subscription Worker] Failed to process ${type}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Subscription Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Subscription Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Worker] Subscription worker started');
  return worker;
};

// Video Worker
export const startVideoWorker = (): Worker | null => {
  const connection = createRedisConnection();
  if (!connection) {
    console.log('[Worker] Video worker not started - Redis not configured');
    return null;
  }

  const worker = new Worker<VideoJobData>(
    QUEUE_NAMES.VIDEO,
    async (job: Job<VideoJobData>) => {
      const { type, videoId, data } = job.data;
      
      console.log(`[Video Worker] Processing ${type} for video ${videoId}`);
      
      try {
        switch (type) {
          case 'upload':
            // Handle video upload to YouTube
            const video = await db.video.findUnique({
              where: { id: videoId },
              include: { channel: true },
            });
            
            if (!video) {
              throw new Error(`Video ${videoId} not found`);
            }
            
            // Update video status
            await db.video.update({
              where: { id: videoId },
              data: { status: 'processing' },
            });
            
            // YouTube upload logic would go here
            console.log(`[Video Worker] Video ${videoId} upload initiated`);
            break;
            
          case 'process':
            // Handle video processing
            await db.video.update({
              where: { id: videoId },
              data: { status: data.status || 'processing' },
            });
            break;
            
          case 'thumbnail':
            // Handle thumbnail generation
            console.log(`[Video Worker] Thumbnail generation for video ${videoId}`);
            break;
            
          default:
            console.warn(`[Video Worker] Unknown video type: ${type}`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`[Video Worker] Failed to process ${type}:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 10,
        duration: 60000, // 10 video jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Video Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Video Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Worker] Video worker started');
  return worker;
};

// Start all workers
export const startAllWorkers = () => {
  const workers = {
    email: startEmailWorker(),
    payment: startPaymentWorker(),
    subscription: startSubscriptionWorker(),
    video: startVideoWorker(),
  };
  
  console.log('[Workers] All workers initialized');
  return workers;
};

// Graceful shutdown helper
export const stopWorkers = async (workers: { email: Worker | null; payment: Worker | null; subscription: Worker | null; video: Worker | null }) => {
  const activeWorkers = Object.values(workers).filter((w): w is Worker => w !== null);
  
  await Promise.all(activeWorkers.map(w => w.close()));
  
  console.log('[Workers] All workers stopped');
};