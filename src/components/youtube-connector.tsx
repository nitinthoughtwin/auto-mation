'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Youtube,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Trash2
} from 'lucide-react';

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

interface YouTubeConnectorProps {
  userId: string;
  existingChannel?: Channel | null;
  onChannelDisconnected?: () => void;
}

export function YouTubeConnector({
  userId,
  existingChannel,
  onChannelDisconnected
}: YouTubeConnectorProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get YouTube OAuth URL
      const response = await fetch('/api/auth/youtube');
      const data = await response.json();

      if (data.url) {
        // Redirect to YouTube OAuth
        window.location.href = data.url;
      } else {
        setError('Failed to get authorization URL');
        setIsConnecting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!existingChannel) return;
    
    if (!confirm('Are you sure you want to disconnect this YouTube channel? Your queued videos will remain but uploads will stop.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/channels/${existingChannel.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onChannelDisconnected?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          YouTube Channel
        </CardTitle>
        <CardDescription>
          Connect your YouTube channel to upload videos using your own quota
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {existingChannel ? (
          <div className="space-y-4">
            {/* Connected Status */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{existingChannel.name}</h3>
                  {existingChannel.isActive ? (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Channel ID: {existingChannel.youtubeChannelId}
                </p>
              </div>
            </div>

            {/* Channel Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{existingChannel._count?.videos || 0}</p>
                <p className="text-xs text-muted-foreground">Videos Queued</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{existingChannel.uploadTime}</p>
                <p className="text-xs text-muted-foreground">Upload Time</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold capitalize">{existingChannel.frequency}</p>
                <p className="text-xs text-muted-foreground">Frequency</p>
              </div>
            </div>

            {/* Quota Info */}
            {/* <Alert>
              <AlertTitle className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Your YouTube Quota
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm">
                  When you connect your own YouTube channel, uploads use <strong>your personal quota</strong>:
                </p>
                <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                  <li>Daily upload quota: <strong>~100 videos/day</strong> (per channel)</li>
                  <li>Your uploads don't count towards our app limits</li>
                  <li>Check your quota at{' '}
                    <a 
                      href="https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Google Cloud Console <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </AlertDescription>
            </Alert> */}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push(`/channels/${existingChannel.id}`)}
              >
                Manage
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected */}
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No Channel Connected</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your YouTube channel to start uploading
                </p>
              </div>
            </div>

            {/* Benefits */}
            {/* <div className="space-y-2">
              <h4 className="font-medium">Why connect your own channel?</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>100+ videos/day</strong> - Your personal quota, not shared</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Full control</strong> - Videos upload directly to your channel</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Direct access</strong> - Manage videos in YouTube Studio</span>
                </li>
              </ul>
            </div> */}

            {/* Connect Button */}
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Youtube className="h-5 w-5 mr-2" />
                  Connect YouTube Channel
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to Google to authorize access to your YouTube channel
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}