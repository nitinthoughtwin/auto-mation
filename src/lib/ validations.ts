import { z } from 'zod';

// Common validation schemas
export const authSchemas = {
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),

  register: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password too long'),
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email address'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Token is required'),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password too long'),
  }),

  verifyEmail: z.object({
    token: z.string().min(1, 'Token is required'),
    email: z.string().email('Invalid email address'),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password too long'),
  }),
};

export const paymentSchemas = {
  create: z.object({
    planId: z.string().min(1, 'Plan ID is required'),
    billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  }),

  verify: z.object({
    razorpay_order_id: z.string().min(1, 'Order ID is required'),
    razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
    razorpay_signature: z.string().optional(),
    demoMode: z.boolean().optional(),
  }),
};

export const videoSchemas = {
  upload: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(5000).optional(),
    tags: z.string().max(500).optional(),
    channelId: z.string().min(1, 'Channel is required'),
  }),

  update: z.object({
    id: z.string().min(1, 'Video ID is required'),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    tags: z.string().max(500).optional(),
    status: z.enum(['queued', 'processing', 'uploaded', 'failed']).optional(),
  }),

  create: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional(),
    tags: z.string().max(500).optional(),
    channelId: z.string().min(1, 'Channel is required'),
    fileName: z.string().min(1),
    originalName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    driveFileId: z.string().optional(),
  }),
};

export const channelSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    youtubeChannelId: z.string().min(1, 'Channel ID is required'),
    accessToken: z.string().min(1, 'Access token is required'),
    refreshToken: z.string().optional(),
    uploadTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    frequency: z.enum(['daily', 'alternate', 'every3days', 'every5days', 'weekly']).optional(),
    timezone: z.string().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    uploadTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    frequency: z.enum(['daily', 'alternate', 'every3days', 'every5days', 'weekly']).optional(),
    timezone: z.string().optional(),
    isActive: z.boolean().optional(),
    randomDelayMinutes: z.number().min(0).max(1440).optional(),
  }),
};

export const planSchemas = {
  create: z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
    displayName: z.string().min(1, 'Display name is required').max(100),
    description: z.string().max(500).optional(),
    priceINR: z.number().min(0).default(0),
    priceUSD: z.number().min(0).default(0),
    yearlyPriceINR: z.number().min(0).default(0),
    yearlyPriceUSD: z.number().min(0).default(0),
    yearlyDiscountPercent: z.number().min(0).max(100).optional(),
    maxVideosPerMonth: z.number().min(0).default(10),
    maxChannels: z.number().min(0).default(1),
    maxStorageMB: z.number().min(0).default(500),
    maxVideoSizeMB: z.number().min(0).default(100),
    aiCreditsPerMonth: z.number().min(0).default(10),
    features: z.union([z.array(z.string()), z.string()]).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().default(0),
  }),

  update: z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
    displayName: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    priceINR: z.number().min(0).optional(),
    priceUSD: z.number().min(0).optional(),
    yearlyPriceINR: z.number().min(0).optional(),
    yearlyPriceUSD: z.number().min(0).optional(),
    yearlyDiscountPercent: z.number().min(0).max(100).optional(),
    maxVideosPerMonth: z.number().min(0).optional(),
    maxChannels: z.number().min(0).optional(),
    maxStorageMB: z.number().min(0).optional(),
    maxVideoSizeMB: z.number().min(0).optional(),
    aiCreditsPerMonth: z.number().min(0).optional(),
    features: z.union([z.array(z.string()), z.string()]).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  }),
};

// Helper function to validate request body
export function validateBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    const error = result.error.errors[0]?.message || 'Validation failed';
    return { success: false, error };
  } catch (e) {
    return { success: false, error: 'Validation failed' };
  }
}
