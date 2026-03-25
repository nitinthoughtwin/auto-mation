import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUrl } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // Create state with userId for callback
    const state = JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    });

    const authUrl = getAuthUrl(state);
    
    // Return URL for client-side redirect
    return NextResponse.json({ 
      url: authUrl,
      message: 'Redirecting to YouTube authorization...' 
    });
  } catch (error: any) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}