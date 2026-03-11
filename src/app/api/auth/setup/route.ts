import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// POST - Create default static user (one-time setup)
export async function POST(request: NextRequest) {
  try {
    // Check if any user already exists
    const existingUser = await db.user.findFirst();
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists. Please login.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create the user
    const user = await db.user.create({
      data: {
        email,
        password, // In production, you should hash this with bcrypt
        name: name || 'Admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// GET - Check if setup is needed
export async function GET() {
  try {
    const existingUser = await db.user.findFirst();
    
    return NextResponse.json({
      needsSetup: !existingUser,
    });
  } catch (error: any) {
    console.error('Error checking setup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check setup status' },
      { status: 500 }
    );
  }
}