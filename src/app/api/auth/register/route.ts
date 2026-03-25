import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email';
import { authSchemas, validateBody } from '@/lib/validations';

// Check if email verification is required
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateBody(authSchemas.register, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    const { name, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the free plan
    const freePlan = await db.plan.findFirst({
      where: { name: 'free' },
    });

    // Create user
    const user = await db.user.create({
      data: {
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        emailVerified: REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
      },
    });

    // Create free subscription if free plan exists
    if (freePlan) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const subscription = await db.subscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // Create usage record
      await db.usage.create({
        data: {
          subscriptionId: subscription.id,
        },
      });
    }

    // Send verification email if required
    if (REQUIRE_EMAIL_VERIFICATION) {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyTokenExpiry = new Date(Date.now() + 86400000); // 24 hours

      await db.verificationToken.create({
        data: {
          identifier: `verify-${user.id}`,
          token: verifyToken,
          expires: verifyTokenExpiry,
        },
      });

      // Get the base URL - prioritize NEXTAUTH_URL, then request origin
      const baseUrl = process.env.NEXTAUTH_URL || 
        request.headers.get('origin') || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      
      console.log('[Register] Verification URL:', verifyUrl);

      // Try to send verification email
      try {
        await sendVerificationEmail(email, user.name || '', verifyUrl);
      } catch (emailError) {
        console.error('[Register] Email error:', emailError);
        // Continue even if email fails - user can request resend
      }

      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'Account created! Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // Send welcome email if no verification required
    try {
      await sendWelcomeEmail(email, user.name || '');
    } catch (emailError) {
      console.error('[Register] Welcome email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      requiresVerification: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}