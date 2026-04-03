import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPlanAndUsage, checkVideoLimit, checkStorageLimit } from '@/lib/plan-limits';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Upload video to Cloudflare R2
async function storeVideo(file: File, channelId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `videos/${channelId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Video Upload ===');

    const formData = await request.formData();
    const channelId = formData.get('channelId') as string;
    const defaultTitle = formData.get('defaultTitle') as string;
    const defaultDescription = formData.get('defaultDescription') as string;
    const defaultTags = formData.get('defaultTags') as string;
    const files = formData.getAll('files') as File[];

    if (!channelId) {
      return NextResponse.json({ success: false, error: 'Channel ID is required' }, { status: 400 });
    }
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const channel = await db.channel.findFirst({
      where: { id: channelId, userId: session.user.id },
    });
    if (!channel) {
      return NextResponse.json({ success: false, error: 'Channel not found' }, { status: 404 });
    }

    // Enforce plan limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const videoCheck = checkVideoLimit(limits, usage, files.length);
      if (!videoCheck.allowed) {
        return NextResponse.json({ success: false, error: videoCheck.message, limitExceeded: 'videos' }, { status: 403 });
      }
      for (const file of files) {
        const storageCheck = checkStorageLimit(limits, usage, file.size);
        if (!storageCheck.allowed) {
          return NextResponse.json({ success: false, error: storageCheck.message, limitExceeded: 'storage' }, { status: 403 });
        }
      }
    } catch {
      // No subscription — free tier, proceed
    }

    const uploadedVideos: { id: string; title: string; status: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.log(`Uploading ${i + 1}/${files.length}: ${file.name} (${sizeMB} MB)`);

      const url = await storeVideo(file, channelId);
      console.log('Stored at:', url);

      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const title = defaultTitle
        ? `${defaultTitle}${files.length > 1 ? ` (${i + 1})` : ''}`
        : ext ? file.name.slice(0, -(ext.length + 1)) : file.name;

      const video = await db.video.create({
        data: {
          channelId,
          title,
          description: defaultDescription || '',
          tags: defaultTags || '',
          fileName: url,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          driveFileId: null,
          driveWebViewLink: null,
          status: 'queued',
        },
      });

      uploadedVideos.push(video);
    }

    console.log(`=== Upload Complete: ${uploadedVideos.length} videos ===`);
    return NextResponse.json({
      success: true,
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      videos: uploadedVideos,
    });

  } catch (error: any) {
    console.error('=== Upload FAILED ===', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload videos' },
      { status: 500 }
    );
  }
}
