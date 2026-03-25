import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

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

    // Store token in database
    await db.verificationToken.create({
      data: {
        identifier: `reset-${user.id}`,
        token: resetToken,
        expires: resetTokenExpiry,
      },
    });

    // Send email - pass token, function will construct URL
    try {
      await sendPasswordResetEmail(email, resetToken, user.name || undefined);
    } catch (emailError) {
      console.error('[Forgot Password] Email error:', emailError);
      // Still return success to prevent enumeration
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}