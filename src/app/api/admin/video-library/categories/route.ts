import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const categories = await prisma.videoLibraryCategory.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();
    const { name, description, icon, driveFolderUrl, sortOrder, isActive } = data;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Extract folder ID from URL if provided
    let driveFolderId: string | null = null;
    if (driveFolderUrl) {
      // Extract folder ID from various Google Drive URL formats
      const match1 = driveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      const match2 = driveFolderUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const match3 = driveFolderUrl.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
      driveFolderId = match1?.[1] || match2?.[1] || match3?.[1] || null;
    }

    const category = await prisma.videoLibraryCategory.create({
      data: {
        name,
        description,
        icon,
        driveFolderUrl,
        driveFolderId,
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}