import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const category = await db.videoLibraryCategory.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();
    const { name, description, icon, driveFolderUrl, sortOrder, isActive } = data;

    // Extract folder ID from URL if provided
    let driveFolderId: string | null = null;
    if (driveFolderUrl) {
      // Extract folder ID from various Google Drive URL formats
      const match1 = driveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      const match2 = driveFolderUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const match3 = driveFolderUrl.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
      driveFolderId = match1?.[1] || match2?.[1] || match3?.[1] || null;
    }

    const category = await db.videoLibraryCategory.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        driveFolderUrl,
        driveFolderId,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Delete all items in this category first
    await db.videoLibraryItem.deleteMany({
      where: { categoryId: id },
    });

    // Delete the category
    await db.videoLibraryCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}