import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/debug-drive?folderId=YOUR_FOLDER_ID
// Admin-only: tests if GOOGLE_DRIVE_API_KEY can access a folder
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = request.nextUrl.searchParams.get('folderId') || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'; // test folder

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_API_KEY is not set in environment variables' }, { status: 500 });
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`);
  url.searchParams.set('fields', 'files(id,name,mimeType,size)');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    apiKeyPresent: !!apiKey,
    apiKeyPrefix: apiKey.substring(0, 8) + '...',
    folderId,
    result: data,
  });
}
