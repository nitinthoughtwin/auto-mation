import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUrl } from '@/lib/youtube';
import { db } from '@/lib/db';

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

    // If ?different=true, skip login_hint so user can pick a different account
    const different = request.nextUrl.searchParams.get('different') === 'true';

    // Only use login_hint if user signed up via Google OAuth.
    // Credentials users may have a non-Google email — hinting with it would be wrong.
    let loginHint: string | undefined;
    if (!different) {
      const googleAccount = await db.account.findFirst({
        where: { userId: session.user.id, provider: 'google' },
        select: { id: true },
      });
      if (googleAccount) loginHint = session.user.email ?? undefined;
    }

    const authUrl = getAuthUrl(state, loginHint);
    
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