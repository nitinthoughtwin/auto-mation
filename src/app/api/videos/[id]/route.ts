import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// GET - Get single video details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

// PUT - Update video details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, tags } = body;

    const video = await prisma.video.update({
      where: { id },
      data: { title, description, tags },
    });

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE - Delete video from queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get video info first
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete local file if it exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    const filePath = path.join(uploadDir, video.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Video deleted' });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    );
  }
}
