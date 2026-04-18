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
  Pencil,
  X,
  Lock,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  fileName?: string | null;
  uploadedAt?: string;
  uploadedVideoId?: string;
  driveFileId?: string | null;
  thumbnailDriveId?: string | null;
  thumbnailName?: string | null;
  description?: string | null;
  tags?: string | null;
}

function getVideoThumbnail(video: { driveFileId?: string | null; thumbnailDriveId?: string | null; thumbnailName?: string | null; uploadedVideoId?: string }): string | null {
  // YouTube thumbnail (uploaded)
  if (video.uploadedVideoId) return `https://img.youtube.com/vi/${video.uploadedVideoId}/mqdefault.jpg`;
  // Custom thumbnail from Drive
  if (video.thumbnailDriveId) return `https://drive.google.com/thumbnail?id=${video.thumbnailDriveId}&sz=w120`;
  if (video.thumbnailName && video.thumbnailName.length > 10) return `https://drive.google.com/thumbnail?id=${video.thumbnailName}&sz=w120`;
  // Drive video thumbnail
  if (video.driveFileId) return `https://drive.google.com/thumbnail?id=${video.driveFileId}&sz=w120`;
  return null;
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  alternate: 'Every 2 days',
  every3days: 'Every 3 days',
  every5days: 'Every 5 days',
  everySunday: 'Sundays',
};

// ── Countdown Timer ────────────────────────────────────
function CountdownTimer({ channel }: { channel: Channel }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [exactTime, setExactTime] = useState('');
  // Random delay 1–5 min, stable per mount
  const delayMs = useRef((Math.floor(Math.random() * 5) + 1) * 60 * 1000);

  useEffect(() => {
    const update = () => {
      if (!channel.isActive) { setTimeLeft(''); setExactTime(''); return; }
      const base = getNextUploadTime(channel);
      const next = new Date(base.getTime() + delayMs.current);
      const diff = next.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Uploading soon...'); setExactTime(''); return; }
      const totalSecs = Math.floor(diff / 1000);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      const timeStr = d > 0
        ? `${d}d ${h}h ${m}m ${s}s`
        : h > 0
          ? `${h}h ${m}m ${s}s`
          : `${m}m ${s}s`;
      setTimeLeft(timeStr);
      setExactTime(next.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [channel]);

  if (!timeLeft) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-300">
      <Timer className="h-3.5 w-3.5" />
      <span>Next upload in <strong>{timeLeft}</strong>{exactTime && <span className="text-green-600/70 dark:text-green-400/70 font-normal"> · {exactTime}</span>}</span>
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
  const [aiLanguage, setAiLanguage] = useState<'english' | 'hindi'>('english');
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingEditAI, setGeneratingEditAI] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  // ── Channel warnings (loaded in background after channel load) ──
  interface ChannelWarning {
    type: string;
    severity: 'error' | 'warning';
    title: string;
    message: string;
    action?: { label: string; href: string };
  }
  const [warnings, setWarnings] = useState<ChannelWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // ── Load channel + plan + videos in one shot ──
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
        // load videos before revealing the page
        const vidRes = await fetch(`/api/videos?channelId=${ch.id}&limit=100`);
        const vidData = await vidRes.json();
        setVideos(vidData.videos || []);
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

  // Load channel health warnings in background after channel is known
  useEffect(() => {
    if (!channel) return;
    fetch(`/api/channels/${channel.id}/health`)
      .then(r => r.ok ? r.json() : { warnings: [] })
      .then(data => setWarnings(data.warnings || []))
      .catch(() => {});
  }, [channel?.id]);

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

    // Block saving if upload time is within 30 minutes from now
    const [h, m] = uploadTime.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(h, m, 0, 0);
    if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1); // tomorrow if already passed
    const diffMins = (scheduled.getTime() - now.getTime()) / 60000;
    if (diffMins < 30) {
      toast.error(`Upload time is too soon. Please set a time at least 30 minutes from now (current gap: ${Math.floor(diffMins)} min).`);
      return false;
    }

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
        if (presignData.limitExceeded === 'videos' || presignData.limitExceeded === 'plan') {
          setUpgradeReason(presignData.error || 'Upgrade to Pro to upload more videos.');
          setShowUpgradeModal(true);
        } else {
          toast.error(presignData.error || 'Failed to prepare upload');
        }
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

  const toggleVideoSelect = (id: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generateAITitles = async () => {
    if (!channel) return;
    const targets = selectedVideoIds.size > 0
      ? queuedVideos.filter(v => selectedVideoIds.has(v.id))
      : queuedVideos;
    if (targets.length === 0) return;
    setGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-for-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          videos: targets.map(v => ({ id: v.id, title: v.title || v.originalName })),
          topic: aiTopic.trim() || undefined,
          language: aiLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`AI titles generated for ${data.updated} videos`);
        setSelectedVideoIds(new Set());
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

  const deleteSelectedVideos = async () => {
    if (selectedVideoIds.size === 0) return;
    setDeletingSelected(true);
    try {
      await Promise.all(Array.from(selectedVideoIds).map(id =>
        fetch(`/api/videos/${id}`, { method: 'DELETE' })
      ));
      setVideos(prev => prev.filter(v => !selectedVideoIds.has(v.id)));
      setSelectedVideoIds(new Set());
      loadChannel();
      toast.success(`${selectedVideoIds.size} video${selectedVideoIds.size > 1 ? 's' : ''} deleted`);
    } finally {
      setDeletingSelected(false);
    }
  };

  const openEditDialog = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title || video.originalName);
    setEditDescription(video.description || '');
    setEditTags(video.tags || '');
  };

  const saveVideoEdit = async () => {
    if (!editingVideo) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/videos/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: editingVideo.id, title: editTitle.trim(), description: editDescription.trim(), tags: editTags.trim() }),
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => v.id === editingVideo.id
          ? { ...v, title: editTitle.trim(), description: editDescription.trim(), tags: editTags.trim() }
          : v
        ));
        setEditingVideo(null);
        toast.success('Video updated');
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const generateAIForVideo = async () => {
    if (!editingVideo || !channel) return;
    setGeneratingEditAI(true);
    try {
      const res = await fetch('/api/ai/generate-for-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          videos: [{ id: editingVideo.id, title: editTitle || editingVideo.originalName }],
          topic: aiTopic.trim() || undefined,
          language: aiLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.results?.[0]) {
        const r = data.results[0];
        const newTitle = r.title || editTitle;
        const newDesc = r.description || editDescription;
        const newTags = r.tags ? (Array.isArray(r.tags) ? r.tags.join(', ') : r.tags) : editTags;
        if (r.title) setEditTitle(newTitle);
        if (r.description) setEditDescription(newDesc);
        if (r.tags) setEditTags(newTags);
        // Also update the grid immediately (without waiting for save)
        setVideos(prev => prev.map(v =>
          v.id === editingVideo.id
            ? { ...v, title: newTitle, description: newDesc, tags: newTags }
            : v
        ));
        toast.success('AI content generated');
      } else {
        toast.error(data.error || 'Failed to generate');
      }
    } finally {
      setGeneratingEditAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  console.log('Channel:', channel);

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

      {/* ── CHANNEL WARNINGS ── */}
      {warnings
        .filter(w => !dismissedWarnings.has(w.type))
        .map(w => (
          <div
            key={w.type}
            className={`rounded-2xl p-4 border flex gap-3 ${
              w.severity === 'error'
                ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
            }`}
          >
            {w.severity === 'error'
              ? <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${w.severity === 'error' ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
                {w.title}
              </p>
              <p className={`text-xs mt-0.5 ${w.severity === 'error' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                {w.message}
              </p>
              {w.action && (
                <button
                  onClick={() => router.push(w.action!.href)}
                  className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    w.severity === 'error'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                  {w.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => setDismissedWarnings(prev => new Set([...prev, w.type]))}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))
      }

      {/* ── LIVE STATUS BANNER ── */}
      {isLive && (() => {
        const limitWarning = warnings.find(w => w.type === 'plan_limit' && !dismissedWarnings.has(w.type));
        const authWarning = warnings.find(w => (w.type === 'youtube_auth' || w.type === 'no_refresh_token') && !dismissedWarnings.has(w.type));
        const isBlocked = !!limitWarning || !!authWarning;

        return (
          <div className={`rounded-2xl p-4 space-y-3 border ${
            isBlocked
              ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
              : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBlocked ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                )}
                <span className={`font-bold text-sm ${isBlocked ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
                  {isBlocked ? 'Automation Paused — Uploads Blocked' : 'Automation Running'}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 text-xs font-semibold px-2.5"
                onClick={() => toggleActive(false)}
                disabled={togglingActive}
              >
                {togglingActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 mr-1" />}
                Pause
              </Button>
            </div>

            {/* Blocked reason */}
            {limitWarning && (
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">{limitWarning.title}</p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">{limitWarning.message}</p>
                  {limitWarning.action && (
                    <button
                      onClick={() => router.push(limitWarning.action!.href)}
                      className="mt-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 underline underline-offset-2"
                    >
                      {limitWarning.action.label} →
                    </button>
                  )}
                </div>
              </div>
            )}

            {authWarning && (
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">{authWarning.title}</p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">{authWarning.message}</p>
                  {authWarning.action && (
                    <button
                      onClick={() => router.push(authWarning.action!.href)}
                      className="mt-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 underline underline-offset-2"
                    >
                      {authWarning.action.label} →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Normal countdown — only when not blocked */}
            {!isBlocked && <CountdownTimer channel={channel!} />}

            <div className={`flex items-center gap-4 text-xs ${isBlocked ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
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
        );
      })()}

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
              className="w-full bg-red-600 hover:bg-red-700 text-white h-10 text-sm font-semibold rounded-2xl shadow-sm"
            >
              {connectingYT ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tv2 className="h-4 w-4 mr-2" />}
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
                    className="h-12 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
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
                    className="h-12 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
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
                    className="h-12 rounded-2xl justify-start gap-3 text-sm font-medium border-border/60 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      if (planName?.toLowerCase() === 'free') {
                        setUpgradeReason('Upload from Device is a Pro feature. Upgrade to upload videos directly from your phone or computer.');
                        setShowUpgradeModal(true);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    disabled={uploading}
                  >
                    <div className="h-8 w-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      {planName?.toLowerCase() === 'free'
                        ? <Lock className="h-4 w-4 text-green-600" />
                        : uploading
                          ? <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                          : <Upload className="h-4 w-4 text-green-600" />
                      }
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{uploading ? (uploadProgress || 'Uploading...') : 'Upload from Device'}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {planName?.toLowerCase() === 'free' ? '🔒 Pro plan required' : uploading ? 'Please wait...' : 'Select video files'}
                      </p>
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
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set Schedule</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Upload Time</label>
              <input
                type="time"
                value={uploadTime}
                onChange={e => setUploadTime(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Repeat</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9 w-full rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="alternate">Every 2 days</SelectItem>
                  <SelectItem value="every3days">Every 3 days</SelectItem>
                  <SelectItem value="every5days">Every 5 days</SelectItem>
                  <SelectItem value="everySunday">Sundays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-2xl shadow-sm"
            onClick={startAutomation}
            disabled={savingSchedule || togglingActive}
          >
            {(savingSchedule || togglingActive)
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Zap className="h-4 w-4 mr-2" />
            }
            Start Automation
          </Button>
        </div>
      )}

      {/* ── ADD MORE VIDEOS (when live) ── */}
      {isLive && (
        <div className="border border-border/40 rounded-2xl p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add More Videos</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-2xl flex-col gap-1 text-xs font-semibold border-border/60 hover:border-blue-300 hover:bg-blue-50/50"
              onClick={() => setShowDrive(true)}
            >
              <FolderOpen className="h-4 w-4 text-blue-500" />
              Drive
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl flex-col gap-1 text-xs font-semibold border-border/60 hover:border-purple-300 hover:bg-purple-50/50"
              onClick={() => setShowLibrary(true)}
            >
              <Library className="h-4 w-4 text-purple-500" />
              Library
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl flex-col gap-1 text-xs font-semibold border-border/60 hover:border-green-300 hover:bg-green-50/50 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                if (planName?.toLowerCase() === 'free') {
                  setUpgradeReason('Upload from Device is a Pro feature. Upgrade to upload videos directly from your phone or computer.');
                  setShowUpgradeModal(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={uploading}
            >
              {planName?.toLowerCase() === 'free'
                ? <Lock className="h-4 w-4 text-green-500" />
                : uploading
                  ? <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  : <Upload className="h-4 w-4 text-green-500" />
              }
              {planName?.toLowerCase() === 'free' ? 'Pro Only' : uploading ? 'Uploading' : 'Upload'}
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
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Upload Time</label>
              <input
                type="time"
                value={uploadTime}
                onChange={e => setUploadTime(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9 w-full rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="alternate">Every 2 days</SelectItem>
                  <SelectItem value="every3days">Every 3 days</SelectItem>
                  <SelectItem value="every5days">Every 5 days</SelectItem>
                  <SelectItem value="everySunday">Sundays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(uploadTime !== channel?.uploadTime || frequency !== channel?.frequency) && (
            <Button
              size="sm"
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="w-full rounded-xl h-9 text-sm font-semibold"
            >
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Schedule
            </Button>
          )}
        </div>
      )}

      {/* ── QUEUE + HISTORY TABS ── */}
      {hasChannel && (
        <div className="border border-border/60 rounded-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-3 pt-3">
              <TabsList className="w-full rounded-xl h-10 bg-muted/60">
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
                  {videos.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{videos.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-0 p-3 space-y-2">

            {/* AI Generate section — only when videos selected */}
            {selectedVideoIds.size > 0 && (
              <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-2.5 space-y-2 bg-purple-50/50 dark:bg-purple-950/20">
                {/* Row 1: hint + language */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Topic hint (optional)"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="flex-1 min-w-0 h-7 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                  />
                  <Select value={aiLanguage} onValueChange={v => setAiLanguage(v as 'english' | 'hindi')}>
                    <SelectTrigger className="h-7 w-24 shrink-0 rounded-lg text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Row 2: AI button full width */}
                <Button
                  className="w-full h-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  onClick={generateAITitles}
                  disabled={generatingAI}
                >
                  {generatingAI
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Generating...</>
                    : <><Zap className="h-3.5 w-3.5 mr-1.5" />AI Generate Title & Description ({selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? 's' : ''})</>
                  }
                </Button>
              </div>
            )}

            {/* Selection action bar */}
            {selectedVideoIds.size > 0 && (
              <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-1.5">
                <span className="text-xs text-muted-foreground">{selectedVideoIds.size} selected</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 px-2.5 text-xs font-semibold rounded-lg"
                  onClick={deleteSelectedVideos}
                  disabled={deletingSelected}
                >
                  {deletingSelected ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Delete
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
              <div className="relative space-y-1.5">
                {/* AI generation overlay */}
                {generatingAI && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-700 px-4 py-2.5 rounded-xl shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating AI titles...
                    </div>
                  </div>
                )}
                {queuedVideos.map((video, i) => (
                  <div key={video.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${selectedVideoIds.has(video.id) ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/40 hover:bg-muted/60'}`}>
                    <input
                      type="checkbox"
                      checked={selectedVideoIds.has(video.id)}
                      onChange={() => toggleVideoSelect(video.id)}
                      className="h-4 w-4 rounded accent-blue-600 shrink-0 cursor-pointer"
                    />
                    {/* Thumbnail */}
                    {(() => {
                      const thumb = getVideoThumbnail(video);
                      const canPlay = !!(video.fileName || video.driveFileId);
                      return thumb ? (
                        <div
                          className={`relative h-10 w-16 rounded-lg shrink-0 overflow-hidden group ${canPlay ? 'cursor-pointer' : ''}`}
                          onClick={canPlay ? () => setPlayingVideo(video) : undefined}
                        >
                          <img src={thumb} alt="" className="h-full w-full object-cover bg-muted" />
                          {canPlay && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="h-5 w-5 rounded-full bg-white/90 flex items-center justify-center">
                                <svg className="h-2.5 w-2.5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 8 8"><polygon points="1,0 7,4 1,8"/></svg>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`h-10 w-16 rounded-lg bg-muted shrink-0 flex items-center justify-center ${canPlay ? 'cursor-pointer hover:bg-muted/70' : ''}`}
                          onClick={canPlay ? () => setPlayingVideo(video) : undefined}
                        >
                          <ListVideo className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      );
                    })()}
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
                      onClick={() => openEditDialog(video)}
                      className="text-muted-foreground/50 hover:text-blue-500 shrink-0 p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0 p-3 space-y-1.5">
            {loadingVideos ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const historyVideos = videos.filter(v => ['uploaded', 'failed', 'queued', 'scanning'].includes(v.status));
              if (historyVideos.length === 0) {
                return (
                  <div className="text-center py-10 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No videos added yet</p>
                    <p className="text-xs mt-1">Videos you add will appear here</p>
                  </div>
                );
              }
              return (
                <>
                  {/* Usage summary */}
                  <div className="flex items-center justify-between px-1 pb-1 border-b mb-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{uploadedVideos.length}</span> uploaded ·{' '}
                      <span className="font-semibold text-foreground">{queuedVideos.length}</span> in queue ·{' '}
                      <span className="font-semibold text-foreground">{videos.filter(v => v.status === 'failed').length}</span> failed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {historyVideos.length} total this month
                    </p>
                  </div>
                  {historyVideos.slice(0, 50).map(video => (
                    <div key={video.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                      {video.status === 'uploaded'
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : video.status === 'failed'
                          ? <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                          : <Loader2 className="h-4 w-4 text-blue-400 shrink-0 animate-spin" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title || video.originalName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {video.status === 'uploaded' && video.uploadedAt
                            ? `Uploaded · ${new Date(video.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : video.status === 'failed'
                              ? `Failed · ${video.uploadedAt ? new Date(video.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'check queue'}`
                              : `In queue · added ${new Date(video.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                          }
                        </p>
                      </div>
                      {video.status === 'uploaded' && video.uploadedVideoId && (
                        <a
                          href={`https://youtube.com/watch?v=${video.uploadedVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 font-semibold shrink-0 hover:text-blue-700"
                        >
                          Watch ↗
                        </a>
                      )}
                      {video.status !== 'uploaded' && (
                        <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                          video.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {video.status === 'failed' ? 'Failed' : 'Queued'}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              );
            })()}
          </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── DISCONNECT ── */}
      {hasChannel && (
        <button
          onClick={() => setDeleteConfirm(true)}
          className="text-xs text-muted-foreground/40 hover:text-red-500 transition-colors w-full text-center py-1"
        >
          Disconnect channel
        </button>
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

      {/* ── EDIT VIDEO DIALOG ── */}
      <Dialog open={!!editingVideo} onOpenChange={open => { if (!open) setEditingVideo(null); }}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-md rounded-2xl p-0" showCloseButton={false}>
          <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="text-sm font-semibold">Edit Video</DialogTitle>
            <button
              onClick={() => setEditingVideo(null)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <div className="relative px-4 py-3 space-y-2.5 max-h-[80vh] overflow-y-auto">
            {/* Overlay while AI is generating */}
            {generatingEditAI && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-b-2xl flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-700 px-4 py-2.5 rounded-xl shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating AI content...
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Video title"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                placeholder="Video description"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
              <input
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            {/* AI generate row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Topic hint"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                className="w-0 flex-1 min-w-0 h-8 rounded-xl border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <Select value={aiLanguage} onValueChange={v => setAiLanguage(v as 'english' | 'hindi')}>
                <SelectTrigger className="h-8 w-24 shrink-0 rounded-xl text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-8 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              onClick={generateAIForVideo}
              disabled={generatingEditAI}
            >
              {generatingEditAI
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Generating...</>
                : <><Zap className="h-3.5 w-3.5 mr-1.5" />AI Generate Title, Description & Tags</>
              }
            </Button>
            <div className="flex gap-2 pb-1">
              <Button variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={() => setEditingVideo(null)}>
                Cancel
              </Button>
              <Button className="flex-1 h-9 rounded-xl text-sm font-semibold" onClick={saveVideoEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── UPGRADE MODAL ── */}
      <AlertDialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="text-center items-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg">Upgrade to Pro</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-center">
              {upgradeReason || 'You have reached your plan limit. Upgrade to Pro for more uploads and features.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => { setShowUpgradeModal(false); router.push('/pricing'); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Pro — ₹199/month
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-xl h-10 mt-0">
              Maybe later
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── VIDEO PLAYER MODAL ── */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden bg-black shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
              <p className="text-white text-sm font-medium truncate pr-4">{playingVideo.title || playingVideo.originalName}</p>
              <button
                onClick={() => setPlayingVideo(null)}
                className="text-gray-400 hover:text-white shrink-0 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {playingVideo.fileName && !playingVideo.driveFileId ? (
              <video
                src={playingVideo.fileName}
                controls
                autoPlay
                className="w-full max-h-[60vh] bg-black"
              />
            ) : playingVideo.driveFileId ? (
              <iframe
                src={`https://drive.google.com/file/d/${playingVideo.driveFileId}/preview`}
                className="w-full aspect-video"
                allow="autoplay"
              />
            ) : null}
          </div>
        </div>
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
