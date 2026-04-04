import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Create video record after direct-to-R2 upload via presigned URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      channelId,
      publicUrl,     // R2 public URL (from presign flow)
      originalName,
      fileSize,
      mimeType,
      title,
      description,
      tags,
    } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }
    if (!publicUrl) {
      return NextResponse.json({ error: 'publicUrl is required' }, { status: 400 });
    }

    const channel = await db.channel.findFirst({ where: { id: channelId, userId: session.user.id } });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const ext = originalName?.includes('.') ? originalName.split('.').pop() : '';
    const resolvedTitle = title || (ext ? originalName.slice(0, -(ext.length + 1)) : originalName) || 'Untitled';

    const video = await db.video.create({
      data: {
        channelId,
        title: resolvedTitle,
        description: description || '',
        tags: tags || '',
        fileName: publicUrl,
        originalName: originalName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        driveFileId: null,
        driveWebViewLink: null,
        status: 'queued',
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json({ error: error.message || 'Failed to create video' }, { status: 500 });
  }
}
