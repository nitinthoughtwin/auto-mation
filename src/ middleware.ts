import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiting (for production, use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  '/api/auth/login': { requests: 5, window: 60 * 1000 }, // 5 requests per minute
  '/api/auth/register': { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
  '/api/auth/forgot-password': { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
  '/api/auth/verify-email': { requests: 10, window: 60 * 60 * 1000 }, // 10 requests per hour
  
  // Payment endpoints
  '/api/payment': { requests: 10, window: 60 * 1000 }, // 10 requests per minute
  
  // Upload endpoints
  '/api/videos/upload': { requests: 20, window: 60 * 1000 }, // 20 uploads per minute
  '/api/blob': { requests: 20, window: 60 * 1000 },
  
  // AI endpoints - expensive
  '/api/ai': { requests: 30, window: 60 * 1000 }, // 30 requests per minute
  
  // Default
  'default': { requests: 100, window: 60 * 1000 }, // 100 requests per minute
};

function getRateLimit(pathname: string): { requests: number; window: number } {
  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return limit;
    }
  }
  return RATE_LIMITS.default;
}

function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default
  return 'unknown';
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldEntries, 5 * 60 * 1000);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip rate limiting for static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/public') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Get client identifier (IP + User-Agent for better uniqueness)
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const clientId = `${ip}:${userAgent.slice(0, 50)}`;
  
  // Get rate limit for this path
  const rateLimit = getRateLimit(pathname);
  
  // Create key for this client + path
  const key = `${clientId}:${pathname}`;
  
  // Check rate limit
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (record && record.resetTime > now) {
    if (record.count >= rateLimit.requests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimit.requests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
          },
        }
      );
    }
    
    // Increment counter
    record.count++;
  } else {
    // Create new record
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + rateLimit.window,
    });
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https: http:;
    font-src 'self' data:;
    connect-src 'self' https://api.razorpay.com https://lh3.googleusercontent.com https://*.googleapis.com;
    frame-src https://checkout.razorpay.com https://www.youtube.com https://drive.google.com;
    object-src 'none';
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Add rate limit headers to response
  const currentRecord = rateLimitMap.get(key);
  if (currentRecord) {
    response.headers.set('X-RateLimit-Limit', String(rateLimit.requests));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, rateLimit.requests - currentRecord.count)));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(currentRecord.resetTime / 1000)));
  }
  
  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};