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
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  Youtube,
  Plus,
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
  X,
  ExternalLink,
  Facebook,
  Instagram,
  HardDrive,
  Link,
  Sparkles,
  Wand2,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';
import DriveVideoBrowser from '@/components/DriveVideoBrowser';
import PublicDriveBrowser from '@/components/PublicDriveBrowser';
import VideoLibraryBrowser from '@/components/VideoLibraryBrowser';
import UsageDashboard from '@/components/UsageDashboard';

// ============================================
// HELPER FUNCTIONS
// ============================================
const getThumbnailUrl = (fileIdOrUrl: string | null): string | null => {
  if (!fileIdOrUrl) return null;
  let fileId: string | null = null;
  if (fileIdOrUrl.startsWith('http')) {
    const match1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
    if (match1) fileId = match1[1];
    if (!fileId) {
      const match2 = fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
      if (match2) fileId = match2[1];
    }
    if (!fileId) {
      const match3 = fileIdOrUrl.match(/\/d\/([^/?=]+)/);
      if (match3) fileId = match3[1];
    }
  } else {
    fileId = fileIdOrUrl;
  }
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}=w200-h120-c`;
};

const getVideoUrl = (fileIdOrUrl: string | null): string | null => {
  if (!fileIdOrUrl) return null;
  let fileId: string | null = null;
  if (fileIdOrUrl.startsWith('http')) {
    const match1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
    if (match1) fileId = match1[1];
    if (!fileId) {
      const match2 = fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
      if (match2) fileId = match2[1];
    }
  } else {
    fileId = fileIdOrUrl;
  }
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

const getDriveLink = (fileIdOrUrl: string | null): string | null => {
  if (!fileIdOrUrl) return null;
  let fileId: string | null = null;
  if (fileIdOrUrl.startsWith('http')) {
    const match1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
    if (match1) fileId = match1[1];
    if (!fileId) {
      const match2 = fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
      if (match2) fileId = match2[1];
    }
  } else {
    fileId = fileIdOrUrl;
  }
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
};

// ============================================
// TYPES
// ============================================
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
  randomDelayDate?: string | null;
  platform?: string;
  instagramAccountId?: string;
  facebookPageId?: string;
  facebookPageName?: string;
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
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  thumbnailName: string | null;
  thumbnailOriginalName: string | null;
  thumbnailSize: number | null;
  thumbnailDriveId?: string | null;
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

// ============================================
// API FUNCTIONS
// ============================================
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

// ============================================
// MAIN COMPONENT
// ============================================
export default function YouTubeAutomationDashboard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [schedulerLogs, setSchedulerLogs] = useState<SchedulerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [view, setView] = useState<'dashboard' | 'channel'>('dashboard');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [thumbnailFiles, setThumbnailFiles] = useState<FileList | null>(null);
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultTags, setDefaultTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Video edit state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editVideoData, setEditVideoData] = useState({
    title: '',
    description: '',
    tags: '',
  });
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Channel settings state
  const [editSettings, setEditSettings] = useState({
    uploadTime: '',
    frequency: '',
    randomDelayEnabled: false,
    randomDelayMinutes: 30,
  });

  // Browser states
  const [showDriveBrowser, setShowDriveBrowser] = useState(false);
  const [showPublicDriveBrowser, setShowPublicDriveBrowser] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);

  // AI Generation state
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'english' | 'hindi'>('english');
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<Channel | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<Video | null>(null);

  // ============================================
  // CALLBACKS & EFFECTS
  // ============================================
  const loadChannels = useCallback(async () => {
    try {
      const data = await api.channels.list();
      setChannels(data.channels || []);
    } catch (error) {
      toast.error('Failed to Load Channels', {
        description: 'Could not fetch your channels. Please refresh the page.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChannelDetails = async (channelId: string) => {
    setLoadingChannel(true);
    try {
      const data = await api.channels.get(channelId);
      if (data.channel) {
        setSelectedChannel(data.channel);
        setVideos(data.channel.videos || []);
        setEditSettings({
          uploadTime: data.channel.uploadTime,
          frequency: data.channel.frequency,
          randomDelayEnabled: data.channel.randomDelayMinutes ? true : false,
          randomDelayMinutes: data.channel.randomDelayMinutes || 30,
        });
      }
    } catch (error) {
      toast.error('Failed to Load Channel Details', {
        description: 'Could not fetch channel information. Please try again.',
      });
    } finally {
      setLoadingChannel(false);
    }
  };

  const loadSchedulerLogs = async () => {
    try {
      const data = await api.scheduler.logs();
      setSchedulerLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load scheduler logs');
    }
  };

  useEffect(() => {
    loadChannels();
    loadSchedulerLogs();
  }, [loadChannels]);

  useEffect(() => {
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) return;
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
      window.fbAsyncInit = function () {
        window.FB?.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
      };
    };
    loadFacebookSDK();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast.success('Channel Connected!', {
        description: 'Your YouTube channel has been successfully connected.',
      });
      loadChannels();
      window.history.replaceState({}, '', '/dashboard');
    }
    if (error) {
      toast.error('Connection Failed', {
        description: `Could not connect your channel: ${error}.`,
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [loadChannels]);

  // ============================================
  // HANDLERS
  // ============================================
  const connectChannel = () => {
    window.location.href = '/connect-youtube';
  };

  const connectFacebook = () => {
    if (!window.FB) {
      toast.error('Facebook SDK Not Loaded', { description: 'Please refresh the page.' });
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          window.FB?.api(
            '/me/accounts',
            'GET',
            { fields: 'id,name,access_token' },
            (pagesResponse) => {
              if (pagesResponse.data && pagesResponse.data.length > 0) {
                toast.success('Facebook Connected!', {
                  description: `Found ${pagesResponse.data.length} page(s).`,
                });
              } else {
                toast.error('No Facebook Pages Found');
              }
            }
          );
        } else {
          toast.error('Facebook Connection Cancelled');
        }
      },
      { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts' }
    );
  };

  const connectInstagram = () => {
    if (!window.FB) {
      toast.error('Facebook SDK Not Loaded', { description: 'Please refresh the page.' });
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          window.FB?.api(
            '/me/accounts',
            'GET',
            { fields: 'id,name,access_token,instagram_business_account' },
            (pagesResponse) => {
              if (pagesResponse.data) {
                const igAccounts = pagesResponse.data.filter(
                  (page: any) => page.instagram_business_account
                );
                if (igAccounts.length > 0) {
                  toast.success('Instagram Connected!', {
                    description: `Found ${igAccounts.length} Instagram account(s).`,
                  });
                } else {
                  toast.error('No Instagram Accounts Found');
                }
              }
            }
          );
        } else {
          toast.error('Instagram Connection Cancelled');
        }
      },
      {
        scope:
          'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
      }
    );
  };

  const updateChannelSettings = async () => {
    if (!selectedChannel) return;
    setSavingSettings(true);
    try {
      await api.channels.update(selectedChannel.id, {
        uploadTime: editSettings.uploadTime,
        frequency: editSettings.frequency,
        randomDelayMinutes: editSettings.randomDelayEnabled ? editSettings.randomDelayMinutes : null,
      });
      toast.success('Settings Saved', {
        description: `Upload schedule updated: ${editSettings.frequency} at ${editSettings.uploadTime}`,
      });
      loadChannelDetails(selectedChannel.id);
      loadChannels();
    } catch (error) {
      toast.error('Failed to Save Settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleChannelActive = async (channel: Channel) => {
    setTogglingChannelId(channel.id);
    try {
      await api.channels.update(channel.id, { isActive: !channel.isActive });
      toast.success(channel.isActive ? 'Channel Paused' : 'Channel Activated', {
        description: channel.isActive
          ? `${channel.name} has been paused.`
          : `${channel.name} is now active.`,
      });
      loadChannels();
      if (selectedChannel?.id === channel.id) {
        loadChannelDetails(channel.id);
      }
    } catch (error) {
      toast.error('Failed to Update Status');
    } finally {
      setTogglingChannelId(null);
    }
  };

  const deleteChannel = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    setDeletingChannelId(channelId);
    try {
      await api.channels.delete(channelId);
      toast.success('Channel Disconnected', {
        description: `${channel?.name || 'Channel'} has been removed.`,
      });
      setChannels(channels.filter((c) => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setView('dashboard');
      }
    } catch (error) {
      toast.error('Failed to Disconnect Channel');
    } finally {
      setDeletingChannelId(null);
      setDeleteConfirmChannel(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFiles(e.target.files);
  };

  const directUploadToGoogleDrive = async (
    file: File,
    accessToken: string
  ): Promise<{ id: string; url: string; name: string }> => {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${timestamp}-${cleanName}`;
    const metadata = {
      name: fileName,
      mimeType: file.type || 'application/octet-stream',
    };
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );
    if (!initRes.ok) throw new Error('Failed to initialize upload');
    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL received');
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('Upload failed');
    const result = await uploadRes.json();
    const fileId = result.id;
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    return {
      id: fileId,
      url: `https://drive.google.com/uc?export=download&id=${fileId}`,
      name: fileName,
    };
  };

  const uploadVideos = async () => {
    if (!selectedChannel || !uploadFiles || uploadFiles.length === 0) {
      toast.error('No Files Selected', { description: 'Please select video files.' });
      return;
    }
    setUploading(true);
    setUploadProgress({});
    const loadingToast = toast.loading('Uploading Videos', {
      description: `Processing ${uploadFiles.length} file(s)...`,
    });
    const uploadedVideos: {
      blobUrl: string;
      fileId: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      thumbnailUrl?: string;
      thumbnailFileId?: string;
      thumbnailOriginalName?: string;
      thumbnailSize?: number;
    }[] = [];
    const errors: string[] = [];

    try {
      const tokenRes = await fetch(`/api/token?channelId=${selectedChannel.id}`);
      const tokenData = await tokenRes.json();
      if (!tokenData.success) throw new Error(tokenData.error || 'Failed to get upload credentials');
      const accessToken = tokenData.accessToken;

      // Upload thumbnails
      const thumbnailData: { url: string; fileId: string; name: string; size: number }[] = [];
      if (thumbnailFiles && thumbnailFiles.length > 0) {
        for (let i = 0; i < thumbnailFiles.length; i++) {
          const thumbFile = thumbnailFiles[i];
          try {
            setUploadProgress((prev) => ({ ...prev, [`thumb-${thumbFile.name}`]: 50 }));
            const result = await directUploadToGoogleDrive(thumbFile, accessToken);
            thumbnailData.push({ url: result.url, fileId: result.id, name: thumbFile.name, size: thumbFile.size });
            setUploadProgress((prev) => ({ ...prev, [`thumb-${thumbFile.name}`]: 100 }));
          } catch (error: any) {
            errors.push(`Thumbnail ${thumbFile.name}: ${error.message}`);
          }
        }
      }

      // Upload videos
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        try {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 10 }));
          const result = await directUploadToGoogleDrive(file, accessToken);
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
          let thumbData: { url?: string; fileId?: string; name?: string; size?: number } = {};
          if (thumbnailData.length > 0) {
            if (thumbnailData.length === 1) {
              thumbData = thumbnailData[0];
            } else if (i < thumbnailData.length) {
              thumbData = thumbnailData[i];
            }
          }
          uploadedVideos.push({
            blobUrl: result.url,
            fileId: result.id,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            thumbnailUrl: thumbData.url,
            thumbnailFileId: thumbData.fileId,
            thumbnailOriginalName: thumbData.name,
            thumbnailSize: thumbData.size,
          });
        } catch (error: any) {
          errors.push(`${file.name}: ${error.message || 'Upload failed'}`);
        }
      }

      // Create video records
      for (const video of uploadedVideos) {
        const fileExtension = video.originalName.includes('.')
          ? '.' + video.originalName.split('.').pop()
          : '';
        const title = defaultTitle
          ? `${defaultTitle} ${uploadedVideos.length > 1 ? `(${uploadedVideos.indexOf(video) + 1})` : ''}`
          : video.originalName.replace(fileExtension, '');
        await fetch('/api/videos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            blobUrl: video.blobUrl,
            fileId: video.fileId,
            originalName: video.originalName,
            fileSize: video.fileSize,
            mimeType: video.mimeType,
            title,
            description: defaultDescription,
            tags: defaultTags,
            thumbnailUrl: video.thumbnailUrl,
            thumbnailFileId: video.thumbnailFileId,
            thumbnailOriginalName: video.thumbnailOriginalName,
            thumbnailSize: video.thumbnailSize,
          }),
        });
      }

      if (uploadedVideos.length > 0) {
        toast.dismiss(loadingToast);
        toast.success('Videos Uploaded Successfully', {
          description: `${uploadedVideos.length} video(s) added to queue.`,
        });
        setUploadFiles(null);
        setThumbnailFiles(null);
        setDefaultTitle('');
        setDefaultDescription('');
        setDefaultTags('');
        loadChannelDetails(selectedChannel.id);
        loadChannels();
      }
      if (errors.length > 0) {
        toast.dismiss(loadingToast);
        toast.error('Some Uploads Failed', { description: errors.join(', ') });
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Upload Failed', { description: error.message });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const deleteVideo = async (videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    const loadingToast = toast.loading('Deleting Video', {
      description: `Removing "${video?.title || 'Video'}"...`,
    });
    try {
      await api.videos.delete(videoId);
      toast.dismiss(loadingToast);
      toast.success('Video Deleted', { description: `"${video?.title}" removed from queue.` });
      setVideos(videos.filter((v) => v.id !== videoId));
      loadChannels();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Delete Video');
    } finally {
      setDeleteConfirmVideo(null);
    }
  };

  const getVideoType = (video: Video): 'shorts' | 'video' => {
    const fileName = video.originalName?.toLowerCase() || '';
    if (fileName.includes('shorts') || fileName.includes('short') || fileName.includes('#shorts')) {
      return 'shorts';
    }
    return 'video';
  };

  const openEditVideo = (video: Video) => {
    setEditingVideo(video);
    setEditVideoData({
      title: video.title,
      description: video.description || '',
      tags: video.tags || '',
    });
    setEditThumbnailFile(null);
  };

  const saveVideoEdit = async () => {
    if (!editingVideo) return;
    setSavingVideo(true);
    const loadingToast = toast.loading('Saving Changes');
    try {
      let thumbnailUrl = editingVideo.thumbnailName;
      let fileId = undefined;
      if (editThumbnailFile && selectedChannel) {
        const formData = new FormData();
        formData.append('file', editThumbnailFile);
        formData.append('folder', 'thumbnails');
        formData.append('channelId', selectedChannel.id);
        const res = await fetch('/api/blob/upload', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
          thumbnailUrl = result.url;
          fileId = result.fileId;
        }
      }
      const res = await fetch('/api/videos/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: editingVideo.id,
          title: editVideoData.title,
          description: editVideoData.description,
          tags: editVideoData.tags,
          thumbnailUrl: thumbnailUrl,
          fileId: fileId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.dismiss(loadingToast);
        toast.success('Video Updated');
        setEditingVideo(null);
        setEditThumbnailFile(null);
        if (selectedChannel) loadChannelDetails(selectedChannel.id);
        loadChannels();
      } else {
        toast.dismiss(loadingToast);
        toast.error('Failed to Update Video');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Update Video');
    } finally {
      setSavingVideo(false);
    }
  };

  const runScheduler = async () => {
    setRunningScheduler(true);
    toast.info('Running Scheduler...');
    try {
      const result = await api.scheduler.run();
      if (result.success) {
        toast.success('Scheduler Completed', { description: result.message });
        loadSchedulerLogs();
        loadChannels();
        if (selectedChannel) loadChannelDetails(selectedChannel.id);
      } else {
        toast.error('Scheduler Failed', { description: result.error });
      }
    } catch (error) {
      toast.error('Scheduler Error');
    } finally {
      setRunningScheduler(false);
    }
  };

  const openChannelDetail = (channel: Channel) => {
    setSelectedChannel(channel);
    setView('channel');
    loadChannelDetails(channel.id);
  };

  const goBack = () => {
    setView('dashboard');
    setSelectedChannel(null);
    setVideos([]);
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideoIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideoIds(newSelected);
  };

  const toggleSelectAll = (queuedVideos: Video[]) => {
    if (selectedVideoIds.size === queuedVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(queuedVideos.map((v) => v.id)));
    }
  };

  const generateAITitles = async () => {
    if (!selectedChannel) return;
    const queuedVideos = videos.filter((v) => v.status === 'queued');
    const selectedVideos = queuedVideos.filter((v) => selectedVideoIds.has(v.id));
    if (selectedVideos.length === 0) {
      toast.error('No Videos Selected');
      return;
    }
    setGeneratingAI(true);
    const loadingToast = toast.loading('Generating AI Metadata', {
      description: `Processing ${selectedVideos.length} video(s)...`,
    });
    try {
      const response = await fetch('/api/ai/generate-for-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          videos: selectedVideos.map((v) => ({ id: v.id, title: v.title })),
          topic: aiTopic.trim() || null,
          language: aiLanguage,
        }),
      });
      const result = await response.json();
      toast.dismiss(loadingToast);
      if (result.updated > 0) {
        toast.success('AI Metadata Generated!', {
          description: `Updated ${result.updated} video(s).`,
        });
        setSelectedVideoIds(new Set());
        loadChannelDetails(selectedChannel.id);
        loadChannels();
      } else {
        toast.warning('No Videos Updated', { description: result.error || result.message });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Generation Failed');
    } finally {
      setGeneratingAI(false);
    }
  };

  // ============================================
  // RENDER DASHBOARD VIEW
  // ============================================
  const renderDashboard = () => (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">GPMart Studio</h1>
            <p className="text-muted-foreground mt-1">Manage your channels and schedule uploads</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Video Library - Highlighted Button */}
            <Button 
              onClick={() => setShowVideoLibrary(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 font-semibold btn-press"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Video Library
            </Button>
            <Button onClick={connectChannel} className="gradient-primary gradient-primary-hover text-white btn-press">
              <Plus className="mr-2 h-4 w-4" />
              Add Channel
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-soft card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Youtube className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{channels.length}</p>
                <p className="text-sm text-muted-foreground">Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {channels.filter((c) => c.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Video className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {channels.reduce((sum, c) => sum + (c.queuedVideos || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Pause className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {channels.filter((c) => !c.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Dashboard */}
      <UsageDashboard />

      {/* Channels Table */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Connected Channels</CardTitle>
          <CardDescription>Manage your YouTube channels and their upload schedules</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Youtube className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No channels connected</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Connect your YouTube channel to start scheduling video uploads automatically.
              </p>
              <Button onClick={connectChannel} className="gradient-primary text-white btn-press">
                <Plus className="mr-2 h-4 w-4" />
                Connect YouTube Channel
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[700px] sm:min-w-0">
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
                          {channel.platform === 'instagram' ? (
                            <Instagram className="h-4 w-4 text-pink-500" />
                          ) : channel.platform === 'facebook' ? (
                            <Facebook className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Youtube className="h-4 w-4 text-red-500" />
                          )}
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
                          {togglingChannelId === channel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={channel.isActive}
                              onCheckedChange={() => toggleChannelActive(channel)}
                            />
                          )}
                          <span className={`hidden sm:inline ${channel.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirmChannel(channel)}
                            disabled={deletingChannelId === channel.id}
                          >
                            {deletingChannelId === channel.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
          <CardDescription>Latest scheduler actions and uploads</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {schedulerLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No activity yet. Run the scheduler to see logs.
            </p>
          ) : (
            <div className="space-y-2">
              {schedulerLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/50 gap-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{log.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6 sm:pl-0">
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

  // ============================================
  // RENDER CHANNEL VIEW
  // ============================================
  const renderChannelView = () => {
    if (!selectedChannel) return null;

    const queuedVideos = videos
      .filter((v) => v.status === 'queued')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const uploadedVideos = videos.filter((v) => v.status === 'uploaded');
    const failedVideos = videos.filter((v) => v.status === 'failed');

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            onClick={goBack}
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                {selectedChannel.platform === 'instagram' ? (
                  <Instagram className="h-6 w-6 text-pink-500" />
                ) : selectedChannel.platform === 'facebook' ? (
                  <Facebook className="h-6 w-6 text-blue-500" />
                ) : (
                  <Youtube className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{selectedChannel.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Channel ID: {selectedChannel.youtubeChannelId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {togglingChannelId === selectedChannel.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={selectedChannel.isActive}
                  onCheckedChange={() => toggleChannelActive(selectedChannel)}
                />
              )}
              <span className={`text-sm ${selectedChannel.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                {selectedChannel.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Videos</p>
              <p className="text-2xl font-bold">{selectedChannel.stats?.total || videos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">In Queue</p>
              <p className="text-2xl font-bold text-blue-500">
                {selectedChannel.stats?.queued || queuedVideos.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Uploaded</p>
              <p className="text-2xl font-bold text-green-500">
                {selectedChannel.stats?.uploaded || uploadedVideos.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-500">
                {selectedChannel.stats?.failed || failedVideos.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center h-auto gap-1 p-1">
            <TabsTrigger value="upload" className="text-xs sm:text-sm">
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-xs sm:text-sm">
              <Video className="h-4 w-4 mr-1 sm:mr-2" />
              Queue ({queuedVideos.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="border-border/50 shadow-soft">
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
                    <p className="text-sm text-muted-foreground">{uploadFiles.length} file(s) selected</p>
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
                    <p className="text-sm text-muted-foreground">{thumbnailFiles.length} thumbnail(s) selected</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload one thumbnail per video (same order), or one thumbnail for all videos
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTitle">Default Title (Optional)</Label>
                    <Input
                      id="defaultTitle"
                      placeholder="My Video"
                      value={defaultTitle}
                      onChange={(e) => setDefaultTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to use the filename</p>
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
                    className="resize-none"
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={uploadVideos}
                    disabled={!uploadFiles || uploadFiles.length === 0 || uploading}
                    className="btn-press"
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
                  {/* Video Library Button - Highlighted */}
                  <Button
                    onClick={() => setShowVideoLibrary(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white btn-press"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Video Library
                  </Button>
                  <Button variant="outline" onClick={() => setShowDriveBrowser(true)} className="btn-press">
                    <HardDrive className="mr-2 h-4 w-4" />
                    Add from My Drive
                  </Button>
                  <Button variant="outline" onClick={() => setShowPublicDriveBrowser(true)} className="btn-press">
                    <Link className="mr-2 h-4 w-4" />
                    Add from Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle>Video Queue</CardTitle>
                      <CardDescription>Videos waiting to be uploaded</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleSelectAll(queuedVideos)}>
                        {selectedVideoIds.size === queuedVideos.length && queuedVideos.length > 0
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                      <Button
                        onClick={generateAITitles}
                        disabled={generatingAI || selectedVideoIds.size === 0}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white btn-press"
                      >
                        {generatingAI ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            AI Generate ({selectedVideoIds.size})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Topic Input for AI */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Label htmlFor="ai-topic" className="text-sm font-medium whitespace-nowrap flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Video Topic:
                    </Label>
                    <Input
                      id="ai-topic"
                      placeholder="e.g., Motivational, Tech News..."
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium whitespace-nowrap">Language:</Label>
                      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border">
                        <Button
                          variant={aiLanguage === 'english' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setAiLanguage('english')}
                          className={
                            aiLanguage === 'english' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''
                          }
                        >
                          English
                        </Button>
                        <Button
                          variant={aiLanguage === 'hindi' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setAiLanguage('hindi')}
                          className={aiLanguage === 'hindi' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                        >
                          Hindi
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {queuedVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No videos in queue</p>
                    <p className="text-xs">Upload videos to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table className="min-w-[750px] sm:min-w-0">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <input
                              type="checkbox"
                              checked={queuedVideos.length > 0 && selectedVideoIds.size === queuedVideos.length}
                              onChange={() => toggleSelectAll(queuedVideos)}
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </TableHead>
                          <TableHead className="w-[80px]">#</TableHead>
                          <TableHead>Thumbnail</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="hidden sm:table-cell">Size</TableHead>
                          <TableHead className="hidden md:table-cell">Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queuedVideos.map((video, index) => (
                          <TableRow
                            key={video.id}
                            className={`${index === 0 ? 'bg-green-50 dark:bg-green-950' : ''} ${selectedVideoIds.has(video.id) ? 'bg-purple-50 dark:bg-purple-950/50' : ''}`}
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedVideoIds.has(video.id)}
                                onChange={() => toggleVideoSelection(video.id)}
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell>
                              {index === 0 ? (
                                <Badge className="bg-green-600">Next</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{index + 1}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {video.thumbnailName ? (
                                <div
                                  className="w-16 h-10 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all bg-muted"
                                  onClick={() => setPreviewThumbnail(getThumbnailUrl(video.thumbnailName))}
                                >
                                  <img
                                    src={getThumbnailUrl(video.thumbnailName) || ''}
                                    alt="Thumbnail"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                                  <FileVideo className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate max-w-[200px]">{video.title}</p>
                                {video.tags && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
                                    Tags: {video.tags}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getVideoType(video) === 'shorts' ? 'default' : 'secondary'}>
                                {getVideoType(video) === 'shorts' ? 'Shorts' : 'Video'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {formatFileSize(video.fileSize)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {formatDate(video.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewVideo(video)}
                                  title="Preview Video"
                                >
                                  <Play className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-1">Preview</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditVideo(video)}
                                  title="Edit Video"
                                >
                                  <Settings className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-1">Edit</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteConfirmVideo(video)}
                                  title="Delete Video"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle>Upload Schedule</CardTitle>
                <CardDescription>
                  Configure when videos should be automatically uploaded to this channel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="uploadTime">Upload Time</Label>
                    <Input
                      id="uploadTime"
                      type="time"
                      value={editSettings.uploadTime}
                      onChange={(e) => setEditSettings({ ...editSettings, uploadTime: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Videos will upload within ±15 min of this time randomly
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
                        <SelectItem value="every6h">Every 6 Hours</SelectItem>
                        <SelectItem value="every12h">Every 12 Hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="alternate">Every Other Day</SelectItem>
                        <SelectItem value="every3days">Every 3 Days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How often to upload videos</p>
                  </div>
                </div>

                {/* Random Delay Section */}
                <div className="space-y-4 p-4 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label htmlFor="randomDelay">Random Delay</Label>
                      <p className="text-sm text-muted-foreground">
                        Add a random delay before each upload to appear more natural
                      </p>
                    </div>
                    <Switch
                      id="randomDelay"
                      checked={editSettings.randomDelayEnabled}
                      onCheckedChange={(value) => setEditSettings({ ...editSettings, randomDelayEnabled: value })}
                    />
                  </div>
                  {editSettings.randomDelayEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="maxDelay">Maximum Delay (minutes)</Label>
                      <Input
                        id="maxDelay"
                        type="number"
                        min={5}
                        max={180}
                        value={editSettings.randomDelayMinutes}
                        onChange={(e) =>
                          setEditSettings({ ...editSettings, randomDelayMinutes: parseInt(e.target.value) || 30 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Videos will be delayed by a random amount (0 to {editSettings.randomDelayMinutes} minutes)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-4">
                  <div>
                    <p className="text-sm font-medium">Last Upload</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedChannel.lastUploadDate)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium">Next Scheduled Upload</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedChannel.nextUploadTime
                        ? formatNextUpload(new Date(selectedChannel.nextUploadTime))
                        : 'Calculating...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">±15 min random delay applied</p>
                  </div>
                </div>

                <Button onClick={updateChannelSettings} disabled={savingSettings} className="btn-press">
                  {savingSettings ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>Previously uploaded and failed videos</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {uploadedVideos.length === 0 && failedVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No upload history yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table className="min-w-[500px] sm:min-w-0">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Date</TableHead>
                          <TableHead className="hidden md:table-cell">Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...uploadedVideos, ...failedVideos].map((video) => (
                          <TableRow key={video.id}>
                            <TableCell className="font-medium">
                              <p className="truncate max-w-[150px] sm:max-w-none">{video.title}</p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={video.status === 'uploaded' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {video.status === 'uploaded' ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {video.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {formatDate(video.uploadedAt || video.createdAt)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-red-500 text-sm truncate max-w-[200px]">
                              {video.error || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Video Dialog */}
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
              <DialogDescription>Update video details before upload</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editVideoData.title}
                  onChange={(e) => setEditVideoData({ ...editVideoData, title: e.target.value })}
                  placeholder="Video title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editVideoData.description}
                  onChange={(e) => setEditVideoData({ ...editVideoData, description: e.target.value })}
                  placeholder="Video description"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                <Input
                  id="edit-tags"
                  value={editVideoData.tags}
                  onChange={(e) => setEditVideoData({ ...editVideoData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-thumbnail-file">Thumbnail</Label>
                <Input
                  id="edit-thumbnail-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditThumbnailFile(file);
                    }
                  }}
                />
                {editThumbnailFile ? (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">New thumbnail:</p>
                    <img
                      src={URL.createObjectURL(editThumbnailFile)}
                      alt="New thumbnail preview"
                      className="w-full max-w-[200px] rounded-lg border"
                    />
                  </div>
                ) : editingVideo?.thumbnailName ? (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Current thumbnail:</p>
                    <img
                      src={editingVideo.thumbnailName}
                      alt="Current thumbnail"
                      className="w-full max-w-[200px] rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">Upload a new image or leave empty to keep current</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditingVideo(null)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={saveVideoEdit} disabled={savingVideo} className="w-full sm:w-auto btn-press">
                {savingVideo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Thumbnail Preview Dialog */}
        <Dialog open={!!previewThumbnail} onOpenChange={() => setPreviewThumbnail(null)}>
          <DialogContent className="max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Thumbnail Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              {previewThumbnail && (
                <img
                  src={previewThumbnail}
                  alt="Thumbnail preview"
                  className="max-w-full max-h-[500px] rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewThumbnail(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Video Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg truncate">{previewVideo?.title || 'Video Preview'}</DialogTitle>
              <DialogDescription>
                {previewVideo?.originalName} • {previewVideo?.fileSize ? formatFileSize(previewVideo.fileSize) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {previewVideo && getVideoUrl(previewVideo.fileName) && (
                  <iframe
                    src={getVideoUrl(previewVideo.fileName) || ''}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Video Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Title</p>
                  <p className="font-medium truncate">{previewVideo?.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge
                    variant={previewVideo ? (getVideoType(previewVideo) === 'shorts' ? 'default' : 'secondary') : 'secondary'}
                  >
                    {previewVideo ? (getVideoType(previewVideo) === 'shorts' ? 'Shorts' : 'Video') : 'Video'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="truncate">{previewVideo?.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tags</p>
                  <p className="truncate">{previewVideo?.tags || 'No tags'}</p>
                </div>
              </div>

              {/* Open in Drive Link */}
              {previewVideo && getDriveLink(previewVideo.fileName) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 btn-press"
                    onClick={() => window.open(getDriveLink(previewVideo.fileName) || '', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Drive
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewVideo(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drive Video Browser */}
        <DriveVideoBrowser
          open={showDriveBrowser}
          onClose={() => setShowDriveBrowser(false)}
          channelId={selectedChannel?.id || ''}
          onVideosAdded={() => {
            loadChannelDetails(selectedChannel?.id || '');
            loadChannels();
          }}
        />

        {/* Public Drive Browser */}
        <PublicDriveBrowser
          open={showPublicDriveBrowser}
          onClose={() => setShowPublicDriveBrowser(false)}
          channelId={selectedChannel?.id || ''}
          onVideosAdded={() => {
            loadChannelDetails(selectedChannel?.id || '');
            loadChannels();
          }}
        />

      </div>
    );
  };

  // ============================================
  // DELETE CONFIRMATION DIALOGS
  // ============================================
  const renderDeleteConfirmations = () => (
    <>
      {/* Delete Channel Confirmation */}
      <AlertDialog open={!!deleteConfirmChannel} onOpenChange={() => setDeleteConfirmChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteConfirmChannel?.name} and all its queued videos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteChannel(deleteConfirmChannel?.id || '')}
              disabled={deletingChannelId === deleteConfirmChannel?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingChannelId === deleteConfirmChannel?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Video Confirmation */}
      <AlertDialog open={!!deleteConfirmVideo} onOpenChange={() => setDeleteConfirmVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteConfirmVideo?.title}&quot; from the queue. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideo(deleteConfirmVideo?.id || '')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === 'dashboard' ? (
          renderDashboard()
        ) : (
          renderChannelView()
        )}
      </div>
      {renderDeleteConfirmations()}
      
      {/* Video Library Browser - Available globally */}
      <VideoLibraryBrowser
        open={showVideoLibrary}
        onClose={() => setShowVideoLibrary(false)}
        channels={channels}
        onVideosAdded={() => {
          if (selectedChannel) {
            loadChannelDetails(selectedChannel.id);
          }
          loadChannels();
        }}
      />
    </div>
  );
}