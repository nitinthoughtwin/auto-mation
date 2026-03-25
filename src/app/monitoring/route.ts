/**
 * Sentry Tunnel Route
 * 
 * This route forwards Sentry events to bypass ad-blockers.
 * It acts as a proxy between the client and Sentry's ingest endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the Sentry DSN from environment
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    if (!dsn) {
      return NextResponse.json(
        { error: 'Sentry not configured' },
        { status: 500 }
      );
    }

    // Parse the DSN to get the host
    const dsnUrl = new URL(dsn);
    const sentryHost = dsnUrl.host;
    
    // Get the request body
    const envelope = await request.text();
    
    // Forward to Sentry
    const sentryResponse = await fetch(`https://${sentryHost}/api/envelope/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    });

    // Return the response from Sentry
    return new NextResponse(await sentryResponse.text(), {
      status: sentryResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return NextResponse.json(
      { error: 'Failed to forward to Sentry' },
      { status: 500 }
    );
  }
}