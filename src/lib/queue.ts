import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

// Create Redis connection
const createRedisConnection = () => {
  if (!REDIS_URL) {
    console.log('[Queue] Redis URL not configured, using in-memory fallback');
    return null;
  }

  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  PAYMENT: 'payment-queue',
  SUBSCRIPTION: 'subscription-queue',
  VIDEO: 'video-queue',
} as const;

// Email job types
export interface EmailJobData {
  type: 'verification' | 'welcome' | 'password-reset' | 'subscription' | 'payment-reminder' | 'password-changed';
  email: string;
  data: Record<string, any>;
}

// Payment job types
export interface PaymentJobData {
  type: 'process-payment' | 'refund' | 'subscription-renewal';
  paymentId: string;
  data: Record<string, any>;
}

// Subscription job types
export interface SubscriptionJobData {
  type: 'check-expiration' | 'send-reminder' | 'update-usage';
  subscriptionId: string;
  data: Record<string, any>;
}

// Video job types
export interface VideoJobData {
  type: 'upload' | 'process' | 'thumbnail';
  videoId: string;
  data: Record<string, any>;
}

// Create queues (lazy initialization)
let emailQueue: Queue | null = null;
let paymentQueue: Queue | null = null;
let subscriptionQueue: Queue | null = null;
let videoQueue: Queue | null = null;
let redisConnection: Redis | null = null;

export const getEmailQueue = (): Queue | null => {
  if (!emailQueue && REDIS_URL) {
    if (!redisConnection) {
      redisConnection = createRedisConnection();
    }
    if (redisConnection) {
      emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection: redisConnection });
    }
  }
  return emailQueue;
};

export const getPaymentQueue = (): Queue | null => {
  if (!paymentQueue && REDIS_URL) {
    if (!redisConnection) {
      redisConnection = createRedisConnection();
    }
    if (redisConnection) {
      paymentQueue = new Queue(QUEUE_NAMES.PAYMENT, { connection: redisConnection });
    }
  }
  return paymentQueue;
};

export const getSubscriptionQueue = (): Queue | null => {
  if (!subscriptionQueue && REDIS_URL) {
    if (!redisConnection) {
      redisConnection = createRedisConnection();
    }
    if (redisConnection) {
      subscriptionQueue = new Queue(QUEUE_NAMES.SUBSCRIPTION, { connection: redisConnection });
    }
  }
  return subscriptionQueue;
};

export const getVideoQueue = (): Queue | null => {
  if (!videoQueue && REDIS_URL) {
    if (!redisConnection) {
      redisConnection = createRedisConnection();
    }
    if (redisConnection) {
      videoQueue = new Queue(QUEUE_NAMES.VIDEO, { connection: redisConnection });
    }
  }
  return videoQueue;
};

// Helper functions to add jobs
export const addEmailJob = async (data: EmailJobData, options?: { delay?: number }) => {
  const queue = getEmailQueue();
  if (!queue) {
    console.log('[Queue] Email queue not available, processing synchronously');
    return null;
  }

  return queue.add(data.type, data, {
    delay: options?.delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const addPaymentJob = async (data: PaymentJobData, options?: { delay?: number }) => {
  const queue = getPaymentQueue();
  if (!queue) {
    console.log('[Queue] Payment queue not available');
    return null;
  }

  return queue.add(data.type, data, {
    delay: options?.delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
};

export const addSubscriptionJob = async (data: SubscriptionJobData, options?: { delay?: number }) => {
  const queue = getSubscriptionQueue();
  if (!queue) {
    console.log('[Queue] Subscription queue not available');
    return null;
  }

  return queue.add(data.type, data, {
    delay: options?.delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const addVideoJob = async (data: VideoJobData, options?: { delay?: number }) => {
  const queue = getVideoQueue();
  if (!queue) {
    console.log('[Queue] Video queue not available');
    return null;
  }

  return queue.add(data.type, data, {
    delay: options?.delay,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });
};

// Graceful shutdown
export const closeQueues = async () => {
  const queues = [emailQueue, paymentQueue, subscriptionQueue, videoQueue];

  await Promise.all(
    queues
      .filter(q => q !== null)
      .map(q => q!.close())
  );

  if (redisConnection) {
    await redisConnection.quit();
  }

  console.log('[Queue] All queues closed');
};

// Get queue statistics
export const getQueueStats = async () => {
  const stats: Record<string, any> = {};

  const queues = [
    { name: 'email', queue: emailQueue },
    { name: 'payment', queue: paymentQueue },
    { name: 'subscription', queue: subscriptionQueue },
    { name: 'video', queue: videoQueue },
  ];

  for (const { name, queue } of queues) {
    if (queue) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        stats[name] = {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        };
      } catch (error) {
        stats[name] = { error: 'Failed to get stats' };
      }
    } else {
      stats[name] = { status: 'not initialized' };
    }
  }

  return stats;
};
