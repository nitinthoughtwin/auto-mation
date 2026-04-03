import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function connectChannel({
  channelInfo,
  accessToken,
  refreshToken,
  userId,
  request,
}: {
  channelInfo: { id: string; title: string; description: string; thumbnail: string | null };
  accessToken: string;
  refreshToken: string;
  userId: string | null;
  request: NextRequest;
}): Promise<NextResponse> {
  const existingChannel = await db.channel.findUnique({
    where: { youtubeChannelId: channelInfo.id },
  });

  if (existingChannel) {
    if (userId && existingChannel.userId && existingChannel.userId !== userId) {
      return NextResponse.redirect(
        new URL(
          `/connect-youtube?error=${encodeURIComponent('This YouTube channel is already connected to another account!')}`,
          request.url
        )
      );
    }

    const updated = await db.channel.update({
      where: { id: existingChannel.id },
      data: {
        name: channelInfo.title || existingChannel.name,
        accessToken,
        refreshToken: refreshToken || existingChannel.refreshToken,
        userId: userId || existingChannel.userId,
        isActive: true,
      },
    });

    return NextResponse.redirect(
      new URL(
        `/connect-youtube?success=${updated.id}&name=${encodeURIComponent(updated.name)}`,
        request.url
      )
    );
  }

  const channel = await db.channel.create({
    data: {
      userId,
      name: channelInfo.title || 'Unknown Channel',
      youtubeChannelId: channelInfo.id,
      accessToken,
      refreshToken,
      uploadTime: '18:00',
      frequency: 'daily',
      isActive: true,
    },
  });

  return NextResponse.redirect(
    new URL(
      `/connect-youtube?success=${channel.id}&name=${encodeURIComponent(channel.name)}`,
      request.url
    )
  );
}
