import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Facebook Data Deletion Callback
 * 
 * Facebook requires this endpoint to handle user data deletion requests.
 * When a user deletes your app from their Facebook settings, Facebook will
 * send a POST request to this endpoint.
 * 
 * Documentation: https://developers.facebook.com/docs/apps/delete-data
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Facebook sends a signed_request parameter
    const signedRequest = body.signed_request;
    
    if (!signedRequest) {
      return NextResponse.json(
        { error: 'Missing signed_request' },
        { status: 400 }
      );
    }

    // Parse the signed request
    // Format: base64UrlEncode(header) + '.' + base64UrlEncode(payload)
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    
    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    const userId = payload.user_id;
    const algorithm = payload.algorithm;

    console.log('Facebook Data Deletion Request:');
    console.log('User ID:', userId);
    console.log('Algorithm:', algorithm);

    // Delete user data from database
    // Find channels associated with this Facebook user
    const channels = await db.channel.findMany({
      where: {
        OR: [
          { facebookPageId: userId },
          { instagramAccountId: userId },
        ]
      }
    });

    // Delete all associated data
    for (const channel of channels) {
      // Delete videos first (due to foreign key constraints)
      await db.video.deleteMany({
        where: { channelId: channel.id }
      });
      
      // Delete channel
      await db.channel.delete({
        where: { id: channel.id }
      });
    }

    console.log(`Deleted ${channels.length} channels for user ${userId}`);

    // Facebook requires a URL where user can check deletion status
    const confirmationCode = `DEL-${Date.now()}-${userId.substring(0, 8)}`;

    // Return response in Facebook's expected format
    return NextResponse.json({
      url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });

  } catch (error: any) {
    console.error('Data deletion callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}

// GET endpoint for user to check deletion status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  return NextResponse.json({
    message: 'Data deletion request processed',
    code: code,
    status: 'completed',
  });
}