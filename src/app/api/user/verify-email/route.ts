import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    console.log('[Verify Email] Request:', { 
      token: token ? `${token.substring(0, 10)}...` : null, 
      email 
    });

    if (!token || !email) {
      console.log('[Verify Email] Missing fields');
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    console.log('[Verify Email] User found:', user ? { id: user.id, email: user.email, verified: !!user.emailVerified } : 'NOT FOUND');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      console.log('[Verify Email] Already verified');
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Verify token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: `verify-${user.id}`,
        token: token,
        expires: { gt: new Date() },
      },
    });

    console.log('[Verify Email] Token found:', verificationToken ? 'YES' : 'NO');

    // Debug: Find all tokens for this user
    const allUserTokens = await db.verificationToken.findMany({
      where: { identifier: `verify-${user.id}` },
    });
    console.log('[Verify Email] All tokens for user:', allUserTokens.length);
    allUserTokens.forEach(t => {
      console.log('[Verify Email] Token:', {
        tokenPreview: t.token.substring(0, 10) + '...',
        expires: t.expires,
        isExpired: t.expires < new Date(),
        matches: t.token === token
      });
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      );
    }

    // Update user emailVerified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('[Verify Email] User updated successfully');

    // Delete used token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: `verify-${user.id}`,
          token: token,
        },
      },
    });

    console.log('[Verify Email] Token deleted');

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('[Verify Email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Delete old verification tokens
    await db.verificationToken.deleteMany({
      where: { identifier: `verify-${user.id}` },
    });

    // Create new token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 86400000); // 24 hours

    await db.verificationToken.create({
      data: {
        identifier: `verify-${user.id}`,
        token: verifyToken,
        expires: verifyTokenExpiry,
      },
    });

    console.log('[Resend Verify] Created token:', {
      identifier: `verify-${user.id}`,
      tokenPreview: verifyToken.substring(0, 10) + '...',
      expires: verifyTokenExpiry
    });

    // Send verification email - pass token, function will construct URL
    try {
      await sendVerificationEmail(email, verifyToken, user.name || '');
      console.log('[Resend Verify] Email sent successfully');
    } catch (emailError) {
      console.error('[Resend Verify] Email error:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Resend Verify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
