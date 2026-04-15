'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Play,
  Pause,
  CheckCircle,
  Loader2,
  ChevronRight,
  Upload,
  FolderOpen,
  Library,
  Timer,
  CalendarClock,
  ListVideo,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import DriveVideoBrowser from '@/components/DriveVideoBrowser';
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
  daily: 'Roz',
  alternate: 'Har 2 din',
  every3days: 'Har 3 din',
  every5days: 'Har 5 din',
  everySunday: 'Har Sunday',
};

// ── Countdown Timer ────────────────────────────────────
function CountdownTimer({ channel }: { channel: Channel }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      if (!channel.isActive) { setTimeLeft(''); return; }
      const next = getNextUploadTime(channel);
      const diff = next.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Abhi upload hoga...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [channel]);

  if (!timeLeft) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Timer className="h-3.5 w-3.5" />
      <span>Next upload: <strong className="text-foreground">{timeLeft}</strong></span>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────
function Step({ n, done, active, label }: { n: number; done: boolean; active: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all ${active ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800' : done ? 'opacity-60' : 'opacity-40'}`}>
      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
        {done ? <CheckCircle className="h-4 w-4" /> : n}
      </div>
      <span className={`font-medium text-sm ${active ? 'text-blue-700 dark:text-blue-300' : ''}`}>{label}</span>
      {active && <ChevronRight className="h-4 w-4 ml-auto text-blue-500" />}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [activeTab, setActiveTab] = useState('queue');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── Load channel ──
  const loadChannel = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      const ch = data.channels?.[0] ?? null;
      setChannel(ch);
      if (ch) {
        setUploadTime(ch.uploadTime || '18:00');
        setFrequency(ch.frequency || 'daily');
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
  const queuedVideos = videos.filter(v => ['queued', 'scanning'].includes(v.status));
  const uploadedVideos = videos.filter(v => v.status === 'uploaded');
  const hasVideos = queuedVideos.length > 0;
  const isLive = hasChannel && hasVideos && channel.isActive;

  const currentStep = !hasChannel ? 1 : !hasVideos ? 2 : !channel.isActive ? 3 : 0;

  // ── Actions ──
  const connectYouTube = () => router.push('/connect-youtube');

  const toggleActive = async () => {
    if (!channel) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      if (res.ok) {
        setChannel(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
        toast.success(channel.isActive ? 'Automation band ho gayi' : 'Automation shuru ho gayi! 🚀');
      }
    } finally {
      setTogglingActive(false);
    }
  };

  const saveSchedule = async () => {
    if (!channel) return;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadTime, frequency }),
      });
      if (res.ok) {
        setChannel(prev => prev ? { ...prev, uploadTime, frequency } : prev);
        toast.success('Schedule save ho gaya');
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  const disconnectChannel = async () => {
    if (!channel) return;
    setDeletingChannel(true);
    try {
      await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' });
      setChannel(null);
      setVideos([]);
      toast.success('Channel disconnect ho gaya');
    } finally {
      setDeletingChannel(false);
      setDeleteConfirm(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!channel || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('channelId', channel.id);
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      const res = await fetch('/api/videos/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.uploaded?.length || files.length} video${files.length > 1 ? 's' : ''} add ho gaye`);
        loadVideos(channel.id);
        loadChannel();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
    setVideos(prev => prev.filter(v => v.id !== videoId));
    loadChannel();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* ── LIVE STATUS ── */}
      {isLive && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-green-700 dark:text-green-300">Automation Chal Rahi Hai</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
              onClick={toggleActive}
              disabled={togglingActive}
            >
              {togglingActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 mr-1" />}
              Band Karo
            </Button>
          </div>
          <CountdownTimer channel={channel!} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ListVideo className="h-3 w-3" />{queuedVideos.length} videos queue mein</span>
            <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{FREQ_LABELS[channel!.frequency]} {channel!.uploadTime}</span>
          </div>
        </div>
      )}

      {/* ── SETUP STEPS (shown when not live) ── */}
      {!isLive && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium px-1">SETUP</p>

          {/* Step 1 */}
          <div onClick={currentStep === 1 ? connectYouTube : undefined} className={currentStep === 1 ? 'cursor-pointer' : ''}>
            <Step n={1} done={hasChannel} active={currentStep === 1} label={hasChannel ? `✅ ${channel!.name}` : 'YouTube Channel Connect Karo'} />
          </div>

          {/* Step 2 */}
          {hasChannel && (
            <Step n={2} done={hasVideos} active={currentStep === 2} label={hasVideos ? `✅ ${queuedVideos.length} Videos Queue Mein` : 'Videos Add Karo'} />
          )}

          {/* Step 3 */}
          {hasChannel && hasVideos && (
            <Step n={3} done={false} active={currentStep === 3} label="Automation Shuru Karo" />
          )}
        </div>
      )}

      {/* ── STEP 1 ACTION ── */}
      {currentStep === 1 && (
        <Button onClick={connectYouTube} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold rounded-xl">
          YouTube Connect Karo
        </Button>
      )}

      {/* ── STEP 2: ADD VIDEOS ── */}
      {currentStep === 2 && hasChannel && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium px-1">VIDEOS ADD KARO</p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="h-12 rounded-xl justify-start gap-3 text-sm font-medium"
              onClick={() => setShowDrive(true)}
            >
              <FolderOpen className="h-5 w-5 text-blue-500" />
              Google Drive se Import
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl justify-start gap-3 text-sm font-medium"
              onClick={() => setShowLibrary(true)}
            >
              <Library className="h-5 w-5 text-purple-500" />
              Video Library se Add
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl justify-start gap-3 text-sm font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-green-500" />}
              Device se Upload
            </Button>
            <input ref={fileInputRef} type="file" multiple accept="video/*" className="hidden"
              onChange={e => e.target.files && handleFileUpload(e.target.files)} />
          </div>
        </div>
      )}

      {/* ── STEP 3: SCHEDULE + START ── */}
      {currentStep === 3 && hasChannel && hasVideos && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium px-1">SCHEDULE SET KARO</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Upload Time</p>
              <input
                type="time"
                value={uploadTime}
                onChange={e => setUploadTime(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Frequency</p>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Roz</SelectItem>
                  <SelectItem value="alternate">Har 2 din</SelectItem>
                  <SelectItem value="every3days">Har 3 din</SelectItem>
                  <SelectItem value="every5days">Har 5 din</SelectItem>
                  <SelectItem value="everySunday">Har Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl"
            onClick={async () => { await saveSchedule(); await toggleActive(); }}
            disabled={savingSchedule || togglingActive}
          >
            {(savingSchedule || togglingActive) ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
            Automation Shuru Karo 🚀
          </Button>
        </div>
      )}

      {/* ── CHANNEL CONNECTED — ADD MORE VIDEOS ── */}
      {isLive && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium px-1">VIDEOS ADD KARO</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-11 rounded-xl flex-col gap-1 text-xs font-medium" onClick={() => setShowDrive(true)}>
              <FolderOpen className="h-4 w-4 text-blue-500" />Drive
            </Button>
            <Button variant="outline" className="h-11 rounded-xl flex-col gap-1 text-xs font-medium" onClick={() => setShowLibrary(true)}>
              <Library className="h-4 w-4 text-purple-500" />Library
            </Button>
            <Button variant="outline" className="h-11 rounded-xl flex-col gap-1 text-xs font-medium" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-green-500" />}
              Upload
            </Button>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="video/*" className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)} />
        </div>
      )}

      {/* ── SCHEDULE EDIT (when live) ── */}
      {isLive && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium px-1">SCHEDULE</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={uploadTime}
              onChange={e => setUploadTime(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Roz</SelectItem>
                <SelectItem value="alternate">Har 2 din</SelectItem>
                <SelectItem value="every3days">Har 3 din</SelectItem>
                <SelectItem value="every5days">Har 5 din</SelectItem>
                <SelectItem value="everySunday">Har Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(uploadTime !== channel?.uploadTime || frequency !== channel?.frequency) && (
            <Button size="sm" onClick={saveSchedule} disabled={savingSchedule} className="w-full rounded-xl h-10">
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          )}
        </div>
      )}

      {/* ── QUEUE + HISTORY TABS ── */}
      {hasChannel && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-xl h-11">
            <TabsTrigger value="queue" className="flex-1 rounded-lg gap-1.5">
              <ListVideo className="h-4 w-4" />
              Queue {queuedVideos.length > 0 && <Badge className="h-5 px-1.5 text-xs">{queuedVideos.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-lg gap-1.5">
              <History className="h-4 w-4" />
              History {uploadedVideos.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{uploadedVideos.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Queue */}
          <TabsContent value="queue" className="mt-3 space-y-2">
            {loadingVideos ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : queuedVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ListVideo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Queue khaali hai — videos add karo upar se
              </div>
            ) : (
              queuedVideos.map((video, i) => (
                <div key={video.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                  <span className="text-xs text-muted-foreground w-5 text-center font-medium">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title || video.originalName}</p>
                    {i === 0 && channel?.isActive && (
                      <p className="text-xs text-green-600">← Next upload</p>
                    )}
                  </div>
                  {video.status === 'scanning' && <Badge className="bg-yellow-100 text-yellow-700 text-xs shrink-0">Scanning</Badge>}
                  <button onClick={() => deleteVideo(video.id)} className="text-muted-foreground hover:text-red-500 shrink-0 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-3 space-y-2">
            {loadingVideos ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : uploadedVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Abhi tak koi video upload nahi hui
              </div>
            ) : (
              uploadedVideos.slice(0, 50).map(video => (
                <div key={video.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title || video.originalName}</p>
                    {video.uploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  {video.uploadedVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${video.uploadedVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 shrink-0"
                    >
                      Watch
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
        <div className="pt-2 border-t border-border/50">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-xs text-muted-foreground hover:text-red-500 transition-colors w-full text-center py-2"
          >
            Channel disconnect karo
          </button>
        </div>
      )}

      {/* ── MODALS ── */}
      {showDrive && channel && (
        <DriveVideoBrowser
          channelId={channel.id}
          onClose={() => setShowDrive(false)}
          onVideosAdded={() => { setShowDrive(false); loadVideos(channel.id); loadChannel(); }}
        />
      )}
      {showLibrary && channel && (
        <VideoLibraryBrowser
          channelId={channel.id}
          onClose={() => setShowLibrary(false)}
          onVideosAdded={() => { setShowLibrary(false); loadVideos(channel.id); loadChannel(); }}
        />
      )}

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Channel disconnect karo?</AlertDialogTitle>
            <AlertDialogDescription>
              Automation band ho jayegi. Queue mein rakhe videos waise hi rahenge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disconnectChannel} disabled={deletingChannel} className="bg-red-600 hover:bg-red-700">
              {deletingChannel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
