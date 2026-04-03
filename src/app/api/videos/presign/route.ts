import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserPlanAndUsage, checkVideoLimit, checkStorageLimit } from '@/lib/plan-limits';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Returns presigned PUT URLs so the browser can upload directly to R2
// without passing through the Next.js serverless function body limit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, files } = body as {
      channelId: string;
      files: Array<{ name: string; type: string; size: number }>;
    };

    if (!channelId || !files?.length) {
      return NextResponse.json({ error: 'channelId and files are required' }, { status: 400 });
    }

    const channel = await db.channel.findFirst({
      where: { id: channelId, userId: session.user.id },
    });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Enforce plan limits
    try {
      const { limits, usage } = await getUserPlanAndUsage(session.user.id);
      const videoCheck = checkVideoLimit(limits, usage, files.length);
      if (!videoCheck.allowed) {
        return NextResponse.json({ error: videoCheck.message, limitExceeded: 'videos' }, { status: 403 });
      }
      for (const file of files) {
        const storageCheck = checkStorageLimit(limits, usage, file.size);
        if (!storageCheck.allowed) {
          return NextResponse.json({ error: storageCheck.message, limitExceeded: 'storage' }, { status: 403 });
        }
      }
    } catch {
      // No subscription — free tier, proceed
    }

    // Generate a presigned PUT URL for each file
    const presigned = await Promise.all(
      files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `videos/${channelId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
        const url = await getSignedUrl(
          r2,
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            // Do NOT sign ContentType — avoids 403 signature mismatch when browser sends the header
          }),
          { expiresIn: 3600 }
        );
        return {
          key,
          uploadUrl: url,
          publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
          originalName: file.name,
          size: file.size,
          type: file.type,
        };
      })
    );

    return NextResponse.json({ presigned });
  } catch (error: any) {
    console.error('[Presign] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URLs' }, { status: 500 });
  }
}
