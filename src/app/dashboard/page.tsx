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
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Eye,
  FileVideo,
  Loader2,
  Image as ImageIcon,
  X,
  ExternalLink,
  Facebook,
  Instagram,
  HardDrive,
  Link,
  Sparkles,
  Wand2,
  Settings,
  ChevronRight,
  MoreVertical,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';
import DriveVideoBrowser from '@/components/DriveVideoBrowser';
import PublicDriveBrowser from '@/components/PublicDriveBrowser';
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

  // Drive video browser state
  const [showDriveBrowser, setShowDriveBrowser] = useState(false);
  const [showPublicDriveBrowser, setShowPublicDriveBrowser] = useState(false);

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
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your channels and schedule uploads</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={runScheduler}
              disabled={runningScheduler}
              className="btn-press"
            >
              {runningScheduler ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Scheduler
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
                <Activity className="h-5 w-5 text-green-500" />
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

      {/* Channels Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Connected Channels</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
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
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <Card
                key={channel.id}
                className="border-border/50 shadow-soft card-hover cursor-pointer overflow-hidden"
                onClick={() => openChannelDetail(channel)}
              >
                <div className={`h-1 ${channel.isActive ? 'gradient-primary' : 'bg-muted'}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                        <Youtube className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold line-clamp-1">{channel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {channel.queuedVideos || 0} videos in queue
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={channel.isActive ? 'default' : 'secondary'}
                      className={channel.isActive ? 'badge-success' : ''}
                    >
                      {channel.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {channel.uploadTime}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {channel.frequency}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER CHANNEL VIEW
  // ============================================
  const renderChannelView = () => {
    if (!selectedChannel) return null;
    const queuedVideos = videos.filter((v) => v.status === 'queued');
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
                <Youtube className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{selectedChannel.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedChannel.frequency} uploads at {selectedChannel.uploadTime}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => toggleChannelActive(selectedChannel)}
                disabled={togglingChannelId === selectedChannel.id}
                className="btn-press"
              >
                {togglingChannelId === selectedChannel.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : selectedChannel.isActive ? (
                  <Pause className="mr-2 h-4 w-4" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {selectedChannel.isActive ? 'Pause' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmChannel(selectedChannel)}
                className="text-destructive hover:bg-destructive/10 btn-press"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Queued</p>
              <p className="text-2xl font-bold text-blue-500">{queuedVideos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Uploaded</p>
              <p className="text-2xl font-bold text-green-500">{uploadedVideos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-500">{failedVideos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold">{videos.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Card */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Upload Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Upload Time</Label>
                <Input
                  type="time"
                  value={editSettings.uploadTime}
                  onChange={(e) => setEditSettings((s) => ({ ...s, uploadTime: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editSettings.frequency}
                  onValueChange={(v) => setEditSettings((s) => ({ ...s, frequency: v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="every2days">Every 2 Days</SelectItem>
                    <SelectItem value="every3days">Every 3 Days</SelectItem>
                    <SelectItem value="every5days">Every 5 Days</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Random Delay</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={editSettings.randomDelayEnabled}
                    onCheckedChange={(c) => setEditSettings((s) => ({ ...s, randomDelayEnabled: c }))}
                  />
                  {editSettings.randomDelayEnabled && (
                    <Input
                      type="number"
                      value={editSettings.randomDelayMinutes}
                      onChange={(e) =>
                        setEditSettings((s) => ({ ...s, randomDelayMinutes: parseInt(e.target.value) || 30 }))
                      }
                      className="w-20 h-10"
                      min={1}
                      max={120}
                    />
                  )}
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={updateChannelSettings}
                  disabled={savingSettings}
                  className="gradient-primary text-white btn-press"
                >
                  {savingSettings ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Videos Card */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Add Videos to Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Video Files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileChange}
                  className="h-10"
                />
                {uploadFiles && (
                  <p className="text-sm text-muted-foreground">
                    {uploadFiles.length} file(s) selected
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Thumbnails (Optional)</Label>
                <Input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setThumbnailFiles(e.target.files)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Default Title</Label>
                <Input
                  value={defaultTitle}
                  onChange={(e) => setDefaultTitle(e.target.value)}
                  placeholder="Auto from filename"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Description</Label>
                <Input
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  placeholder="Optional description"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Tags</Label>
                <Input
                  value={defaultTags}
                  onChange={(e) => setDefaultTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={uploadVideos}
                disabled={uploading || !uploadFiles}
                className="gradient-primary text-white btn-press"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload Videos
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDriveBrowser(true)}
                className="btn-press"
              >
                <HardDrive className="mr-2 h-4 w-4" />
                From Google Drive
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Queue */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Video Queue</CardTitle>
              {queuedVideos.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAll(queuedVideos)}
                    className="btn-press"
                  >
                    {selectedVideoIds.size === queuedVideos.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAITitles}
                    disabled={generatingAI || selectedVideoIds.size === 0}
                    className="btn-press"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI Generate
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingChannel ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No videos in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedVideoIds.has(video.id)}
                        onChange={() => toggleVideoSelection(video.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div className="w-16 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {getThumbnailUrl(video.thumbnailDriveId || video.thumbnailName) ? (
                          <img
                            src={getThumbnailUrl(video.thumbnailDriveId || video.thumbnailName)!}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileVideo className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              video.status === 'queued'
                                ? 'badge-success'
                                : video.status === 'uploaded'
                                ? 'bg-green-100 text-green-700'
                                : video.status === 'failed'
                                ? 'badge-error'
                                : ''
                            }`}
                          >
                            {video.status}
                          </Badge>
                          {video.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(video.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditVideo(video)}
                        className="flex-1 sm:flex-none btn-press"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmVideo(video)}
                        className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10 btn-press"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drive Browser Dialog */}
        <Dialog open={showDriveBrowser} onOpenChange={setShowDriveBrowser}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Videos from Google Drive</DialogTitle>
              <DialogDescription>
                Choose videos to add to your upload queue
              </DialogDescription>
            </DialogHeader>
            <DriveVideoBrowser
              channelId={selectedChannel.id}
              onSelect={(files) => {
                console.log('Selected files:', files);
                setShowDriveBrowser(false);
                loadChannelDetails(selectedChannel.id);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Video Dialog */}
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
              <DialogDescription>Update video details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editVideoData.title}
                  onChange={(e) => setEditVideoData((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editVideoData.description}
                  onChange={(e) => setEditVideoData((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={editVideoData.tags}
                  onChange={(e) => setEditVideoData((d) => ({ ...d, tags: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditThumbnailFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingVideo(null)}>
                Cancel
              </Button>
              <Button onClick={saveVideoEdit} disabled={savingVideo} className="gradient-primary text-white">
                {savingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Video Confirmation */}
        <AlertDialog open={!!deleteConfirmVideo} onOpenChange={() => setDeleteConfirmVideo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirmVideo?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmVideo && deleteVideo(deleteConfirmVideo.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : view === 'dashboard' ? (
        renderDashboard()
      ) : (
        renderChannelView()
      )}

      {/* Delete Channel Confirmation */}
      <AlertDialog open={!!deleteConfirmChannel} onOpenChange={() => setDeleteConfirmChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect "{deleteConfirmChannel?.name}" and remove all queued videos. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmChannel && deleteChannel(deleteConfirmChannel.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}