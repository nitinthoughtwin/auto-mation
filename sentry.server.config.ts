import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  integrations: [
    Sentry.httpIntegration(),
    Sentry.nodeProfilingIntegration(),
  ],
  
  // Profiles sample rate
  profilesSampleRate: 0.1,
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive information from request
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    
    // Don't send PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    
    return event;
  },
  
  // Ignore specific errors
  ignoreErrors: [
    'NotFoundException',
    'ValidationException',
    /Rate limit exceeded/,
  ],
});
