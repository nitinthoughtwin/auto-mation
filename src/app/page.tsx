'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Youtube,
  Plus,
  Settings,
  Trash2,
  Upload,
  Play,
  Pause,
  Clock,
  Video,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileVideo,
  Loader2,
  Info,
  LogIn,
  LogOut,
  Lock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate } from '@/lib/utils-shared';

// Frequency options with labels
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Upload one video every day' },
  { value: 'alternate', label: 'Every 2nd Day', description: 'Upload one video every 2 days' },
  { value: 'every3days', label: 'Every 3rd Day', description: 'Upload one video every 3 days' },
  { value: 'every5days', label: 'Every 5th Day', description: 'Upload one video every 5 days' },
  { value: 'everySunday', label: 'Every Sunday', description: 'Upload one video every Sunday' },
] as const;

type FrequencyType = typeof FREQUENCY_OPTIONS[number]['value'];

// Types
interface Channel {
  id: string;
  name: string;
  youtubeChannelId: string;
  uploadTime: string;
  frequency: string;
  isActive: boolean;
  lastUploadDate: string | null;
  createdAt: string;
  nextUploadTime?: string;
  totalVideos?: number;
  queuedVideos?: number;
  stats?: {
    total: number;
    queued: number;
    uploaded: number;
    failed: number;
  };
  videos?: Video[];
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  tags: string;
  fileName: string;
  originalName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  thumbnailName?: string | null;
  thumbnailOriginalName?: string | null;
  thumbnailSize?: number | null;
  status: string;
  uploadedAt: string | null;
  error: string | null;
  createdAt: string;
}

interface SchedulerLog {
  id: string;
  channelId: string;
  videoId: string | null;
  action: string;
  status: string;
  message: string | null;
  createdAt: string;
}

// API Functions
const api = {
  channels: {
    list: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/channels/${id}`);
      return res.json();
    },
    update: async (id: string, data: Partial<Channel>) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },
  videos: {
    list: async (channelId: string) => {
      const res = await fetch(`/api/videos?channelId=${channelId}`);
      return res.json();
    },
    upload: async (formData: FormData) => {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },
  scheduler: {
    run: async () => {
      const res = await fetch('/api/scheduler', { method: 'POST' });
      return res.json();
    },
    logs: async () => {
      const res = await fetch('/api/scheduler');
      return res.json();
    },
  },
};

// Time utilities
function parseTimeTo12Hour(time24: string): { hours: number; minutes: number; period: 'AM' | 'PM' } {
  let [h, m] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { hours: h, minutes: m, period };
}

function convertTo24Hour(hours: number, minutes: number, period: 'AM' | 'PM'): string {
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatTimeDisplay(time24: string): string {
  const { hours, minutes, period } = parseTimeTo12Hour(time24);
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatNextUpload(nextDate: Date | string | undefined): string {
  if (!nextDate) return 'Calculating...';
  const date = new Date(nextDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return 'Pending...';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  const timeStr = formatTimeDisplay(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
  
  if (days > 0) {
    return `In ${days} day${days > 1 ? 's' : ''} at ${timeStr}`;
  }
  if (hours > 0) {
    return `In ${hours}h ${minutes}m at ${timeStr}`;
  }
  return `In ${minutes} minutes at ${timeStr}`;
}

function getFrequencyLabel(frequency: string): string {
  const option = FREQUENCY_OPTIONS.find(o => o.value === frequency);
  return option?.label || frequency;
}

// User type
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

// Main Component
export default function YouTubeAutomationDashboard() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ email: '', password: '', name: '' });
  const [setupLoading, setSetupLoading] = useState(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [schedulerLogs, setSchedulerLogs] = useState<SchedulerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [view, setView] = useState<'dashboard' | 'channel'>('dashboard');

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [thumbnailFiles, setThumbnailFiles] = useState<FileList | null>(null);
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultTags, setDefaultTags] = useState('');

  // Channel settings state with AM/PM
  const [editSettings, setEditSettings] = useState({
    uploadTimeHours: 6,
    uploadTimeMinutes: 0,
    uploadTimePeriod: 'PM' as 'AM' | 'PM',
    frequency: 'daily' as FrequencyType,
  });

  // Load channels
  const loadChannels = useCallback(async () => {
    try {
      const data = await api.channels.list();
      setChannels(data.channels || []);
    } catch (error) {
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load channel details
  const loadChannelDetails = async (channelId: string) => {
    try {
      const data = await api.channels.get(channelId);
      if (data.channel) {
        setSelectedChannel(data.channel);
        setVideos(data.channel.videos || []);
        
        // Parse time for editing
        const time24 = data.channel.uploadTime || '18:00';
        const { hours, minutes, period } = parseTimeTo12Hour(time24);
        setEditSettings({
          uploadTimeHours: hours,
          uploadTimeMinutes: minutes,
          uploadTimePeriod: period,
          frequency: (data.channel.frequency || 'daily') as FrequencyType,
        });
      }
    } catch (error) {
      toast.error('Failed to load channel details');
    }
  };

  // Load scheduler logs
  const loadSchedulerLogs = async () => {
    try {
      const data = await api.scheduler.logs();
      setSchedulerLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load scheduler logs');
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
      } else {
        // Check if setup is needed
        const setupRes = await fetch('/api/auth/setup');
        const setupData = await setupRes.json();
        setNeedsSetup(setupData.needsSetup);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setLoginForm({ email: '', password: '' });
        toast.success('Login successful!');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupForm),
      });
      const data = await res.json();
      if (data.success) {
        setNeedsSetup(false);
        toast.success('Account created! Please login now.');
        setSetupForm({ email: '', password: '', name: '' });
      } else {
        toast.error(data.error || 'Setup failed');
      }
    } catch (error) {
      toast.error('Setup failed');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChannels([]);
      setVideos([]);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  // Initialize
  useEffect(() => {
    if (isAuthenticated) {
      loadChannels();
      loadSchedulerLogs();
    }
  }, [loadChannels, isAuthenticated]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected) {
      toast.success('Channel connected successfully!');
      loadChannels();
      window.history.replaceState({}, '', '/');
    }

    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, '', '/');
    }
  }, [loadChannels]);

  // Connect new channel
  const connectChannel = () => {
    window.location.href = '/api/auth/youtube';
  };

  // Update channel settings
  const updateChannelSettings = async () => {
    if (!selectedChannel) return;

    // Convert 12-hour to 24-hour format
    const uploadTime24 = convertTo24Hour(
      editSettings.uploadTimeHours,
      editSettings.uploadTimeMinutes,
      editSettings.uploadTimePeriod
    );

    try {
      await api.channels.update(selectedChannel.id, {
        uploadTime: uploadTime24,
        frequency: editSettings.frequency,
      });
      toast.success('Settings updated successfully');
      loadChannelDetails(selectedChannel.id);
      loadChannels();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  // Toggle channel active status
  const toggleChannelActive = async (channel: Channel) => {
    try {
      await api.channels.update(channel.id, { isActive: !channel.isActive });
      toast.success(channel.isActive ? 'Channel paused' : 'Channel activated');
      loadChannels();
      if (selectedChannel?.id === channel.id) {
        loadChannelDetails(channel.id);
      }
    } catch (error) {
      toast.error('Failed to update channel status');
    }
  };

  // Delete channel
  const deleteChannel = async (channelId: string) => {
    try {
      await api.channels.delete(channelId);
      toast.success('Channel disconnected');
      setChannels(channels.filter(c => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setView('dashboard');
      }
    } catch (error) {
      toast.error('Failed to disconnect channel');
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFiles(e.target.files);
  };

  // Upload videos
  const uploadVideos = async () => {
    if (!selectedChannel || !uploadFiles || uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('channelId', selectedChannel.id);
    formData.append('defaultTitle', defaultTitle);
    formData.append('defaultDescription', defaultDescription);
    formData.append('defaultTags', defaultTags);

    for (let i = 0; i < uploadFiles.length; i++) {
      formData.append('files', uploadFiles[i]);
    }

    // Add thumbnail files
    if (thumbnailFiles) {
      for (let i = 0; i < thumbnailFiles.length; i++) {
        formData.append('thumbnails', thumbnailFiles[i]);
      }
    }

    try {
      const result = await api.videos.upload(formData);
      if (result.success) {
        toast.success(result.message);
        setUploadFiles(null);
        setThumbnailFiles(null);
        setDefaultTitle('');
        setDefaultDescription('');
        setDefaultTags('');
        loadChannelDetails(selectedChannel.id);
        loadChannels();
        // Reset file inputs
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const thumbInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if (thumbInput) thumbInput.value = '';
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload videos');
    } finally {
      setUploading(false);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    try {
      await api.videos.delete(videoId);
      toast.success('Video deleted from queue');
      setVideos(videos.filter(v => v.id !== videoId));
      loadChannels();
    } catch (error) {
      toast.error('Failed to delete video');
    }
  };

  // Run scheduler manually
  const runScheduler = async () => {
    setRunningScheduler(true);
    try {
      const result = await api.scheduler.run();
      if (result.success) {
        // Show detailed results
        if (result.results && result.results.length > 0) {
          result.results.forEach((r: { channel: string; status: string; message: string }) => {
            if (r.status === 'success') {
              toast.success(`${r.channel}: ${r.message}`);
            } else if (r.status === 'skipped') {
              toast.info(`${r.channel}: ${r.message}`);
            } else {
              toast.error(`${r.channel}: ${r.message}`);
            }
          });
        } else {
          toast.info('No channels to process');
        }
        loadSchedulerLogs();
        loadChannels();
        if (selectedChannel) {
          loadChannelDetails(selectedChannel.id);
        }
      } else {
        toast.error(result.error || 'Scheduler failed');
      }
    } catch (error) {
      toast.error('Failed to run scheduler');
    } finally {
      setRunningScheduler(false);
    }
  };

  // Navigate to channel detail
  const openChannelDetail = (channel: Channel) => {
    setSelectedChannel(channel);
    setView('channel');
    loadChannelDetails(channel.id);
  };

  // Navigate back to dashboard
  const goBack = () => {
    setView('dashboard');
    setSelectedChannel(null);
    setVideos([]);
  };

  // Render Login Form
  const renderLoginForm = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Youtube className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">YouTube Automation</CardTitle>
          <CardDescription>
            {needsSetup ? 'Create your admin account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsSetup ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-name">Name</Label>
                <Input
                  id="setup-name"
                  type="text"
                  placeholder="Admin"
                  value={setupForm.name}
                  onChange={(e) => setSetupForm({ ...setupForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-email">Email</Label>
                <Input
                  id="setup-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={setupForm.email}
                  onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <Input
                  id="setup-password"
                  type="password"
                  placeholder="••••••••"
                  value={setupForm.password}
                  onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={setupLoading}>
                {setupLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                Create Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">YouTube Automation Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your channels and schedule video uploads
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {currentUser && (
            <div className="flex items-center gap-2 mr-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{currentUser.name || currentUser.email}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <Button onClick={connectChannel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </Button>
        </div>
      </div>

      {/* Scheduler Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Automatic Upload Schedule
          </CardTitle>
          <CardDescription>
            Videos are uploaded automatically at their scheduled time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Videos upload at the scheduled time (within 5 min window)</li>
                <li>• Daily: One video per day</li>
                <li>• Every 2nd Day: One video every alternate day</li>
                <li>• Every 3rd/5th Day: Respective intervals</li>
                <li>• Every Sunday: Weekly uploads on Sunday</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Setup Cron Job (Recommended):</p>
              <code className="block text-xs bg-muted p-2 rounded">
                */5 * * * * curl http://localhost:3000/api/cron
              </code>
              <p className="text-xs text-muted-foreground">
                Or use services like cron-job.org, Vercel Cron, or GitHub Actions
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runScheduler} disabled={runningScheduler}>
              {runningScheduler ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test Scheduler Now
            </Button>
            <span className="text-xs text-muted-foreground">
              (Only uploads if current time matches scheduled time)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Channels</CardTitle>
            <Youtube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channels.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {channels.filter(c => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos in Queue</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {channels.reduce((sum, c) => sum + (c.queuedVideos || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused Channels</CardTitle>
            <Pause className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {channels.filter(c => !c.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Channels</CardTitle>
          <CardDescription>
            Manage your YouTube channels and their upload schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No channels connected yet</p>
              <Button className="mt-4" onClick={connectChannel}>
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First Channel
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Upload Time</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Queued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        {channel.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeDisplay(channel.uploadTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {getFrequencyLabel(channel.frequency)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.queuedVideos && channel.queuedVideos > 0 ? 'default' : 'secondary'}>
                        {channel.queuedVideos || 0} videos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={channel.isActive}
                          onCheckedChange={() => toggleChannelActive(channel)}
                        />
                        <span className={channel.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                          {channel.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChannelDetail(channel)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {channel.name} and all its queued videos. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteChannel(channel.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest scheduler actions and uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedulerLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No activity yet. Run the scheduler to see logs.
            </p>
          ) : (
            <div className="space-y-2">
              {schedulerLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{log.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render Channel Detail View
  const renderChannelDetail = () => {
    if (!selectedChannel) return null;

    const queuedVideos = videos.filter(v => v.status === 'queued');
    const uploadedVideos = videos.filter(v => v.status === 'uploaded');
    const failedVideos = videos.filter(v => v.status === 'failed');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Youtube className="h-6 w-6 text-red-500" />
              <h1 className="text-2xl font-bold">{selectedChannel.name}</h1>
            </div>
            <p className="text-muted-foreground">
              Channel ID: {selectedChannel.youtubeChannelId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={selectedChannel.isActive}
              onCheckedChange={() => toggleChannelActive(selectedChannel)}
            />
            <span className={selectedChannel.isActive ? 'text-green-600' : 'text-muted-foreground'}>
              {selectedChannel.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedChannel.stats?.total || videos.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {selectedChannel.stats?.queued || queuedVideos.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uploaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {selectedChannel.stats?.uploaded || uploadedVideos.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {selectedChannel.stats?.failed || failedVideos.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Videos
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Video className="h-4 w-4 mr-2" />
              Queue ({queuedVideos.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Upload Schedule</CardTitle>
                <CardDescription>
                  Configure when videos should be automatically uploaded to this channel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Time Picker */}
                  <div className="space-y-3">
                    <Label>Upload Time (12-hour format)</Label>
                    <div className="flex items-center gap-2">
                      {/* Hours */}
                      <Select
                        value={editSettings.uploadTimeHours.toString()}
                        onValueChange={(val) => setEditSettings({
                          ...editSettings,
                          uploadTimeHours: parseInt(val)
                        })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <SelectItem key={h} value={h.toString()}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-bold">:</span>
                      {/* Minutes */}
                      <Select
                        value={editSettings.uploadTimeMinutes.toString().padStart(2, '0')}
                        onValueChange={(val) => setEditSettings({
                          ...editSettings,
                          uploadTimeMinutes: parseInt(val)
                        })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                            <SelectItem key={m} value={m.toString().padStart(2, '0')}>
                              {m.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* AM/PM */}
                      <Select
                        value={editSettings.uploadTimePeriod}
                        onValueChange={(val: 'AM' | 'PM') => setEditSettings({
                          ...editSettings,
                          uploadTimePeriod: val
                        })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected time: {editSettings.uploadTimeHours}:{editSettings.uploadTimeMinutes.toString().padStart(2, '0')} {editSettings.uploadTimePeriod}
                    </p>
                  </div>

                  {/* Frequency */}
                  <div className="space-y-3">
                    <Label>Upload Frequency</Label>
                    <Select
                      value={editSettings.frequency}
                      onValueChange={(val) => setEditSettings({ ...editSettings, frequency: val as FrequencyType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_OPTIONS.find(o => o.value === editSettings.frequency)?.description}
                    </p>
                  </div>
                </div>

                {/* Current Settings Display */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Last Upload</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedChannel.lastUploadDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Next Scheduled Upload</p>
                    <p className="text-sm text-muted-foreground">
                      {formatNextUpload(selectedChannel.nextUploadTime)}
                    </p>
                  </div>
                </div>

                <Button onClick={updateChannelSettings}>
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Upload Videos</CardTitle>
                <CardDescription>
                  Upload multiple videos to the queue. They will be published according to your schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Video Files</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileChange}
                  />
                  {uploadFiles && (
                    <p className="text-sm text-muted-foreground">
                      {uploadFiles.length} file(s) selected: {Array.from(uploadFiles).map(f => f.name).join(', ')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail-upload">Thumbnails (Optional)</Label>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setThumbnailFiles(e.target.files)}
                  />
                  {thumbnailFiles && (
                    <p className="text-sm text-muted-foreground">
                      {thumbnailFiles.length} thumbnail(s) selected: {Array.from(thumbnailFiles).map(f => f.name).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1280x720 pixels, JPG or PNG. You can upload one thumbnail per video or share one thumbnail for all.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTitle">Default Title (Optional)</Label>
                    <Input
                      id="defaultTitle"
                      placeholder="My Video"
                      value={defaultTitle}
                      onChange={(e) => setDefaultTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use the filename
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTags">Tags (Optional)</Label>
                    <Input
                      id="defaultTags"
                      placeholder="tag1, tag2, tag3"
                      value={defaultTags}
                      onChange={(e) => setDefaultTags(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultDescription">Default Description (Optional)</Label>
                  <Textarea
                    id="defaultDescription"
                    placeholder="Video description..."
                    value={defaultDescription}
                    onChange={(e) => setDefaultDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={uploadVideos}
                  disabled={!uploadFiles || uploadFiles.length === 0 || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to Queue
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card>
              <CardHeader>
                <CardTitle>Video Queue</CardTitle>
                <CardDescription>
                  Videos waiting to be uploaded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queuedVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No videos in queue</p>
                    <p className="text-sm">Upload videos to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Thumbnail</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queuedVideos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">
                            {video.title}
                          </TableCell>
                          <TableCell>
                            {video.thumbnailName ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatFileSize(video.fileSize)}</TableCell>
                          <TableCell>{formatDate(video.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteVideo(video.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>
                  Previously uploaded and failed videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedVideos.length === 0 && failedVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upload history yet:</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...uploadedVideos, ...failedVideos].map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">
                            {video.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={video.status === 'uploaded' ? 'default' : 'destructive'}
                            >
                              {video.status === 'uploaded' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {video.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(video.uploadedAt || video.createdAt)}
                          </TableCell>
                          <TableCell className="text-red-500">
                            {video.error || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return renderLoginForm();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {view === 'dashboard' ? renderDashboard() : renderChannelDetail()}
      </div>
    </div>
  );
}