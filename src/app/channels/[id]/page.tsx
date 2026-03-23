'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Youtube,
  ArrowLeft,
  Settings,
  Upload,
  Video,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Play,
  FileVideo,
  HardDrive,
  Sparkles,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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
  randomDelayMinutes?: number | null;
  platform?: string;
  stats?: {
    total: number;
    queued: number;
    uploaded: number;
    failed: number;
  };
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  originalName?: string | null;
  fileSize?: number | null;
  driveFileId?: string | null;
}

// Helper to format file size
const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return 'Unknown';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Helper to format date
const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Video Card Component
function VideoCard({ video, onDelete, isDeleting }: {
  video: Video;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const statusColors: Record<string, string> = {
    queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    uploaded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    uploading: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <Card className="group hover:shadow-lg transition-all border-0 bg-white dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center flex-shrink-0">
            <FileVideo className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{video.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[video.status] || ''}>
                {video.status}
              </Badge>
              {video.fileSize && (
                <span className="text-xs text-gray-500">{formatFileSize(video.fileSize)}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Added {formatDate(video.createdAt)}
            </p>
          </div>
          {video.status === 'queued' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{video.title}" from the queue. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Channel Detail Component
export default function ChannelDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const channelId = params.id as string;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    uploadTime: '10:00',
    frequency: 'daily',
    randomDelayEnabled: false,
    randomDelayMinutes: 30,
  });

  // Load channel data
  useEffect(() => {
    if (status === 'authenticated' && channelId) {
      loadChannel();
    }
  }, [status, channelId]);

  const loadChannel = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}`);
      const data = await res.json();
      if (data.channel) {
        setChannel(data.channel);
        setVideos(data.channel.videos || []);
        setSettings({
          uploadTime: data.channel.uploadTime || '10:00',
          frequency: data.channel.frequency || 'daily',
          randomDelayEnabled: !!data.channel.randomDelayMinutes,
          randomDelayMinutes: data.channel.randomDelayMinutes || 30,
        });
      }
    } catch (error) {
      toast.error('Failed to load channel');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadTime: settings.uploadTime,
          frequency: settings.frequency,
          randomDelayMinutes: settings.randomDelayEnabled ? settings.randomDelayMinutes : null,
        }),
      });
      toast.success('Settings saved');
      loadChannel();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      toast.success('Video deleted');
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (error) {
      toast.error('Failed to delete video');
    } finally {
      setDeletingVideoId(null);
    }
  };

  // Upload videos
  const uploadVideos = async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast.error('No files selected');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading(`Uploading ${uploadFiles.length} file(s)...`);

    try {
      // Get access token
      const tokenRes = await fetch(`/api/token?channelId=${channelId}`);
      const tokenData = await tokenRes.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get upload credentials');
      }

      const uploadedFiles: { blobUrl: string; fileId: string; originalName: string; fileSize: number; mimeType: string }[] = [];
      const errors: string[] = [];

      for (const file of Array.from(uploadFiles)) {
        try {
          // Create metadata
          const timestamp = Date.now();
          const cleanName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
          const fileName = `${timestamp}-${cleanName}`;

          // Resumable upload to Google Drive
          const initRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: fileName,
                mimeType: file.type || 'application/octet-stream',
              }),
            }
          );

          if (!initRes.ok) throw new Error('Failed to initialize upload');

          const uploadUrl = initRes.headers.get('Location');
          if (!uploadUrl) throw new Error('No upload URL received');

          // Upload file content
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          });

          if (!uploadRes.ok) throw new Error('Upload failed');

          const result = await uploadRes.json();

          // Make file public
          await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          });

          uploadedFiles.push({
            blobUrl: `https://drive.google.com/uc?export=download&id=${result.id}`,
            fileId: result.id,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
        } catch (error: any) {
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      // Create video records
      for (const file of uploadedFiles) {
        const ext = file.originalName.includes('.') ? '.' + file.originalName.split('.').pop() : '';
        await fetch('/api/videos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            blobUrl: file.blobUrl,
            fileId: file.fileId,
            originalName: file.originalName,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            title: file.originalName.replace(ext, ''),
          }),
        });
      }

      toast.dismiss(loadingToast);
      if (uploadedFiles.length > 0) {
        toast.success(`${uploadedFiles.length} video(s) uploaded`);
        setUploadFiles(null);
        loadChannel();
      }
      if (errors.length > 0) {
        toast.error('Some uploads failed');
        console.error(errors);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
      </div>
    );
  }

  if (!channel) {
    return null;
  }

  const queuedVideos = videos.filter(v => v.status === 'queued');
  const uploadedVideos = videos.filter(v => v.status === 'uploaded');
  const failedVideos = videos.filter(v => v.status === 'failed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Youtube className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{channel.name}</h1>
                <p className="text-sm text-gray-500">Channel ID: {channel.youtubeChannelId}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Switch
                checked={channel.isActive}
                onCheckedChange={async (checked) => {
                  await fetch(`/api/channels/${channelId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: checked }),
                  });
                  toast.success(checked ? 'Channel Activated' : 'Channel Paused');
                  loadChannel();
                }}
              />
              <Badge variant={channel.isActive ? 'default' : 'secondary'} className={channel.isActive ? 'bg-green-500' : ''}>
                {channel.isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Videos</p>
                  <p className="text-2xl font-bold">{channel.stats?.total || videos.length}</p>
                </div>
                <Video className="h-8 w-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Queue</p>
                  <p className="text-2xl font-bold text-blue-600">{channel.stats?.queued || queuedVideos.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Uploaded</p>
                  <p className="text-2xl font-bold text-green-600">{channel.stats?.uploaded || uploadedVideos.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{channel.stats?.failed || failedVideos.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="queue" className="rounded-lg">
              <Video className="h-4 w-4 mr-2" />
              Queue ({queuedVideos.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Upload Videos</CardTitle>
                <CardDescription>
                  Add new videos to your upload queue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Select Video Files</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    MP4, MOV, AVI, MKV supported. Max 10GB per file.
                  </p>
                  <Input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="max-w-md mx-auto"
                  />
                </div>

                {uploadFiles && uploadFiles.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Selected Files ({uploadFiles.length})</h4>
                    <div className="space-y-2">
                      {Array.from(uploadFiles).map((file, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <FileVideo className="h-5 w-5 text-gray-400" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                    <Button 
                      onClick={uploadVideos} 
                      disabled={uploading}
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload {uploadFiles.length} Video(s)
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Import from Google Drive
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Import videos directly from your Google Drive without downloading.
                  </p>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Drive Browser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Video Queue</CardTitle>
                <CardDescription>
                  Videos waiting to be uploaded ({queuedVideos.length})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queuedVideos.length === 0 ? (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No videos in queue</p>
                    <Button variant="outline" className="mt-4" onClick={() => {}}>
                      Upload Videos
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {queuedVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onDelete={() => deleteVideo(video.id)}
                        isDeleting={deletingVideoId === video.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-green-600">Uploaded</CardTitle>
                  <CardDescription>
                    Successfully uploaded videos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {uploadedVideos.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No uploaded videos yet</p>
                  ) : (
                    <div className="space-y-3">
                      {uploadedVideos.slice(0, 10).map((video) => (
                        <div key={video.id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                            <p className="text-xs text-gray-500">{formatDate(video.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-red-600">Failed</CardTitle>
                  <CardDescription>
                    Videos that failed to upload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {failedVideos.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No failed uploads</p>
                  ) : (
                    <div className="space-y-3">
                      {failedVideos.slice(0, 10).map((video) => (
                        <div key={video.id} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                            <p className="text-xs text-gray-500">{formatDate(video.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Upload Schedule</CardTitle>
                <CardDescription>
                  Configure when videos should be uploaded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="uploadTime">Upload Time</Label>
                    <Input
                      id="uploadTime"
                      type="time"
                      value={settings.uploadTime}
                      onChange={(e) => setSettings({ ...settings, uploadTime: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Videos will upload around this time
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Upload Frequency</Label>
                    <Select
                      value={settings.frequency}
                      onValueChange={(value) => setSettings({ ...settings, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="every6h">Every 6 Hours</SelectItem>
                        <SelectItem value="every12h">Every 12 Hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="alternate">Every Other Day</SelectItem>
                        <SelectItem value="every3days">Every 3 Days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      How often to upload videos
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Random Delay</Label>
                      <p className="text-sm text-gray-500">
                        Add randomness to appear more natural
                      </p>
                    </div>
                    <Switch
                      checked={settings.randomDelayEnabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, randomDelayEnabled: checked })}
                    />
                  </div>

                  {settings.randomDelayEnabled && (
                    <div className="mt-4 space-y-2">
                      <Label>Maximum Delay (minutes)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={180}
                        value={settings.randomDelayMinutes}
                        onChange={(e) => setSettings({ ...settings, randomDelayMinutes: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  )}
                </div>

                <Button 
                  onClick={saveSettings} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}