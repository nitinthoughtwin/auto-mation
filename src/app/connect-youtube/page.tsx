'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { YouTubeConnector } from '@/components/youtube-connector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { YouTubeIcon } from '@/components/ui/youtube-icon';

interface Channel {
  id: string;
  name: string;
  youtubeChannelId: string;
  isActive: boolean;
  uploadTime: string;
  frequency: string;
  createdAt: string;
  _count?: {
    videos: number;
  };
}

function ConnectYouTubeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planLimit, setPlanLimit] = useState<number>(1);
  const [isConnecting, setIsConnecting] = useState(false);

  const successParam = searchParams.get('success');
  const nameParam = searchParams.get('name');
  const errorParam = searchParams.get('error');

  const refreshChannels = async () => {
    try {
      const [channelRes, usageRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/usage'),
      ]);
      const channelData = await channelRes.json();
      setChannels(channelData.channels || []);
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setPlanLimit(usageData.usage?.channels?.limit ?? 1);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch existing channels + plan limit
  useEffect(() => {
    if (status !== 'authenticated') return;
    refreshChannels();
  }, [status]);

  // Handle success from OAuth callback — refresh list
  useEffect(() => {
    if (successParam && nameParam) {
      refreshChannels();
    }
  }, [successParam, nameParam]);

  const handleAddChannel = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/auth/youtube');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setIsConnecting(false);
    }
  };

  // Keep backward compat: single channel reference for YouTubeConnector
  const channel = channels[0] ?? null;

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please login to connect your YouTube channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <YouTubeIcon className="h-8 w-8" />
            Connect YouTube Channel
          </h1>
          <p className="text-muted-foreground mt-2">
            Link your YouTube channel to upload videos using your own quota
          </p>
        </div>

        {/* Success/Error Messages */}
        {successParam && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Channel Connected!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Your YouTube channel "<strong>{nameParam}</strong>" has been successfully connected.
              You can now upload videos using your own quota.
            </AlertDescription>
          </Alert>
        )}

        {errorParam && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {errorParam === 'access_denied' 
                ? 'You denied access to your YouTube channel. Please try again and allow access.'
                : decodeURIComponent(errorParam)}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* YouTube Connector + additional channels */}
          <div className="md:col-span-2 space-y-4">
            <YouTubeConnector
              userId={session?.user?.id || ''}
              existingChannel={channel}
              onChannelDisconnected={() => setChannels(prev => prev.filter(c => c.id !== channel?.id))}
            />

            {/* Additional connected channels */}
            {channels.slice(1).map(ch => (
              <YouTubeConnector
                key={ch.id}
                userId={session?.user?.id || ''}
                existingChannel={ch}
                onChannelDisconnected={() => setChannels(prev => prev.filter(c => c.id !== ch.id))}
              />
            ))}

            {/* Connect Another Channel button */}
            {channels.length > 0 && channels.length < planLimit && (
              <Button
                variant="outline"
                className="w-full border-dashed gap-2"
                onClick={handleAddChannel}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Connect Another Channel
                <span className="text-xs text-muted-foreground ml-1">
                  ({channels.length}/{planLimit} connected)
                </span>
              </Button>
            )}

            {/* At limit — show upgrade prompt */}
            {channels.length > 0 && channels.length >= planLimit && (
              <Button
                variant="outline"
                className="w-full border-dashed gap-2 text-muted-foreground"
                onClick={() => window.location.href = '/pricing'}
              >
                <Plus className="h-4 w-4" />
                Connect More Channels — Upgrade Plan
              </Button>
            )}
          </div>

          {/* Help & Info */}
          <div className="space-y-4">
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  When you connect your YouTube channel:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>We request access to upload videos</li>
                  <li>You authorize via Google</li>
                  <li>Videos upload using <strong>your quota</strong></li>
                  <li>You get ~100 videos/day instead of 6</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quota Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Without connection:</span>
                    <span className="font-semibold text-red-600">6 videos/day</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">With your channel:</span>
                    <span className="font-semibold text-green-600">100+ videos/day</span>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Your data is safe:</strong> We only request permissions needed 
                  to upload videos to your channel. We never access your private data 
                  or videos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectYouTubePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ConnectYouTubeContent />
    </Suspense>
  );
}
