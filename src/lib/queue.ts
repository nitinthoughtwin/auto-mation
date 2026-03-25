/**
 * BullMQ Job Queue Configuration
 * 
 * Used for background processing:
 * - Email sending
 * - Video processing
 * - Payment webhook handling
 * - Subscription expiration checks
 * 
 * Environment Variables:
 * - REDIS_URL: Redis connection URL
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { getRedisClient } from './redis';

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  VIDEO: 'video-queue',
  PAYMENT: 'payment-queue',
  SUBSCRIPTION: 'subscription-queue',
  NOTIFICATION: 'notification-queue',
} as const;

// Job types
export interface EmailJobData {
  type: 'verification' | 'password-reset' | 'welcome' | 'subscription' | 'payment-receipt';
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

export interface VideoJobData {
  type: 'process' | 'thumbnail' | 'transcode' | 'delete';
  videoId: string;
  userId: string;
  data?: Record<string, unknown>;
}

export interface PaymentJobData {
  type: 'webhook' | 'subscription-check' | 'renewal-reminder';
  paymentId?: string;
  subscriptionId?: string;
  userId: string;
  data?: Record<string, unknown>;
}

export interface SubscriptionJobData {
  type: 'expire' | 'renew' | 'reminder';
  subscriptionId: string;
  userId: string;
  planId: string;
}

export interface NotificationJobData {
  type: 'push' | 'email' | 'in-app';
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Connection options
const getConnectionOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for job queues');
  }

  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    db: parseInt(url.pathname.slice(1) || '0'),
    maxRetriesPerRequest: null,
  };
};

// Queue instances (lazy initialization)
let emailQueue: Queue<EmailJobData> | null = null;
let videoQueue: Queue<VideoJobData> | null = null;
let paymentQueue: Queue<PaymentJobData> | null = null;
let subscriptionQueue: Queue<SubscriptionJobData> | null = null;
let notificationQueue: Queue<NotificationJobData> | null = null;

// Get or create queue
function getQueue<T>(name: string, existingQueue: Queue<T> | null): Queue<T> {
  if (existingQueue) return existingQueue;
  
  const queue = new Queue<T>(name, {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,    // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });
  
  return queue;
}

// Queue getters
export function getEmailQueue(): Queue<EmailJobData> {
  emailQueue = getQueue(QUEUE_NAMES.EMAIL, emailQueue);
  return emailQueue;
}

export function getVideoQueue(): Queue<VideoJobData> {
  videoQueue = getQueue(QUEUE_NAMES.VIDEO, videoQueue);
  return videoQueue;
}

export function getPaymentQueue(): Queue<PaymentJobData> {
  paymentQueue = getQueue(QUEUE_NAMES.PAYMENT, paymentQueue);
  return paymentQueue;
}

export function getSubscriptionQueue(): Queue<SubscriptionJobData> {
  subscriptionQueue = getQueue(QUEUE_NAMES.SUBSCRIPTION, subscriptionQueue);
  return subscriptionQueue;
}

export function getNotificationQueue(): Queue<NotificationJobData> {
  notificationQueue = getQueue(QUEUE_NAMES.NOTIFICATION, notificationQueue);
  return notificationQueue;
}

// Job scheduling helpers
export const scheduleJob = {
  /**
   * Schedule an email job
   */
  async email(data: EmailJobData, delay?: number): Promise<Job<EmailJobData>> {
    const queue = getEmailQueue();
    return queue.add(`email-${data.type}`, data, {
      delay: delay || 0,
    });
  },

  /**
   * Schedule a video processing job
   */
  async video(data: VideoJobData, delay?: number): Promise<Job<VideoJobData>> {
    const queue = getVideoQueue();
    return queue.add(`video-${data.type}`, data, {
      delay: delay || 0,
    });
  },

  /**
   * Schedule a payment job
   */
  async payment(data: PaymentJobData, delay?: number): Promise<Job<PaymentJobData>> {
    const queue = getPaymentQueue();
    return queue.add(`payment-${data.type}`, data, {
      delay: delay || 0,
    });
  },

  /**
   * Schedule a subscription job
   */
  async subscription(data: SubscriptionJobData, delay?: number): Promise<Job<SubscriptionJobData>> {
    const queue = getSubscriptionQueue();
    return queue.add(`subscription-${data.type}`, data, {
      delay: delay || 0,
    });
  },

  /**
   * Schedule a notification job
   */
  async notification(data: NotificationJobData, delay?: number): Promise<Job<NotificationJobData>> {
    const queue = getNotificationQueue();
    return queue.add(`notification-${data.type}`, data, {
      delay: delay || 0,
    });
  },

  /**
   * Schedule a recurring job (cron-like)
   */
  async recurring(
    queueName: string,
    jobName: string,
    data: unknown,
    pattern: string // cron pattern like '0 0 * * *' for daily
  ): Promise<void> {
    let queue: Queue;
    
    switch (queueName) {
      case QUEUE_NAMES.EMAIL:
        queue = getEmailQueue();
        break;
      case QUEUE_NAMES.VIDEO:
        queue = getVideoQueue();
        break;
      case QUEUE_NAMES.PAYMENT:
        queue = getPaymentQueue();
        break;
      case QUEUE_NAMES.SUBSCRIPTION:
        queue = getSubscriptionQueue();
        break;
      case QUEUE_NAMES.NOTIFICATION:
        queue = getNotificationQueue();
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.upsertJobScheduler(
      jobName,
      { pattern },
      {
        name: jobName,
        data,
      }
    );
  },
};

// Worker creation helpers
export function createEmailWorker(processor: (job: Job<EmailJobData>) => Promise<void>): Worker<EmailJobData> {
  return new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    processor,
    {
      connection: getConnectionOptions(),
      concurrency: 5, // Process 5 emails at a time
    }
  );
}

export function createVideoWorker(processor: (job: Job<VideoJobData>) => Promise<void>): Worker<VideoJobData> {
  return new Worker<VideoJobData>(
    QUEUE_NAMES.VIDEO,
    processor,
    {
      connection: getConnectionOptions(),
      concurrency: 2, // Process 2 videos at a time (resource intensive)
    }
  );
}

export function createPaymentWorker(processor: (job: Job<PaymentJobData>) => Promise<void>): Worker<PaymentJobData> {
  return new Worker<PaymentJobData>(
    QUEUE_NAMES.PAYMENT,
    processor,
    {
      connection: getConnectionOptions(),
      concurrency: 10, // Process 10 payment jobs at a time
    }
  );
}

export function createSubscriptionWorker(processor: (job: Job<SubscriptionJobData>) => Promise<void>): Worker<SubscriptionJobData> {
  return new Worker<SubscriptionJobData>(
    QUEUE_NAMES.SUBSCRIPTION,
    processor,
    {
      connection: getConnectionOptions(),
      concurrency: 5,
    }
  );
}

// Queue monitoring
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  let queue: Queue;
  
  switch (queueName) {
    case QUEUE_NAMES.EMAIL:
      queue = getEmailQueue();
      break;
    case QUEUE_NAMES.VIDEO:
      queue = getVideoQueue();
      break;
    case QUEUE_NAMES.PAYMENT:
      queue = getPaymentQueue();
      break;
    case QUEUE_NAMES.SUBSCRIPTION:
      queue = getSubscriptionQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export default {
  getEmailQueue,
  getVideoQueue,
  getPaymentQueue,
  getSubscriptionQueue,
  getNotificationQueue,
  scheduleJob,
  createEmailWorker,
  createVideoWorker,
  createPaymentWorker,
  createSubscriptionWorker,
  getQueueStats,
  QUEUE_NAMES,
};