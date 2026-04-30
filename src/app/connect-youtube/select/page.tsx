'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { YouTubeIcon } from '@/components/ui/youtube-icon';
import { toast } from 'sonner';

interface ChannelOption {
  id: string;
  title: string;
  thumbnail: string | null;
}

export default function SelectChannelPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/youtube/pending-channels')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setChannels(data.channels || []);
        }
      })
      .catch(() => setError('Failed to load channels'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (channelId: string) => {
    setConnecting(channelId);
    try {
      const res = await fetch('/api/auth/youtube/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.limitExceeded === 'channels') {
          toast.error('Channel limit reached', { description: data.error });
          router.push('/pricing');
          return;
        }
        throw new Error(data.error || 'Failed to connect channel');
      }

      router.push(
        `/connect-youtube?success=${data.channelId}&name=${encodeURIComponent(data.channelName)}`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect channel');
    } finally {
      setConnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        <p className="text-muted-foreground text-sm">Loading your YouTube channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center px-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h2 className="text-lg font-semibold">Session Expired</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/connect-youtube')}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 mb-2">
          <YouTubeIcon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Select a YouTube Channel</h1>
        <p className="text-sm text-muted-foreground">
          We found {channels.length} channels on your Google account. Pick the one you want to connect.
        </p>
      </div>

      {/* Channel list */}
      <div className="space-y-3">
        {channels.map(channel => (
          <Card
            key={channel.id}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-red-300 dark:hover:border-red-700"
            onClick={() => connecting === null && handleSelect(channel.id)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              {channel.thumbnail ? (
                <img
                  src={channel.thumbnail}
                  alt={channel.title}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                  <YouTubeIcon className="h-6 w-6" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{channel.title}</p>
                <p className="text-xs text-muted-foreground truncate">{channel.id}</p>
              </div>

              <div className="flex-shrink-0">
                {connecting === channel.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                ) : connecting !== null ? (
                  <div className="w-5" />
                ) : (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t see your channel?{' '}
        <button
          className="underline hover:text-foreground"
          onClick={() => router.push('/connect-youtube')}
        >
          Try a different Google account
        </button>
      </p>
    </div>
  );
}
