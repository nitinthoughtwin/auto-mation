import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state') || '';
    
    const authUrl = getAuthUrl(state);
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
