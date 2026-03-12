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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { upload } from '@vercel/blob/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Eye,
  FileVideo,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';
//coorect
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

// Main Component
export default function YouTubeAutomationDashboard() {
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
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  // Channel settings state
  const [editSettings, setEditSettings] = useState({
    uploadTime: '',
    frequency: '',
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
        setEditSettings({
          uploadTime: data.channel.uploadTime,
          frequency: data.channel.frequency,
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

  // Initialize
  useEffect(() => {
    loadChannels();
    loadSchedulerLogs();
  }, [loadChannels]);

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

    try {
      await api.channels.update(selectedChannel.id, editSettings);
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

  // Upload videos using Vercel Blob direct upload
  const uploadVideos = async () => {
    if (!selectedChannel || !uploadFiles || uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress({});
    const uploadedVideos: { 
      blobUrl: string; 
      originalName: string; 
      fileSize: number; 
      mimeType: string;
      thumbnailUrl?: string;
      thumbnailOriginalName?: string;
      thumbnailSize?: number;
    }[] = [];
    const errors: string[] = [];

    try {
      // First, upload all thumbnails to Blob
      const thumbnailUrls: { url: string; name: string; size: number }[] = [];
      if (thumbnailFiles && thumbnailFiles.length > 0) {
        for (let i = 0; i < thumbnailFiles.length; i++) {
          const thumbFile = thumbnailFiles[i];
          const thumbPath = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${thumbFile.name}`;
          
          try {
            const thumbBlob = await upload(thumbPath, thumbFile, {
              access: 'public',
              handleUploadUrl: '/api/blob/upload-url',
            });
            thumbnailUrls.push({ url: thumbBlob.url, name: thumbFile.name, size: thumbFile.size });
          } catch (error: any) {
            console.error(`Failed to upload thumbnail ${thumbFile.name}:`, error);
          }
        }
      }

      // Upload each video file directly to Vercel Blob
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const filePath = `videos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;
        
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          
          // Direct upload to Vercel Blob from client
          const blob = await upload(filePath, file, {
            access: 'public',
            handleUploadUrl: '/api/blob/upload-url',
            onUploadProgress: (progress) => {
              const percentage = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(prev => ({ ...prev, [file.name]: percentage }));
            },
          });
          
          // Get thumbnail for this video (one-to-one or one-for-all)
          let thumbnailData: { url?: string; name?: string; size?: number } = {};
          if (thumbnailUrls.length > 0) {
            if (thumbnailUrls.length === 1) {
              // One thumbnail for all videos
              thumbnailData = thumbnailUrls[0];
            } else if (i < thumbnailUrls.length) {
              // One thumbnail per video (same order)
              thumbnailData = thumbnailUrls[i];
            }
          }
          
          uploadedVideos.push({
            blobUrl: blob.url,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            thumbnailUrl: thumbnailData.url,
            thumbnailOriginalName: thumbnailData.name,
            thumbnailSize: thumbnailData.size,
          });
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error: any) {
          console.error(`Failed to upload ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message || 'Upload failed'}`);
        }
      }

      // Now create video records in the database
      for (const video of uploadedVideos) {
        const fileExtension = video.originalName.includes('.') 
          ? '.' + video.originalName.split('.').pop() 
          : '';
        const title = defaultTitle 
          ? `${defaultTitle} ${uploadedVideos.length > 1 ? `(${uploadedVideos.indexOf(video) + 1})` : ''}`
          : video.originalName.replace(fileExtension, '');
        
        const res = await fetch('/api/videos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            blobUrl: video.blobUrl,
            originalName: video.originalName,
            fileSize: video.fileSize,
            mimeType: video.mimeType,
            title,
            description: defaultDescription,
            tags: defaultTags,
            thumbnailUrl: video.thumbnailUrl,
            thumbnailOriginalName: video.thumbnailOriginalName,
            thumbnailSize: video.thumbnailSize,
          }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          errors.push(`${video.originalName}: ${error.error || 'Failed to create record'}`);
        }
      }

      if (uploadedVideos.length > 0) {
        toast.success(`${uploadedVideos.length} video(s) uploaded successfully`);
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
      }
      
      if (errors.length > 0) {
        toast.error(`Some uploads failed: ${errors.join(', ')}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload videos');
    } finally {
      setUploading(false);
      setUploadProgress({});
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
        toast.success('Scheduler executed');
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={runScheduler} disabled={runningScheduler}>
            {runningScheduler ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Scheduler
          </Button>
          <Button onClick={connectChannel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </Button>
        </div>
      </div>

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
                        {channel.uploadTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {channel.frequency}
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="uploadTime">Upload Time</Label>
                    <Input
                      id="uploadTime"
                      type="time"
                      value={editSettings.uploadTime}
                      onChange={(e) => setEditSettings({ ...editSettings, uploadTime: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Videos will be uploaded at this time (24-hour format)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Upload Frequency</Label>
                    <Select
                      value={editSettings.frequency}
                      onValueChange={(value) => setEditSettings({ ...editSettings, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="alternate">Every Other Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How often to upload videos
                    </p>
                  </div>
                </div>

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
                      {selectedChannel.nextUploadTime 
                        ? formatNextUpload(new Date(selectedChannel.nextUploadTime))
                        : 'Calculating...'}
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
                    onChange={(e) => setUploadFiles(e.target.files)}
                  />
                  {uploadFiles && (
                    <p className="text-sm text-muted-foreground">
                      {uploadFiles.length} file(s) selected: {Array.from(uploadFiles).map(f => f.name).join(', ')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail-upload">Thumbnail Files (Optional)</Label>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setThumbnailFiles(e.target.files)}
                  />
                  {thumbnailFiles && thumbnailFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {thumbnailFiles.length} thumbnail(s) selected: {Array.from(thumbnailFiles).map(f => f.name).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload one thumbnail per video (same order), or one thumbnail for all videos
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

                {/* Upload Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-3">
                    <Label>Upload Progress</Label>
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{fileName}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

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
                    <p>No upload history yet</p>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {view === 'dashboard' ? renderDashboard() : renderChannelDetail()}
      </div>
    </div>
  );
}