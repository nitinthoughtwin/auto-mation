import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    const debug: Record<string, any> = {
      timestamp: new Date().toISOString(),
      email,
      token: token ? `${token.substring(0, 10)}...` : null,
    };

    // Check if user exists
    if (email) {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      debug.user = user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      } : 'NOT FOUND';

      // Check tokens for this user
      if (user) {
        const tokens = await db.verificationToken.findMany({
          where: {
            identifier: {
              startsWith: `verify-${user.id}`,
            },
          },
          orderBy: { expires: 'desc' },
          take: 5,
        });

        debug.tokens = tokens.map(t => ({
          identifier: t.identifier,
          token: `${t.token.substring(0, 10)}...`,
          expires: t.expires,
          isExpired: t.expires < new Date(),
        }));
      }
    }

    // Check all tokens in database
    const allTokens = await db.verificationToken.findMany({
      take: 10,
      orderBy: { expires: 'desc' },
    });

    debug.allTokensCount = allTokens.length;
    debug.recentTokens = allTokens.map(t => ({
      identifier: t.identifier,
      tokenPreview: `${t.token.substring(0, 10)}...`,
      expires: t.expires,
      isExpired: t.expires < new Date(),
    }));

    return NextResponse.json(debug, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}