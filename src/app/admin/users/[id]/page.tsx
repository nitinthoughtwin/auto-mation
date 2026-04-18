'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, AlertTriangle, ArrowLeft,
  Loader2, RefreshCw, Youtube, Clock, CalendarClock,
  ListVideo, User, CreditCard,
} from 'lucide-react';

interface Issue { level: 'error' | 'warning' | 'ok'; text: string }

interface SchedulerLog {
  status: string;
  message: string | null;
  createdAt: string;
  action: string;
}

interface ChannelDiagnosis {
  channel: {
    id: string; name: string; youtubeChannelId: string;
    isActive: boolean; uploadTime: string; frequency: string;
    timezone: string; lastUploadDate: string | null;
    hasRefreshToken: boolean;
    queuedVideos: { id: string; title: string; createdAt: string }[];
  };
  issues: Issue[];
  recentLogs: SchedulerLog[];
  failedVideos: { id: string; title: string; error: string | null; updatedAt: string }[];
}

interface DebugData {
  user: { id: string; name: string | null; email: string | null; role: string; createdAt: string };
  plan: { name: string; displayName: string; maxVideosPerMonth: number; maxChannels: number } | null;
  usage: { videosThisMonth: number; channelsConnected: number; aiCreditsUsed: number } | null;
  channels: ChannelDiagnosis[];
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(s: string) {
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <div className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
      issue.level === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
      issue.level === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
      'bg-green-50 dark:bg-green-950/20'
    }`}>
      {issue.level === 'error' ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" /> :
       issue.level === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" /> :
       <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
      <span className={
        issue.level === 'error' ? 'text-red-800 dark:text-red-300' :
        issue.level === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
        'text-green-800 dark:text-green-300'
      }>{issue.text}</span>
    </div>
  );
}

function LogBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Success</Badge>;
  if (status === 'failed') return <Badge className="bg-red-100 text-red-700 border-0 text-xs">Failed</Badge>;
  if (status === 'blocked') return <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Blocked</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Skipped</Badge>;
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', alternate: 'Every 2 days',
  every3days: 'Every 3 days', every5days: 'Every 5 days', everySunday: 'Sundays',
};

export default function UserDebugPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`/api/admin/user-debug/${userId}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') { router.push('/dashboard'); return; }
      load();
    }
  }, [status, session, router, load]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">User not found</p></div>;
  }

  const hasErrors = data.channels.some(c => c.issues.some(i => i.level === 'error'));
  const hasWarnings = !hasErrors && data.channels.some(c => c.issues.some(i => i.level === 'warning'));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">User Debug</h1>
              <p className="text-sm text-muted-foreground">Diagnose upload issues for this user</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        </div>

        {/* User + Plan summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">{data.user.name ?? 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{data.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">Joined {timeAgo(data.user.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  {data.plan ? (
                    <>
                      <p className="font-semibold">{data.plan.displayName} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        Videos: {data.usage?.videosThisMonth ?? 0} / {data.plan.maxVideosPerMonth} this month
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AI Credits: {data.usage?.aiCreditsUsed ?? 0} used
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">No active subscription</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall verdict */}
        <div className={`rounded-xl p-4 flex items-center gap-3 border-2 ${
          data.channels.length === 0 ? 'bg-gray-50 border-gray-200' :
          hasErrors ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
          hasWarnings ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' :
          'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
        }`}>
          {data.channels.length === 0 ? <AlertTriangle className="h-6 w-6 text-gray-400" /> :
           hasErrors ? <XCircle className="h-6 w-6 text-red-500" /> :
           hasWarnings ? <AlertTriangle className="h-6 w-6 text-yellow-500" /> :
           <CheckCircle className="h-6 w-6 text-green-500" />}
          <div>
            <p className="font-semibold">
              {data.channels.length === 0 ? 'No channels connected' :
               hasErrors ? 'Upload issues found — action required' :
               hasWarnings ? 'Minor issues — uploads may be affected' :
               'Everything looks good'}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.channels.length} channel{data.channels.length !== 1 ? 's' : ''} connected
            </p>
          </div>
        </div>

        {/* Per-channel diagnosis */}
        {data.channels.map(({ channel, issues, recentLogs, failedVideos }) => {
          const errors = issues.filter(i => i.level === 'error');
          const warnings = issues.filter(i => i.level === 'warning');

          return (
            <Card key={channel.id} className={`border-2 ${
              errors.length > 0 ? 'border-red-200 dark:border-red-800' :
              warnings.length > 0 ? 'border-yellow-200 dark:border-yellow-800' :
              'border-green-200 dark:border-green-800'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{channel.youtubeChannelId}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {channel.isActive
                      ? <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                      : <Badge className="bg-gray-100 text-gray-600 border-0">Paused</Badge>}
                    {errors.length > 0 && <Badge className="bg-red-100 text-red-700 border-0">{errors.length} error{errors.length > 1 ? 's' : ''}</Badge>}
                    {warnings.length > 0 && <Badge className="bg-yellow-100 text-yellow-700 border-0">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</Badge>}
                  </div>
                </div>

                {/* Schedule info */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{channel.uploadTime}</span>
                  <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{FREQ_LABELS[channel.frequency] ?? channel.frequency}</span>
                  <span className="flex items-center gap-1"><ListVideo className="h-3.5 w-3.5" />{channel.queuedVideos.length} queued</span>
                  {channel.lastUploadDate && (
                    <span className="flex items-center gap-1">Last upload: {timeAgo(channel.lastUploadDate)}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Diagnosis checklist */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diagnosis</p>
                  <div className="space-y-1.5">
                    {issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
                  </div>
                </div>

                {/* Failed videos */}
                {failedVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Failed Videos ({failedVideos.length})</p>
                    <div className="space-y-1.5">
                      {failedVideos.map(v => (
                        <div key={v.id} className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          {v.error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">{v.error}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(v.updatedAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent logs */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recent Scheduler Logs ({recentLogs.length})
                  </p>
                  {recentLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No logs yet — scheduler has not processed this channel</p>
                  ) : (
                    <div className="space-y-1">
                      {recentLogs.map((log, i) => (
                        <div key={i} className={`flex items-start justify-between gap-2 p-2 rounded text-xs ${
                          log.status === 'success' ? 'bg-green-50 dark:bg-green-950/10' :
                          log.status === 'failed' ? 'bg-red-50 dark:bg-red-950/10' :
                          'bg-gray-50 dark:bg-gray-800/50'
                        }`}>
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <LogBadge status={log.status} />
                            <span className="text-muted-foreground break-words">{log.message ?? log.action}</span>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0 text-right">
                            <span className="block">{timeAgo(log.createdAt)}</span>
                            <span className="block">{fmt(log.createdAt)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Queued videos list */}
                {channel.queuedVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Queued Videos ({channel.queuedVideos.length})
                    </p>
                    <div className="space-y-1">
                      {channel.queuedVideos.slice(0, 5).map((v, i) => (
                        <div key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 border-b last:border-0">
                          <span className="w-4 text-center font-medium text-foreground">{i + 1}</span>
                          <span className="flex-1 truncate text-foreground">{v.title}</span>
                          <span>{timeAgo(v.createdAt)}</span>
                        </div>
                      ))}
                      {channel.queuedVideos.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-6">+{channel.queuedVideos.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {data.channels.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Youtube className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">This user has not connected any YouTube channel yet.</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
