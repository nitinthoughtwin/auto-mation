'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  Upload,
  Youtube,
  Activity,
  Play,
  ArrowLeft,
  Zap,
  Timer,
  CalendarCheck,
} from 'lucide-react';

interface SystemHealth {
  lastSchedulerRun: string | null;
  lastSchedulerStatus: string | null;
  todayUploads: number;
  todayFailed: number;
  totalQueued: number;
  totalFailedVideos: number;
  stuckChannelsCount: number;
}

interface ChannelHealth {
  id: string;
  name: string;
  isActive: boolean;
  uploadTime: string;
  frequency: string;
  timezone: string;
  lastUploadDate: string | null;
  queuedVideos: number;
  hasRefreshToken: boolean;
  hasUserId: boolean;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
  issues: string[];
}

interface FailedVideo {
  id: string;
  title: string;
  error: string | null;
  updatedAt: string;
  channel: {
    id: string;
    name: string;
    user: { email: string } | null;
  };
}

interface SchedulerLog {
  id: string;
  channelId: string;
  channelName: string;
  videoId: string | null;
  action: string;
  status: string;
  message: string | null;
  createdAt: string;
}

interface CronHealth {
  status: 'healthy' | 'delayed' | 'down' | 'unknown';
  lastFiredAt: string | null;
  minutesSinceLastFire: number | null;
  cronFiresToday: number;
  avgIntervalMinutes: number | null;
  expectedIntervalMinutes: number;
}

interface MonitoringData {
  systemHealth: SystemHealth;
  cronHealth: CronHealth;
  channelHealth: ChannelHealth[];
  stuckChannels: ChannelHealth[];
  failedVideos: FailedVideo[];
  schedulerLogs: SchedulerLog[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge className="bg-green-100 text-green-700 border-0">Success</Badge>;
  if (status === 'failed') return <Badge className="bg-red-100 text-red-700 border-0">Failed</Badge>;
  if (status === 'blocked') return <Badge className="bg-orange-100 text-orange-700 border-0">Blocked</Badge>;
  if (status === 'skipped') return <Badge className="bg-yellow-100 text-yellow-700 border-0">Skipped</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function MonitoringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'logs' | 'failures'>('overview');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/monitoring');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') { router.push('/dashboard'); return; }
      loadData();
    }
  }, [status, session, router, loadData]);

  const triggerScheduler = async () => {
    setTriggeringScheduler(true);
    setSchedulerResult(null);
    try {
      const res = await fetch('/api/scheduler', { method: 'POST' });
      const json = await res.json();
      setSchedulerResult(json.message || JSON.stringify(json));
      await loadData(true);
    } catch (e: any) {
      setSchedulerResult('Error: ' + e.message);
    } finally {
      setTriggeringScheduler(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load monitoring data</p>
      </div>
    );
  }

  const { systemHealth, cronHealth, channelHealth, stuckChannels, failedVideos, schedulerLogs } = data;
  const healthScore =
    systemHealth.todayFailed === 0 && systemHealth.stuckChannelsCount === 0 && systemHealth.totalFailedVideos === 0
      ? 'good'
      : systemHealth.todayFailed > 2 || systemHealth.stuckChannelsCount > 2
      ? 'bad'
      : 'warn';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-500" />
                System Monitoring
              </h1>
              <p className="text-sm text-muted-foreground">Real-time platform health & upload status</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={triggerScheduler}
              disabled={triggeringScheduler}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {triggeringScheduler ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run Scheduler Now
            </Button>
          </div>
        </div>

        {/* Scheduler Result */}
        {schedulerResult && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
            <strong>Scheduler Result:</strong> {schedulerResult}
          </div>
        )}

        {/* Overall Health Banner */}
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          healthScore === 'good' ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' :
          healthScore === 'warn' ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
          'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          {healthScore === 'good' ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          ) : healthScore === 'warn' ? (
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${
              healthScore === 'good' ? 'text-green-800 dark:text-green-300' :
              healthScore === 'warn' ? 'text-yellow-800 dark:text-yellow-300' :
              'text-red-800 dark:text-red-300'
            }`}>
              {healthScore === 'good' ? 'All systems normal' :
               healthScore === 'warn' ? 'Minor issues detected' :
               'Issues need attention'}
            </p>
            <p className="text-sm text-muted-foreground">
              Last scheduler run:{' '}
              {systemHealth.lastSchedulerRun
                ? `${timeAgo(systemHealth.lastSchedulerRun)} (${systemHealth.lastSchedulerStatus})`
                : 'Never'}
            </p>
          </div>
        </div>

        {/* Cron Health Card */}
        <Card className={`mb-6 border-2 ${
          cronHealth.status === 'healthy' ? 'border-green-300 dark:border-green-700' :
          cronHealth.status === 'delayed' ? 'border-yellow-300 dark:border-yellow-700' :
          cronHealth.status === 'down' ? 'border-red-300 dark:border-red-700' :
          'border-gray-200'
        }`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Status indicator */}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  cronHealth.status === 'healthy' ? 'bg-green-500 animate-pulse' :
                  cronHealth.status === 'delayed' ? 'bg-yellow-500 animate-pulse' :
                  cronHealth.status === 'down' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Cron Job Status:
                    <span className={
                      cronHealth.status === 'healthy' ? 'text-green-600' :
                      cronHealth.status === 'delayed' ? 'text-yellow-600' :
                      cronHealth.status === 'down' ? 'text-red-600' :
                      'text-gray-500'
                    }>
                      {cronHealth.status === 'healthy' ? 'Healthy' :
                       cronHealth.status === 'delayed' ? 'Delayed' :
                       cronHealth.status === 'down' ? 'DOWN / Not Firing' :
                       'Unknown (no data yet)'}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expected every {cronHealth.expectedIntervalMinutes} minutes
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 sm:ml-auto text-sm">
                <div className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last fired:</span>
                  <span className="font-medium">
                    {cronHealth.lastFiredAt
                      ? `${cronHealth.minutesSinceLastFire}m ago (${formatTime(cronHealth.lastFiredAt)})`
                      : 'Never'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Today:</span>
                  <span className="font-medium">{cronHealth.cronFiresToday} fires</span>
                  {cronHealth.cronFiresToday > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (expected ~{Math.floor(24 * 60 / cronHealth.expectedIntervalMinutes)})
                    </span>
                  )}
                </div>
                {cronHealth.avgIntervalMinutes !== null && (
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Avg interval:</span>
                    <span className={`font-medium ${cronHealth.avgIntervalMinutes > 8 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {cronHealth.avgIntervalMinutes}m
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning messages */}
            {cronHealth.status === 'down' && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                Cron job has not fired in {cronHealth.minutesSinceLastFire} minutes. Check cron-job.org or your scheduler configuration.
                The scheduler URL should be hit every 5 minutes: <code className="font-mono text-xs">/api/scheduler</code>
              </div>
            )}
            {cronHealth.status === 'delayed' && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-700 dark:text-yellow-400">
                Cron is running but delayed ({cronHealth.minutesSinceLastFire}m since last fire). Expected every 5 minutes.
              </div>
            )}
            {cronHealth.status === 'unknown' && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-muted-foreground">
                No heartbeat data yet. Cron needs to run at least once after this update to show status.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Uploads</p>
                  <p className="text-2xl font-bold text-green-600">{systemHealth.todayUploads}</p>
                </div>
                <Upload className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Failures</p>
                  <p className={`text-2xl font-bold ${systemHealth.todayFailed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {systemHealth.todayFailed}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-100" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Queued</p>
                  <p className="text-2xl font-bold text-blue-600">{systemHealth.totalQueued}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Stuck Channels</p>
                  <p className={`text-2xl font-bold ${systemHealth.stuckChannelsCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {systemHealth.stuckChannelsCount}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b">
          {(['overview', 'channels', 'logs', 'failures'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'failures' && systemHealth.totalFailedVideos > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {systemHealth.totalFailedVideos}
                </span>
              )}
              {tab === 'channels' && systemHealth.stuckChannelsCount > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {systemHealth.stuckChannelsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stuck Channels */}
            {stuckChannels.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    Stuck Channels ({stuckChannels.length})
                  </CardTitle>
                  <CardDescription>Active channels with queued videos but no upload in 48+ hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stuckChannels.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{ch.name}</p>
                          <p className="text-xs text-muted-foreground">{ch.userEmail} · {ch.queuedVideos} queued · uploads at {ch.uploadTime}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          Last upload: {ch.lastUploadDate ? timeAgo(ch.lastUploadDate) : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Scheduler Activity (last 20) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Activity (Last 20 runs)</CardTitle>
              </CardHeader>
              <CardContent>
                {schedulerLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No scheduler logs yet</p>
                ) : (
                  <div className="space-y-1">
                    {schedulerLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start justify-between py-2 border-b last:border-0">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <StatusBadge status={log.status} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{log.channelName}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-3 flex-shrink-0">{timeAgo(log.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                All Channels ({channelHealth.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {channelHealth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No channels found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Channel</th>
                        <th className="pb-2 pr-4 font-medium">User</th>
                        <th className="pb-2 pr-4 font-medium">Schedule</th>
                        <th className="pb-2 pr-4 font-medium">Last Upload</th>
                        <th className="pb-2 pr-4 font-medium">Queue</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelHealth.map((ch) => (
                        <tr key={ch.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4">
                            <p className="font-medium">{ch.name}</p>
                            {ch.issues.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ch.issues.filter(i => i !== 'No queued videos').map((issue) => (
                                  <span key={issue} className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            <p>{ch.userName ?? '—'}</p>
                            <p>{ch.userEmail ?? 'No user'}</p>
                          </td>
                          <td className="py-2 pr-4 text-xs">
                            <p>{ch.uploadTime}</p>
                            <p className="text-muted-foreground">{ch.frequency}</p>
                          </td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            {ch.lastUploadDate ? (
                              <>
                                <p>{timeAgo(ch.lastUploadDate)}</p>
                                <p>{formatTime(ch.lastUploadDate)}</p>
                              </>
                            ) : (
                              <span className="text-yellow-600">Never</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`text-sm font-medium ${ch.queuedVideos > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                              {ch.queuedVideos}
                            </span>
                          </td>
                          <td className="py-2">
                            {ch.isActive ? (
                              <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-0">Inactive</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scheduler Logs (Last 100)</CardTitle>
              <CardDescription>Every upload attempt — success, failure, or skip with reason</CardDescription>
            </CardHeader>
            <CardContent>
              {schedulerLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No logs found</p>
              ) : (
                <div className="space-y-0.5">
                  {schedulerLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start justify-between p-2 rounded text-sm ${
                        log.status === 'success' ? 'bg-green-50 dark:bg-green-900/10' :
                        log.status === 'failed' ? 'bg-red-50 dark:bg-red-900/10' :
                        'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <StatusBadge status={log.status} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{log.channelName}</p>
                          {log.message && (
                            <p className="text-xs text-muted-foreground break-words">{log.message}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground ml-3 flex-shrink-0 text-right">
                        <span className="block">{timeAgo(log.createdAt)}</span>
                        <span className="block">{formatTime(log.createdAt)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Failures Tab */}
        {activeTab === 'failures' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed Videos ({failedVideos.length})
              </CardTitle>
              <CardDescription>Videos that failed to upload — check error messages to diagnose</CardDescription>
            </CardHeader>
            <CardContent>
              {failedVideos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No failed videos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {failedVideos.map((video) => (
                    <div key={video.id} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {video.channel.name} · {video.channel.user?.email ?? 'No user'}
                          </p>
                          {video.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                              Error: {video.error}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(video.updatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
