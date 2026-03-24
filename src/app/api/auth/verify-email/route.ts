import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Verify token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: `verify-${user.id}`,
        token,
        expires: { gt: new Date() },
      },
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

    // Delete used token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: `verify-${user.id}`,
          token,
        },
      },
    });

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

    // Send verification email
    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendVerificationEmail(email, user.name || '', verifyUrl);
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