'use client';

// Facebook SDK type declaration
declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (callback: (response: any) => void, params?: { scope: string }) => void;
      api: (path: string, method: string, params: any, callback: (response: any) => void) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

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
  Image as ImageIcon,
  X,
  ExternalLink,
  Facebook,
  Instagram,
  HardDrive,
  Link,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';
import DriveVideoBrowser from '@/components/DriveVideoBrowser';
import PublicDriveBrowser from '@/components/PublicDriveBrowser';

// Helper to get Google Drive thumbnail URL from file ID or URL
const getThumbnailUrl = (fileIdOrUrl: string | null): string | null => {
  if (!fileIdOrUrl) return null;
  
  // Extract file ID from various formats
  let fileId: string | null = null;
  
  // If it's a full URL
  if (fileIdOrUrl.startsWith('http')) {
    // Format: https://drive.google.com/uc?export=download&id=FILE_ID
    const match1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
    if (match1) {
      fileId = match1[1];
    }
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    if (!fileId) {
      const match2 = fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
      if (match2) {
        fileId = match2[1];
      }
    }
    
    // Format: https://lh3.googleusercontent.com/d/FILE_ID
    if (!fileId) {
      const match3 = fileIdOrUrl.match(/\/d\/([^/?=]+)/);
      if (match3) {
        fileId = match3[1];
      }
    }
  } else {
    // It's just a file ID
    fileId = fileIdOrUrl;
  }
  
  if (!fileId) return null;
  
  // Use Google User Content URL for better CORS support
  return `https://lh3.googleusercontent.com/d/${fileId}=w200-h120-c`;
};

// Helper to get Google Drive video URL for preview
const getVideoUrl = (fileIdOrUrl: string | null): string | null => {
  if (!fileIdOrUrl) return null;
  
  // Extract file ID from various formats
  let fileId: string | null = null;
  
  // If it's a full URL
  if (fileIdOrUrl.startsWith('http')) {
    const match1 = fileIdOrUrl.match(/[?&]id=([^&]+)/);
    if (match1) {
      fileId = match1[1];
    }
    if (!fileId) {
      const match2 = fileIdOrUrl.match(/\/file\/d\/([^/]+)/);
      if (match2) {
        fileId = match2[1];
      }
    }
  } else {
    fileId = fileIdOrUrl;
  }
  
  if (!fileId) return null;
  
  // Google Drive video preview URL
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

// Helper to get Google Drive direct link
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
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

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

  // Load channels
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
          randomDelayEnabled: data.channel.randomDelayMinutes ? true : false,
          randomDelayMinutes: data.channel.randomDelayMinutes || 30,
        });
      }
    } catch (error) {
      toast.error('Failed to Load Channel Details', {
        description: 'Could not fetch channel information. Please try again.',
      });
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

  // Initialize Facebook SDK
  useEffect(() => {
    // Load Facebook SDK script
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) return;
      
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
      
      window.fbAsyncInit = function() {
        window.FB?.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      };
    };
    
    loadFacebookSDK();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected) {
      toast.success('Channel Connected!', {
        description: 'Your YouTube channel has been successfully connected and is ready for uploads.',
      });
      loadChannels();
      window.history.replaceState({}, '', '/');
    }

    if (error) {
      toast.error('Connection Failed', {
        description: `Could not connect your channel: ${error}. Please try again.`,
      });
      window.history.replaceState({}, '', '/');
    }
  }, [loadChannels]);

  // Connect new channel
  const connectChannel = () => {
    window.location.href = '/api/auth/youtube';
  };

  // Connect Facebook page
  const connectFacebook = () => {
    if (!window.FB) {
      toast.error('Facebook SDK Not Loaded', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        // Get user's pages
        window.FB?.api('/me/accounts', 'GET', { fields: 'id,name,access_token' }, (pagesResponse) => {
          if (pagesResponse.data && pagesResponse.data.length > 0) {
            // For now, just show success - actual page selection would need a dialog
            toast.success('Facebook Connected!', {
              description: `Found ${pagesResponse.data.length} page(s). Select a page to connect.`,
            });
          } else {
            toast.error('No Facebook Pages Found', {
              description: 'You need to have a Facebook Page to connect.',
            });
          }
        });
      } else {
        toast.error('Facebook Connection Cancelled', {
          description: 'You cancelled the Facebook login process.',
        });
      }
    }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts' });
  };

  // Connect Instagram account (via Facebook)
  const connectInstagram = () => {
    if (!window.FB) {
      toast.error('Facebook SDK Not Loaded', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        // Get user's Instagram Business accounts via Facebook Pages
        window.FB?.api('/me/accounts', 'GET', { fields: 'id,name,access_token,instagram_business_account' }, (pagesResponse) => {
          if (pagesResponse.data) {
            const igAccounts = pagesResponse.data.filter((page: any) => page.instagram_business_account);
            if (igAccounts.length > 0) {
              toast.success('Instagram Connected!', {
                description: `Found ${igAccounts.length} Instagram account(s) linked to your Facebook Pages.`,
              });
            } else {
              toast.error('No Instagram Accounts Found', {
                description: 'No Instagram Business accounts found. Make sure your Instagram is linked to a Facebook Page.',
              });
            }
          }
        });
      } else {
        toast.error('Instagram Connection Cancelled', {
          description: 'You cancelled the login process.',
        });
      }
    }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish' });
  };

  // Update channel settings
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
      toast.error('Failed to Save Settings', {
        description: 'Could not update channel settings. Please try again.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle channel active status
  const toggleChannelActive = async (channel: Channel) => {
    setTogglingChannelId(channel.id);
    
    try {
      await api.channels.update(channel.id, { isActive: !channel.isActive });
      if (channel.isActive) {
        toast.success('Channel Paused', {
          description: `${channel.name} has been paused. Scheduled uploads will not run.`,
        });
      } else {
        toast.success('Channel Activated', {
          description: `${channel.name} is now active. Videos will be uploaded on schedule.`,
        });
      }
      loadChannels();
      if (selectedChannel?.id === channel.id) {
        loadChannelDetails(channel.id);
      }
    } catch (error) {
      toast.error('Failed to Update Status', {
        description: 'Could not change channel status. Please try again.',
      });
    } finally {
      setTogglingChannelId(null);
    }
  };

  // Delete channel
  const deleteChannel = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setDeletingChannelId(channelId);
    
    try {
      await api.channels.delete(channelId);
      toast.success('Channel Disconnected', {
        description: `${channel?.name || 'Channel'} has been removed along with all queued videos.`,
      });
      setChannels(channels.filter(c => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setView('dashboard');
      }
    } catch (error) {
      toast.error('Failed to Disconnect Channel', {
        description: 'Could not remove the channel. Please try again.',
      });
    } finally {
      setDeletingChannelId(null);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFiles(e.target.files);
  };

  // Direct upload to Google Drive (for large files)
  const directUploadToGoogleDrive = async (
    file: File, 
    accessToken: string
  ): Promise<{ id: string; url: string; name: string }> => {
    // Create unique filename
    const timestamp = Date.now();
    const cleanName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${timestamp}-${cleanName}`;
    
    // Create file metadata
    const metadata = {
      name: fileName,
      mimeType: file.type || 'application/octet-stream',
    };

    // Use resumable upload for large files
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      throw new Error('Failed to initialize upload');
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received');
    }

    // Upload the file content
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const result = await uploadRes.json();
    const fileId = result.id;

    // Make file public
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    return {
      id: fileId,
      url: `https://drive.google.com/uc?export=download&id=${fileId}`,
      name: fileName,
    };
  };

  // Upload videos using Google Drive
  const uploadVideos = async () => {
    if (!selectedChannel || !uploadFiles || uploadFiles.length === 0) {
      toast.error('No Files Selected', {
        description: 'Please select at least one video file to upload.',
      });
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
      // Get access token for direct upload
      const tokenRes = await fetch(`/api/token?channelId=${selectedChannel.id}`);
      const tokenData = await tokenRes.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get upload credentials');
      }
      
      const accessToken = tokenData.accessToken;

      // First, upload all thumbnails to Google Drive
      const thumbnailData: { url: string; fileId: string; name: string; size: number }[] = [];
      if (thumbnailFiles && thumbnailFiles.length > 0) {
        for (let i = 0; i < thumbnailFiles.length; i++) {
          const thumbFile = thumbnailFiles[i];
          
          try {
            setUploadProgress(prev => ({ ...prev, [`thumb-${thumbFile.name}`]: 50 }));
            
            // Direct upload to Google Drive
            const result = await directUploadToGoogleDrive(thumbFile, accessToken);
            
            thumbnailData.push({ 
              url: result.url, 
              fileId: result.id,
              name: thumbFile.name, 
              size: thumbFile.size 
            });
            setUploadProgress(prev => ({ ...prev, [`thumb-${thumbFile.name}`]: 100 }));
          } catch (error: any) {
            console.error(`Failed to upload thumbnail ${thumbFile.name}:`, error);
            errors.push(`Thumbnail ${thumbFile.name}: ${error.message}`);
          }
        }
      }

      // Upload each video file
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
          
          // Direct upload to Google Drive (handles large files)
          const result = await directUploadToGoogleDrive(file, accessToken);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          // Get thumbnail for this video (one-to-one or one-for-all)
          let thumbData: { url?: string; fileId?: string; name?: string; size?: number } = {};
          if (thumbnailData.length > 0) {
            if (thumbnailData.length === 1) {
                // One thumbnail for all videos
                thumbData = thumbnailData[0];
              } else if (i < thumbnailData.length) {
                // One thumbnail per video (same order)
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
        
        if (!res.ok) {
          const error = await res.json();
          errors.push(`${video.originalName}: ${error.error || 'Failed to create record'}`);
        }
      }

      if (uploadedVideos.length > 0) {
        toast.dismiss(loadingToast);
        toast.success('Videos Uploaded Successfully', {
          description: `${uploadedVideos.length} video(s) added to queue for ${selectedChannel.name}`,
        });
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
        toast.dismiss(loadingToast);
        toast.error('Some Uploads Failed', {
          description: errors.join(', '),
        });
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Upload Failed', {
        description: error.message || 'An unexpected error occurred during upload.',
      });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    const loadingToast = toast.loading('Deleting Video', {
      description: `Removing "${video?.title || 'Video'}" from queue...`,
    });
    
    try {
      await api.videos.delete(videoId);
      toast.dismiss(loadingToast);
      toast.success('Video Deleted', {
        description: `"${video?.title || 'Video'}" has been removed from the queue.`,
      });
      setVideos(videos.filter(v => v.id !== videoId));
      loadChannels();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Delete Video', {
        description: 'Could not remove the video from queue. Please try again.',
      });
    }
  };

  // Detect video type from file dimensions (if available) or file size/ratio heuristics
  const getVideoType = (video: Video): 'shorts' | 'video' => {
    // YouTube Shorts: vertical video (9:16 aspect ratio)
    // Regular video: horizontal or square (16:9 or 1:1)
    
    // We can't get actual dimensions without loading the video
    // So we use file name hints or default to 'video'
    const fileName = video.originalName?.toLowerCase() || '';
    
    // Check if filename contains "shorts" or "short"
    if (fileName.includes('shorts') || fileName.includes('short') || fileName.includes('#shorts')) {
      return 'shorts';
    }
    
    // Check mimeType for vertical video indicators
    if (video.mimeType?.includes('vertical')) {
      return 'shorts';
    }
    
    // Default to regular video
    return 'video';
  };

  // Open video edit dialog
  const openEditVideo = (video: Video) => {
    setEditingVideo(video);
    setEditVideoData({
      title: video.title,
      description: video.description || '',
      tags: video.tags || '',
    });
    setEditThumbnailFile(null);
  };

  // Save video edits
  const saveVideoEdit = async () => {
    if (!editingVideo) return;
    
    setSavingVideo(true);
    const loadingToast = toast.loading('Saving Changes', {
      description: 'Updating video details...',
    });
    
    try {
      let thumbnailUrl = editingVideo.thumbnailName; // Keep existing by default
      let fileId = undefined;
      
      // Upload new thumbnail if file is selected
      if (editThumbnailFile && selectedChannel) {
        const formData = new FormData();
        formData.append('file', editThumbnailFile);
        formData.append('folder', 'thumbnails');
        formData.append('channelId', selectedChannel.id);
        
        const res = await fetch('/api/blob/upload', {
          method: 'POST',
          body: formData,
        });
        
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
        toast.success('Video Updated', {
          description: `"${editVideoData.title}" has been updated successfully.`,
        });
        setEditingVideo(null);
        setEditThumbnailFile(null);
        // Refresh the video list
        if (selectedChannel) {
          loadChannelDetails(selectedChannel.id);
        }
        loadChannels();
      } else {
        toast.dismiss(loadingToast);
        toast.error('Failed to Update Video', {
          description: result.error || 'Could not save changes. Please try again.',
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Update Video', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setSavingVideo(false);
    }
  };

  // Run scheduler manually
  const runScheduler = async () => {
    setRunningScheduler(true);
    toast.info('Running Scheduler...', {
      description: 'Checking for scheduled uploads...',
    });
    try {
      const result = await api.scheduler.run();
      if (result.success) {
        toast.success('Scheduler Completed', {
          description: result.message || 'All scheduled uploads have been processed.',
        });
        loadSchedulerLogs();
        loadChannels();
        if (selectedChannel) {
          loadChannelDetails(selectedChannel.id);
        }
      } else {
        toast.error('Scheduler Failed', {
          description: result.error || 'Could not process scheduled uploads.',
        });
      }
    } catch (error) {
      toast.error('Scheduler Error', {
        description: 'Failed to run the scheduler. Please try again.',
      });
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

  // Toggle video selection for AI
  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideoIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideoIds(newSelected);
  };

  // Select/Deselect all videos
  const toggleSelectAll = (queuedVideos: Video[]) => {
    if (selectedVideoIds.size === queuedVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(queuedVideos.map(v => v.id)));
    }
  };

  // Generate AI titles for selected videos
  const generateAITitles = async () => {
    if (!selectedChannel) return;
    
    const queuedVideos = videos.filter(v => v.status === 'queued');
    const selectedVideos = queuedVideos.filter(v => selectedVideoIds.has(v.id));
    
    if (selectedVideos.length === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select videos to generate AI metadata.',
      });
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
          videos: selectedVideos.map(v => ({ id: v.id, title: v.title })),
          topic: aiTopic.trim() || null,
          language: aiLanguage,
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.updated > 0) {
        toast.success('AI Metadata Generated!', {
          description: `Updated ${result.updated} video(s) with AI-generated titles and descriptions.`,
        });
        setSelectedVideoIds(new Set());
        loadChannelDetails(selectedChannel.id);
        loadChannels();
      } else {
        toast.warning('No Videos Updated', {
          description: result.error || result.message || 'Check if GEMINI_API_KEY is set in .env',
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Generation Failed', {
        description: 'Failed to generate AI metadata. Please try again.',
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Render Dashboard View
  const renderDashboard = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">GPMart Studio</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your channels and schedule video uploads
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={runScheduler} 
            disabled={runningScheduler}
            className="h-10 sm:h-9 text-sm touch-manipulation"
          >
            {runningScheduler ? (
              <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 sm:mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">Run Scheduler</span>
            <span className="sm:hidden">Run</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={connectFacebook} 
            className="text-blue-600 border-blue-300 hover:bg-blue-50 h-10 sm:h-9 touch-manipulation"
          >
            <Facebook className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Facebook</span>
            <span className="sm:hidden">FB</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={connectInstagram} 
            className="text-pink-600 border-pink-300 hover:bg-pink-50 h-10 sm:h-9 touch-manipulation"
          >
            <Instagram className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Instagram</span>
            <span className="sm:hidden">IG</span>
          </Button>
          <Button 
            onClick={connectChannel}
            className="h-10 sm:h-9 touch-manipulation"
          >
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Channel</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
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
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Connected Channels</CardTitle>
          <CardDescription className="text-sm">
            Manage your YouTube channels and their upload schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No channels connected yet</p>
              <Button 
                className="mt-4 h-10 sm:h-9 touch-manipulation" 
                onClick={connectChannel}
              >
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First Channel
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[640px] sm:min-w-0">
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
                            className="touch-manipulation"
                          />
                        )}
                        <span className={`hidden sm:inline ${channel.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {channel.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChannelDetail(channel)}
                          className="h-8 sm:h-8 touch-manipulation"
                        >
                          <Settings className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Manage</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="h-8 w-8 sm:w-auto touch-manipulation"
                              disabled={deletingChannelId === channel.id}
                            >
                              {deletingChannelId === channel.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {channel.name} and all its queued videos. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto touch-manipulation">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteChannel(channel.id)}
                                disabled={deletingChannelId === channel.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto touch-manipulation"
                              >
                                {deletingChannelId === channel.id ? (
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
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
          <CardDescription className="text-sm">
            Latest scheduler actions and uploads
          </CardDescription>
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

  // Render Channel Detail View
  const renderChannelDetail = () => {
    if (!selectedChannel) return null;

    // Sort by createdAt ascending - first uploaded will be first to go to YouTube (FIFO)
    const queuedVideos = videos
      .filter(v => v.status === 'queued')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const uploadedVideos = videos.filter(v => v.status === 'uploaded');
    const failedVideos = videos.filter(v => v.status === 'failed');

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button 
            variant="ghost" 
            onClick={goBack}
            className="w-fit h-10 sm:h-9 touch-manipulation"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {selectedChannel.platform === 'instagram' ? (
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500 flex-shrink-0" />
              ) : selectedChannel.platform === 'facebook' ? (
                <Facebook className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              ) : (
                <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
              )}
              <h1 className="text-xl sm:text-2xl font-bold truncate">{selectedChannel.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              Channel ID: {selectedChannel.youtubeChannelId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {togglingChannelId === selectedChannel.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={selectedChannel.isActive}
                onCheckedChange={() => toggleChannelActive(selectedChannel)}
                className="touch-manipulation"
              />
            )}
            <span className={`hidden sm:inline ${selectedChannel.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
              {selectedChannel.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
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
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center h-auto gap-1 p-1">
            <TabsTrigger value="settings" className="text-xs sm:text-sm min-w-0 touch-manipulation">
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm min-w-0 touch-manipulation">
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-xs sm:text-sm min-w-0 touch-manipulation">
              <Video className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Queue ({queuedVideos.length})</span>
              <span className="xs:hidden">{queuedVideos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm min-w-0 touch-manipulation">
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Upload Schedule</CardTitle>
                <CardDescription className="text-sm">
                  Configure when videos should be automatically uploaded to this channel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="uploadTime" className="text-sm">Upload Time</Label>
                    <Input
                      id="uploadTime"
                      type="time"
                      value={editSettings.uploadTime}
                      onChange={(e) => setEditSettings({ ...editSettings, uploadTime: e.target.value })}
                      className="h-10 sm:h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Videos will upload within ±15 min of this time randomly
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="text-sm">Upload Frequency</Label>
                    <Select
                      value={editSettings.frequency}
                      onValueChange={(value) => setEditSettings({ ...editSettings, frequency: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-9">
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
                    <p className="text-xs text-muted-foreground">
                      How often to upload videos
                    </p>
                  </div>
                </div>

                {/* Random Delay Section */}
                <div className="space-y-4 p-3 sm:p-4 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label htmlFor="randomDelay" className="text-sm sm:text-base font-medium">Random Delay</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Add a random delay before each upload to appear more natural
                      </p>
                    </div>
                    <Switch
                      id="randomDelay"
                      checked={editSettings.randomDelayEnabled}
                      onValueChange={(value) => setEditSettings({ ...editSettings, randomDelayEnabled: value })}
                      className="touch-manipulation"
                    />
                  </div>
                  {editSettings.randomDelayEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="maxDelay" className="text-sm">Maximum Delay (minutes)</Label>
                      <Input
                        id="maxDelay"
                        type="number"
                        min={5}
                        max={180}
                        value={editSettings.randomDelayMinutes}
                        onChange={(e) => setEditSettings({ ...editSettings, randomDelayMinutes: parseInt(e.target.value) || 30 })}
                        className="h-10 sm:h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Videos will be delayed by a random amount (0 to {editSettings.randomDelayMinutes} minutes)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm font-medium">Last Upload</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(selectedChannel.lastUploadDate)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium">Next Scheduled Upload</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {selectedChannel.nextUploadTime 
                        ? formatNextUpload(new Date(selectedChannel.nextUploadTime))
                        : 'Calculating...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ±15 min random delay applied
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={updateChannelSettings}
                  disabled={savingSettings}
                  className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                >
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

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Bulk Upload Videos</CardTitle>
                <CardDescription className="text-sm">
                  Upload multiple videos to the queue. They will be published according to your schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="text-sm">Video Files</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="h-10 sm:h-9"
                  />
                  {uploadFiles && (
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {uploadFiles.length} file(s) selected
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail-upload" className="text-sm">Thumbnail Files (Optional)</Label>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setThumbnailFiles(e.target.files)}
                    className="h-10 sm:h-9"
                  />
                  {thumbnailFiles && thumbnailFiles.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {thumbnailFiles.length} thumbnail(s) selected
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload one thumbnail per video (same order), or one thumbnail for all videos
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTitle" className="text-sm">Default Title (Optional)</Label>
                    <Input
                      id="defaultTitle"
                      placeholder="My Video"
                      value={defaultTitle}
                      onChange={(e) => setDefaultTitle(e.target.value)}
                      className="h-10 sm:h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use the filename
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTags" className="text-sm">Tags (Optional)</Label>
                    <Input
                      id="defaultTags"
                      placeholder="tag1, tag2, tag3"
                      value={defaultTags}
                      onChange={(e) => setDefaultTags(e.target.value)}
                      className="h-10 sm:h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultDescription" className="text-sm">Default Description (Optional)</Label>
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
                    <Label className="text-sm">Upload Progress</Label>
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="truncate max-w-[150px] sm:max-w-[200px]">{fileName}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={uploadVideos}
                    disabled={!uploadFiles || uploadFiles.length === 0 || uploading}
                    className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
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
                  <Button
                    variant="outline"
                    onClick={() => setShowDriveBrowser(true)}
                    className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                  >
                    <HardDrive className="mr-2 h-4 w-4" />
                    Add from My Drive
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPublicDriveBrowser(true)}
                    className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
                  >
                    <Link className="mr-2 h-4 w-4" />
                    Add from Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">Video Queue</CardTitle>
                      <CardDescription className="text-sm">
                        Videos waiting to be uploaded
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSelectAll(queuedVideos)}
                        className="h-9 text-xs"
                      >
                        {selectedVideoIds.size === queuedVideos.length && queuedVideos.length > 0 ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button
                        onClick={generateAITitles}
                        disabled={generatingAI || selectedVideoIds.size === 0}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9 touch-manipulation"
                      >
                        {generatingAI ? (
                          <>
                            <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-1 sm:mr-2 h-4 w-4" />
                            <span className="text-sm">AI Generate ({selectedVideoIds.size})</span>
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
                      placeholder="e.g., Premanand Ji Maharaj, Motivational, Tech News..."
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium whitespace-nowrap">Language:</Label>
                      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border">
                        <Button
                          variant={aiLanguage === 'english' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setAiLanguage('english')}
                          className={`h-7 text-xs px-3 ${aiLanguage === 'english' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`}
                        >
                          English
                        </Button>
                        <Button
                          variant={aiLanguage === 'hindi' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setAiLanguage('hindi')}
                          className={`h-7 text-xs px-3 ${aiLanguage === 'hindi' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`}
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
                          <TableHead className="w-[60px] sm:w-[80px]">#</TableHead>
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
                              <Badge className="bg-green-600 text-xs">Next</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {video.thumbnailName ? (
                              <div 
                                className="w-14 h-9 sm:w-16 sm:h-10 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all bg-muted touch-manipulation"
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
                              <div className="w-14 h-9 sm:w-16 sm:h-10 bg-muted rounded flex items-center justify-center">
                                <FileVideo className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[120px] sm:max-w-[200px]">{video.title}</p>
                              {video.tags && (
                                <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] hidden sm:block">
                                  Tags: {video.tags}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getVideoType(video) === 'shorts' ? 'default' : 'secondary'} className="text-xs">
                              {getVideoType(video) === 'shorts' ? 'Shorts' : 'Video'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{formatFileSize(video.fileSize)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatDate(video.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewVideo(video)}
                                title="Preview Video"
                                className="h-8 w-8 sm:w-auto touch-manipulation"
                              >
                                <Play className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">Preview</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditVideo(video)}
                                title="Edit Video"
                                className="h-8 w-8 sm:w-auto touch-manipulation"
                              >
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">Edit</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteVideo(video.id)}
                                title="Delete Video"
                                className="h-8 w-8 touch-manipulation"
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

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Upload History</CardTitle>
                <CardDescription className="text-sm">
                  Previously uploaded and failed videos
                </CardDescription>
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
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
              <DialogDescription>
                Update video details before upload
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 sm:py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm">Title</Label>
                <Input
                  id="edit-title"
                  value={editVideoData.title}
                  onChange={(e) => setEditVideoData({ ...editVideoData, title: e.target.value })}
                  placeholder="Video title"
                  className="h-10 sm:h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm">Description</Label>
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
                <Label htmlFor="edit-tags" className="text-sm">Tags (comma separated)</Label>
                <Input
                  id="edit-tags"
                  value={editVideoData.tags}
                  onChange={(e) => setEditVideoData({ ...editVideoData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  className="h-10 sm:h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-thumbnail-file" className="text-sm">Thumbnail</Label>
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
                  className="h-10 sm:h-9"
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
                <p className="text-xs text-muted-foreground">
                  Upload a new image or leave empty to keep current
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingVideo(null)}
                className="w-full sm:w-auto touch-manipulation"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveVideoEdit} 
                disabled={savingVideo}
                className="w-full sm:w-auto touch-manipulation"
              >
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
          <DialogContent className="max-w-[95vw] sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Thumbnail Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center overflow-hidden">
              {previewThumbnail && (
                <img 
                  src={previewThumbnail} 
                  alt="Thumbnail preview" 
                  className="max-w-full max-h-[50vh] sm:max-h-[500px] rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setPreviewThumbnail(null)}
                className="w-full sm:w-auto touch-manipulation"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Video Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg truncate">{previewVideo?.title || 'Video Preview'}</DialogTitle>
              <DialogDescription className="text-sm">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Title</p>
                  <p className="font-medium truncate">{previewVideo?.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge variant={previewVideo ? (getVideoType(previewVideo) === 'shorts' ? 'default' : 'secondary') : 'secondary'} className="text-xs">
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
                    className="flex-1 h-10 sm:h-9 touch-manipulation"
                    onClick={() => window.open(getDriveLink(previewVideo.fileName) || '', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Drive
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setPreviewVideo(null)}
                className="w-full sm:w-auto touch-manipulation"
              >
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full">
        {view === 'dashboard' ? renderDashboard() : renderChannelDetail()}
      </div>
    </div>
  );
}
