import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

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

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store token in database (using VerificationToken table)
    // Delete any existing tokens for this user first
    await db.verificationToken.deleteMany({
      where: { identifier: `reset-${user.id}` },
    });

    await db.verificationToken.create({
      data: {
        identifier: `reset-${user.id}`,
        token: resetToken,
        expires: resetTokenExpiry,
      },
    });

    // Generate reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // For development: return the reset link in response
    // In production, you would send this via email
    console.log('='.repeat(50));
    console.log('PASSWORD RESET LINK:');
    console.log(resetUrl);
    console.log('='.repeat(50));

    return NextResponse.json({ 
      success: true,
      // Only in development - remove in production
      resetLink: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
    });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}