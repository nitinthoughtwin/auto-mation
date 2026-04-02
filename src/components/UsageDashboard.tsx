'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Video,
  Tv,
  HardDrive,
  Sparkles,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
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

  const usageItems = [
    {
      icon: <Video className="h-4 w-4 text-blue-500" />,
      label: 'Videos',
      value: `${usage.videos.used}/${usage.videos.limit}`,
      percent: usage.videos.percent,
      exceeded: limitsExceeded.videos,
      sub: 'This month',
    },
    {
      icon: <Tv className="h-4 w-4 text-red-500" />,
      label: 'Channels',
      value: `${usage.channels.used}/${usage.channels.limit}`,
      percent: usage.channels.percent,
      exceeded: limitsExceeded.channels,
      sub: 'Connected',
    },
    {
      icon: <HardDrive className="h-4 w-4 text-purple-500" />,
      label: 'Storage',
      value: `${formatStorage(usage.storage.usedMB)}/${formatStorage(usage.storage.limitMB)}`,
      percent: usage.storage.percent,
      exceeded: limitsExceeded.storage,
      sub: 'Used',
    },
    {
      icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
      label: 'AI Credits',
      value: `${usage.aiCredits.used}/${usage.aiCredits.limit}`,
      percent: usage.aiCredits.percent,
      exceeded: limitsExceeded.aiCredits,
      sub: `${usage.aiCredits.limit - usage.aiCredits.used} left`,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Plan header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={plan.name === 'free' ? 'secondary' : 'default'} className="text-xs">
            {plan.displayName}
          </Badge>
          {hasAnyLimitExceeded && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limit Reached
            </Badge>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Resets {getPeriodEndDate(periodEnd)}
        </span>
      </div>

      {/* Usage grid — 2 cols on mobile, 4 on lg */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {usageItems.map((item) => (
          <div
            key={item.label}
            className={`p-3 rounded-xl border bg-card space-y-2 ${item.exceeded ? 'border-red-300' : 'border-border/50'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {item.icon}
                {item.label}
              </div>
              {item.exceeded && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
            </div>
            <div className={`text-lg font-bold leading-none ${getUsageColor(item.percent)}`}>
              {item.value}
            </div>
            <Progress value={Math.min(item.percent, 100)} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Upgrade CTA */}
      {plan.name === 'free' && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div>
            <p className="font-semibold text-sm">Upgrade to Pro</p>
            <p className="text-white/80 text-xs">100 videos · 5GB · 100 AI credits</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/pricing')}
            className="bg-white text-indigo-600 hover:bg-white/90 flex-shrink-0 h-9"
          >
            View Plans
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}