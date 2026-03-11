import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Check if user is authenticated
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const session = request.cookies.get('session')?.value;

    if (!userId || !session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    console.error('Error checking session:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
