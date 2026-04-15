'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trash2,
  Pause,
  CheckCircle,
  Loader2,
  Upload,
  FolderOpen,
  Library,
  Timer,
  CalendarClock,
  ListVideo,
  History,
  Tv2,
  Zap,
  Crown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import PublicDriveBrowser from '@/components/PublicDriveBrowser';
import VideoLibraryBrowser from '@/components/VideoLibraryBrowser';
import { getNextUploadTime } from '@/lib/utils-shared';

// ── Types ──────────────────────────────────────────────
interface Channel {
  id: string;
  name: string;
  youtubeChannelId: string;
  isActive: boolean;
  uploadTime: string;
  frequency: string;
  lastUploadDate: string | null;
  queuedVideos?: number;
  timezone?: string;
}

interface Video {
  id: string;
  title: string;
  originalName: string;
  status: string;
  createdAt: string;
  uploadedAt?: string;
  uploadedVideoId?: string;
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Every day',
  alternate: 'Every 2 days',
  every3days: 'Every 3 days',
  every5days: 'Every 5 days',
  everySunday: 'Every Sunday',
};

// ── Countdown Timer ────────────────────────────────────
function CountdownTimer({ channel }: { channel: Channel }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      if (!channel.isActive) { setTimeLeft(''); return; }
      const next = getNextUploadTime(channel);
      const diff = next.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Uploading soon...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [channel]);

  if (!timeLeft) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-300">
      <Timer className="h-3.5 w-3.5" />
      <span>Next upload in <strong>{timeLeft}</strong></span>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────
function Step({ n, done, active, label, subtitle }: {
  n: number; done: boolean; active: boolean; label: string; subtitle?: string;
}) {
  return (
    <div className={`flex items-center gap-3 py-3.5 px-4 rounded-2xl transition-all border ${
      active
        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
        : done
          ? 'bg-muted/30 border-border/40'
          : 'bg-muted/20 border-border/20 opacity-50'
    }`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle className="h-4 w-4" /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${active ? 'text-blue-700 dark:text-blue-300' : ''}`}>{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const name = searchParams.get('name');
    if (searchParams.get('connected') && name) {
      toast.success(`✅ ${decodeURIComponent(name)} connected!`);
      router.replace('/dashboard');
    }
  }, []);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [uploadTime, setUploadTime] = useState('18:00');
  const [frequency, setFrequency] = useState('daily');
  const [showDrive, setShowDrive] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'english' | 'hindi'>('hindi');

  // ── Load channel + plan in parallel ──
  const loadChannel = useCallback(async () => {
    try {
      const [channelRes, usageRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/usage'),
      ]);
      const channelData = await channelRes.json();
      const ch = channelData.channels?.[0] ?? null;
      setChannel(ch);
      if (ch) {
        setUploadTime(ch.uploadTime || '18:00');
        setFrequency(ch.frequency || 'daily');
      }
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setPlanName(usageData.plan?.displayName || usageData.plan?.name || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async (channelId: string) => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/videos?channelId=${channelId}&limit=100`);
      const data = await res.json();
      setVideos(data.videos || []);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => { loadChannel(); }, [loadChannel]);
  useEffect(() => { if (channel) loadVideos(channel.id); }, [channel, loadVideos]);

  // ── Step logic ──
  const hasChannel = !!channel;
  const queuedVideos = videos.filter(v => ['queued', 'scanning', 'copyright_skipped'].includes(v.status));
  const uploadedVideos = videos.filter(v => v.status === 'uploaded');
  const hasVideos = queuedVideos.length > 0;
  const isLive = hasChannel && hasVideos && !!channel?.isActive;
  const currentStep = !hasChannel ? 1 : !hasVideos ? 2 : !channel.isActive ? 3 : 0;

  // ── Actions ──
  const [connectingYT, setConnectingYT] = useState(false);
  const connectYouTube = async () => {
    setConnectingYT(true);
    try {
      const res = await fetch('/api/auth/youtube');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start YouTube connection');
        setConnectingYT(false);
      }
    } catch {
      toast.error('Something went wrong');
      setConnectingYT(false);
    }
  };

  const toggleActive = async (forceValue?: boolean) => {
    if (!channel) return;
    setTogglingActive(true);
    const newValue = forceValue !== undefined ? forceValue : !channel.isActive;
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newValue }),
      });
      if (res.ok) {
        setChannel(prev => prev ? { ...prev, isActive: newValue } : prev);
        toast.success(newValue ? 'Automation started! 🚀' : 'Automation paused');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setTogglingActive(false);
    }
  };

  const saveSchedule = async (): Promise<boolean> => {
    if (!channel) return false;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadTime, frequency }),
      });
      if (res.ok) {
        setChannel(prev => prev ? { ...prev, uploadTime, frequency } : prev);
        return true;
      }
      return false;
    } finally {
      setSavingSchedule(false);
    }
  };

  const startAutomation = async () => {
    const saved = await saveSchedule();
    if (saved) await toggleActive(true);
  };

  const disconnectChannel = async () => {
    if (!channel) return;
    setDeletingChannel(true);
    try {
      await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' });
      setChannel(null);
      setVideos([]);
      toast.success('Channel disconnected');
    } finally {
      setDeletingChannel(false);
      setDeleteConfirm(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!channel || files.length === 0) return;
    setUploading(true);
    setUploadProgress('Preparing upload...');
    try {
      // Step 1: Get presigned URLs (tiny JSON request, no file data)
      const presignRes = await fetch('/api/videos/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          files: Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })),
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        toast.error(presignData.error || 'Failed to prepare upload');
        return;
      }

      // Step 2: Upload each file directly to R2 (bypasses Vercel limit)
      const { presigned } = presignData;
      for (let i = 0; i < presigned.length; i++) {
        const { uploadUrl, publicUrl, originalName, size, type } = presigned[i];
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${presigned.length}: ${file.name}`);

        const r2Res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': type || 'video/mp4' },
        });
        if (!r2Res.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Step 3: Register video in DB
        await fetch('/api/videos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: channel.id, publicUrl, originalName, fileSize: size, mimeType: type }),
        });
      }

      toast.success(`${presigned.length} video${presigned.length > 1 ? 's' : ''} added to queue`);
      loadVideos(channel.id);
      loadChannel();
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateAITitles = async () => {
    if (!channel || queuedVideos.length === 0) return;
    setGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-for-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          videos: queuedVideos.map(v => ({ id: v.id, title: v.title || v.originalName })),
          topic: aiTopic.trim() || undefined,
          language: aiLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`AI titles generated for ${data.updated} videos`);
        loadVideos(channel.id);
      } else {
        toast.error(data.error || 'Failed to generate titles');
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  const saveTitle = async (videoId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, title: trimmed } : v));
    setEditingTitleId(null);
    await fetch('/api/videos/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, title: trimmed }),
    });
  };

  const deleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      setVideos(prev => prev.filter(v => v.id !== videoId));
      loadChannel();
    } finally {
      setDeletingVideoId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
        {/* plan bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-8 w-20 bg-muted rounded-xl" />
        </div>
        {/* status card skeleton */}
        <div className="h-28 bg-muted rounded-2xl" />
        {/* steps skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-14 bg-muted rounded-2xl" />
          <div className="h-14 bg-muted rounded-2xl opacity-60" />
          <div className="h-14 bg-muted rounded-2xl opacity-30" />
        </div>
        {/* tabs skeleton */}
        <div className="h-11 bg-muted rounded-xl" />
        <div className="space-y-2">
          <div className="h-12 bg-muted rounded-2xl" />
          <div className="h-12 bg-muted rounded-2xl opacity-70" />
          <div className="h-12 bg-muted rounded-2xl opacity-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* ── PLAN BAR ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {planName ?? 'Free'}
          </span>
        </div>
        {planName?.toLowerCase() !== 'premium' && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 rounded-xl"
            onClick={() => router.push('/billing')}
          >
            Upgrade
          </Button>
        )}
      </div>

      {/* ── LIVE STATUS BANNER ── */}
      {isLive && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="font-bold text-green-800 dark:text-green-200 text-sm">Automation Running</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 text-xs font-semibold"
              onClick={() => toggleActive(false)}
              disabled={togglingActive}
            >
              {togglingActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 mr-1" />}
              Pause
            </Button>
          </div>
          <CountdownTimer channel={channel!} />
          <div className="flex items-center gap-4 text-xs text-green-700 dark:text-green-400">
            <span className="flex items-center gap-1.5">
              <ListVideo className="h-3.5 w-3.5" />
              {queuedVideos.length} video{queuedVideos.length !== 1 ? 's' : ''} in queue
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {FREQ_LABELS[channel!.frequency]} · {channel!.uploadTime}
            </span>
          </div>
        </div>
      )}

      {/* ── SETUP STEPS (shown when not live) ── */}
      {!isLive && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Setup</p>

          {/* Step 1 */}
          <button className="w-full text-left" onClick={currentStep === 1 ? connectYouTube : undefined}>
            <Step
              n={1} done={hasChannel} active={currentStep === 1}
              label={hasChannel ? channel!.name : 'Connect YouTube Channel'}
              subtitle={hasChannel ? 'Channel connected' : 'Link your YouTube account'}
            />
          </button>

          {/* Step 1 action */}
          {currentStep === 1 && (
            <Button
              onClick={connectYouTube}
              disabled={connectingYT}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold rounded-2xl shadow-sm"
            >
              {connectingYT ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Tv2 className="h-5 w-5 mr-2" />}
              {connectingYT ? 'Connecting...' : 'Connect YouTube Channel'}
            </Button>
          )}

          {/* Step 2 */}
          {hasChannel && (
            <div className={`rounded-2xl border transition-all ${
              !hasVideos && currentStep === 2
                ? 'border-blue-200 dark:border-blue-800'
                : hasVideos
                  ? 'border-border/40'
                  : 'border-border/20 opacity-50'
            }`}>
              {/* Step 2 header */}
              <button
                className="w-full text-left"
                onClick={() => setShowAddOptions(v => !v)}
              >
                <div className={`flex items-center gap-3 py-3.5 px-4 rounded-2xl ${
                  !hasVideos && currentStep === 2
                    ? 'bg-blue-50 dark:bg-blue-950/40'
                    : 'bg-muted/30'
                }`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    hasVideos ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {hasVideos ? <CheckCircle className="h-4 w-4" /> : 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${!hasVideos && currentStep === 2 ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                      Add Videos to Queue
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasVideos ? `${queuedVideos.length} video${queuedVideos.length !== 1 ? 's' : ''} ready` : 'Drive, Library, or Device'}
                    </p>
                  </div>
                  {showAddOptions
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </button>

              {/* Step 2 expanded options */}
              {showAddOptions && (
                <div className="grid grid-cols-1 gap-2 px-3 pb-3">
                  <Button
                    variant="outline"
                    className="h-13 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                    onClick={() => setShowDrive(true)}
                  >
                    <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Google Drive</p>
                      <p className="text-xs text-muted-foreground font-normal">Import from your Drive folder</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-13 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
                    onClick={() => setShowLibrary(true)}
                  >
                    <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                      <Library className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Video Library</p>
                      <p className="text-xs text-muted-foreground font-normal">Pick from curated content</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-13 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <div className="h-8 w-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin text-green-600" /> : <Upload className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{uploading ? (uploadProgress || 'Uploading...') : 'Upload from Device'}</p>
                      <p className="text-xs text-muted-foreground font-normal">{uploading ? 'Please wait...' : 'Select video files'}</p>
                    </div>
                  </Button>
                  <input ref={fileInputRef} type="file" multiple accept="video/*" className="hidden"
                    onChange={e => e.target.files && handleFileUpload(e.target.files)} />
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {hasChannel && hasVideos && (
            <Step
              n={3} done={false} active={currentStep === 3}
              label="Start Automation"
              subtitle="Set schedule and go live"
            />
          )}
        </div>
      )}

      {/* ── STEP 3: SCHEDULE + START ── */}
      {currentStep === 3 && hasChannel && hasVideos && (
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set Schedule</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Upload Time</p>
              <input
                type="time"
                value={uploadTime}
                onChange={e => setUploadTime(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Frequency</p>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="alternate">Every 2 days</SelectItem>
                  <SelectItem value="every3days">Every 3 days</SelectItem>
                  <SelectItem value="every5days">Every 5 days</SelectItem>
                  <SelectItem value="everySunday">Every Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-2xl shadow-sm"
            onClick={startAutomation}
            disabled={savingSchedule || togglingActive}
          >
            {(savingSchedule || togglingActive)
              ? <Loader2 className="h-5 w-5 animate-spin mr-2" />
              : <Zap className="h-5 w-5 mr-2" />
            }
            Start Automation
          </Button>
        </div>
      )}

      {/* ── ADD MORE VIDEOS (when live) ── */}
      {isLive && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Add More Videos</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-14 rounded-2xl flex-col gap-1.5 text-xs font-semibold border-border/60 hover:border-blue-300 hover:bg-blue-50/50"
              onClick={() => setShowDrive(true)}
            >
              <FolderOpen className="h-5 w-5 text-blue-500" />
              Drive
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl flex-col gap-1.5 text-xs font-semibold border-border/60 hover:border-purple-300 hover:bg-purple-50/50"
              onClick={() => setShowLibrary(true)}
            >
              <Library className="h-5 w-5 text-purple-500" />
              Library
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl flex-col gap-1.5 text-xs font-semibold border-border/60 hover:border-green-300 hover:bg-green-50/50"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-green-500" /> : <Upload className="h-5 w-5 text-green-500" />}
              {uploading ? 'Uploading' : 'Upload'}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="video/*" className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)} />
        </div>
      )}

      {/* ── SCHEDULE EDIT (when live) ── */}
      {isLive && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Schedule</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={uploadTime}
              onChange={e => setUploadTime(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="alternate">Every 2 days</SelectItem>
                <SelectItem value="every3days">Every 3 days</SelectItem>
                <SelectItem value="every5days">Every 5 days</SelectItem>
                <SelectItem value="everySunday">Every Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(uploadTime !== channel?.uploadTime || frequency !== channel?.frequency) && (
            <Button
              size="sm"
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="w-full rounded-xl h-10 font-semibold"
            >
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Schedule
            </Button>
          )}
        </div>
      )}

      {/* ── QUEUE + HISTORY TABS ── */}
      {hasChannel && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-xl h-11 bg-muted/60">
            <TabsTrigger value="queue" className="flex-1 rounded-lg gap-1.5 text-sm font-semibold">
              <ListVideo className="h-4 w-4" />
              Queue
              {queuedVideos.length > 0 && (
                <Badge className="h-5 px-1.5 text-xs bg-blue-600 hover:bg-blue-600">{queuedVideos.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-lg gap-1.5 text-sm font-semibold">
              <History className="h-4 w-4" />
              History
              {uploadedVideos.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{uploadedVideos.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-3 space-y-3">

            {/* AI Generate section — shown when videos exist */}
            {queuedVideos.length > 0 && (
              <div className="border border-border/50 rounded-2xl p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Title & Description</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Topic (e.g. Motivation, Krishna)"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <select
                    value={aiLanguage}
                    onChange={e => setAiLanguage(e.target.value as 'english' | 'hindi')}
                    className="h-9 rounded-xl border border-input bg-background px-2 text-sm focus:outline-none"
                  >
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </select>
                </div>
                <Button
                  className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
                  onClick={generateAITitles}
                  disabled={generatingAI}
                >
                  {generatingAI
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
                    : <><Zap className="h-4 w-4 mr-2" />Generate for all {queuedVideos.length} videos</>
                  }
                </Button>
              </div>
            )}

            {loadingVideos ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : queuedVideos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ListVideo className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs mt-1">Add videos using the buttons above</p>
              </div>
            ) : (
              queuedVideos.map((video, i) => (
                <div key={video.id} className="flex items-center gap-3 bg-muted/40 hover:bg-muted/60 rounded-2xl px-3 py-3 transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-center font-bold tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    {editingTitleId === video.id ? (
                      <input
                        autoFocus
                        className="w-full text-sm font-medium bg-background border border-blue-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={editingTitleValue}
                        onChange={e => setEditingTitleValue(e.target.value)}
                        onBlur={() => saveTitle(video.id, editingTitleValue)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveTitle(video.id, editingTitleValue);
                          if (e.key === 'Escape') setEditingTitleId(null);
                        }}
                      />
                    ) : (
                      <p
                        className="text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors"
                        title="Click to edit title"
                        onClick={() => { setEditingTitleId(video.id); setEditingTitleValue(video.title || video.originalName); }}
                      >
                        {video.title || video.originalName}
                      </p>
                    )}
                    {i === 0 && channel?.isActive ? (
                      <p className="text-xs text-green-600 font-medium mt-0.5">Next to upload</p>
                    ) : video.status === 'scanning' ? (
                      <p className="text-xs text-yellow-600 font-medium mt-0.5">Scanning...</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => deleteVideo(video.id)}
                    disabled={deletingVideoId === video.id}
                    className="text-muted-foreground/50 hover:text-red-500 shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    {deletingVideoId === video.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-3 space-y-2">
            {loadingVideos ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : uploadedVideos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No uploads yet</p>
                <p className="text-xs mt-1">Uploaded videos will appear here</p>
              </div>
            ) : (
              uploadedVideos.slice(0, 50).map(video => (
                <div key={video.id} className="flex items-center gap-3 bg-muted/40 rounded-2xl px-3 py-3">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title || video.originalName}</p>
                    {video.uploadedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(video.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {video.uploadedVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${video.uploadedVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-semibold shrink-0 hover:text-blue-700"
                    >
                      Watch ↗
                    </a>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── DISCONNECT ── */}
      {hasChannel && (
        <div className="pt-2 border-t border-border/40">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-xs text-muted-foreground/60 hover:text-red-500 transition-colors w-full text-center py-2"
          >
            Disconnect channel
          </button>
        </div>
      )}

      {/* ── MODALS ── */}
      {channel && (
        <PublicDriveBrowser
          open={showDrive}
          channelId={channel.id}
          onClose={() => setShowDrive(false)}
          onVideosAdded={() => { setShowDrive(false); loadVideos(channel.id); loadChannel(); }}
        />
      )}
      {channel && (
        <VideoLibraryBrowser
          open={showLibrary}
          channels={[{ id: channel.id, name: channel.name }]}
          defaultChannelId={channel.id}
          onClose={() => setShowLibrary(false)}
          onVideosAdded={() => { setShowLibrary(false); loadVideos(channel.id); loadChannel(); }}
        />
      )}

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect channel?</AlertDialogTitle>
            <AlertDialogDescription>
              Automation will stop. Videos in your queue will remain saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={disconnectChannel}
              disabled={deletingChannel}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingChannel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
