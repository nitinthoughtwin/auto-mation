'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Video,
  Youtube,
  HardDrive,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UsageData {
  videos: {
    used: number;
    limit: number;
    percent: number;
  };
  channels: {
    used: number;
    limit: number;
    percent: number;
  };
  storage: {
    usedMB: number;
    limitMB: number;
    percent: number;
  };
  aiCredits: {
    used: number;
    limit: number;
    percent: number;
  };
}

interface UsageResponse {
  usage: UsageData;
  limitsExceeded: {
    videos: boolean;
    channels: boolean;
    storage: boolean;
    aiCredits: boolean;
  };
  plan: {
    name: string;
    displayName: string;
  };
  periodEnd: string;
}

export default function UsageDashboard() {
  const router = useRouter();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const usageData = await res.json();
        setData(usageData);
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  const getUsageColor = (percent: number): string => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percent: number): string => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPeriodEndDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { usage, limitsExceeded, plan, periodEnd } = data;
  const hasAnyLimitExceeded = Object.values(limitsExceeded).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={plan.name === 'free' ? 'secondary' : 'default'} className="text-sm">
            {plan.displayName}
          </Badge>
          {hasAnyLimitExceeded && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limit Reached
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Resets: {getPeriodEndDate(periodEnd)}
        </div>
      </div>

      {/* Usage Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Videos */}
        <Card className={limitsExceeded.videos ? 'border-red-300' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                Videos
              </CardTitle>
              {limitsExceeded.videos && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(usage.videos.percent)}`}>
              {usage.videos.used}/{usage.videos.limit}
            </div>
            <Progress 
              value={Math.min(usage.videos.percent, 100)} 
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        {/* Channels */}
        <Card className={limitsExceeded.channels ? 'border-red-300' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                Channels
              </CardTitle>
              {limitsExceeded.channels && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(usage.channels.percent)}`}>
              {usage.channels.used}/{usage.channels.limit}
            </div>
            <Progress 
              value={Math.min(usage.channels.percent, 100)} 
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Connected</p>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className={limitsExceeded.storage ? 'border-red-300' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-500" />
                Storage
              </CardTitle>
              {limitsExceeded.storage && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(usage.storage.percent)}`}>
              {formatStorage(usage.storage.usedMB)}/{formatStorage(usage.storage.limitMB)}
            </div>
            <Progress 
              value={Math.min(usage.storage.percent, 100)} 
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Used</p>
          </CardContent>
        </Card>

        {/* AI Credits */}
        <Card className={limitsExceeded.aiCredits ? 'border-red-300' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                AI Credits
              </CardTitle>
              {limitsExceeded.aiCredits && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(usage.aiCredits.percent)}`}>
              {usage.aiCredits.used}/{usage.aiCredits.limit}
            </div>
            <Progress 
              value={Math.min(usage.aiCredits.percent, 100)} 
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Remaining: {usage.aiCredits.limit - usage.aiCredits.used}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA */}
      {plan.name === 'free' && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Upgrade to Pro</h3>
                <p className="text-white/80 text-sm">
                  Get 100 videos/month, 5GB storage, and 100 AI credits
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => router.push('/pricing')}
                className="bg-white text-indigo-600 hover:bg-white/90"
              >
                View Plans
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}