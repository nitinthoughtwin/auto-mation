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

// Facebook SDK Type Declaration
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}
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
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';

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
  platform?: string; // youtube, instagram, facebook
  youtubeChannelId: string;
  instagramAccountId?: string;
  facebookPageId?: string;
  facebookPageName?: string;
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
  thumbnailName: string | null;
  thumbnailOriginalName: string | null;
  thumbnailSize: number | null;
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

  // Facebook SDK state
  const [fbLoaded, setFbLoaded] = useState(false);
  const [fbConnecting, setFbConnecting] = useState(false);
  const [igConnecting, setIgConnecting] = useState(false);

  // Initialize Facebook SDK
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    
    if (!appId || appId === 'your_facebook_app_id_here') {
      console.log('[Facebook] App ID not configured');
      return;
    }

    // Load Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
      setFbLoaded(true);
      console.log('[Facebook SDK] Loaded successfully');
    };

    // Inject SDK script
    (function (d, s, id) {
      var js: any, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        setFbLoaded(true);
        return;
      }
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      (fjs as any).parentNode.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');
  }, []);

  // Connect Facebook
  const connectFacebook = () => {
    if (!fbLoaded || !window.FB) {
      toast.error('Facebook SDK not loaded', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setFbConnecting(true);

    window.FB.login(
      function (response: any) {
        console.log('[Facebook] Login response:', response);
        
        if (response.authResponse) {
          // Get user profile
          window.FB.api(
            '/me',
            { fields: 'id,name,picture' },
            async function (profile: any) {
              console.log('[Facebook] Profile:', profile);
              
              try {
                // Save to database
                const res = await fetch('/api/channels/facebook-connect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: response.authResponse.accessToken,
                    userID: response.authResponse.userID,
                    name: profile.name,
                    picture: profile.picture?.data?.url,
                  })
                });

                const data = await res.json();

                if (res.ok) {
                  toast.success('Facebook Connected!', {
                    description: `${profile.name} has been connected successfully.`,
                  });
                  loadChannels();
                } else {
                  toast.error('Connection Failed', {
                    description: data.error || 'Failed to save connection',
                  });
                }
              } catch (error) {
                toast.error('Connection Error', {
                  description: 'Failed to connect Facebook account',
                });
              }
              
              setFbConnecting(false);
            }
          );
        } else {
          setFbConnecting(false);
          toast.error('Facebook Login Cancelled', {
            description: 'Please try again to connect your Facebook account.',
          });
        }
      },
      { scope: 'public_profile' }
    );
  };

  // Connect Instagram (using Facebook SDK)
  const connectInstagram = () => {
    if (!fbLoaded || !window.FB) {
      toast.error('Facebook SDK not loaded', {
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setIgConnecting(true);

    // Instagram uses Facebook OAuth with instagram_basic permission
    window.FB.login(
      function (response: any) {
        console.log('[Instagram] Login response:', response);
        
        if (response.authResponse) {
          // Get user's Facebook pages and Instagram accounts
          window.FB.api(
            '/me/accounts',
            { fields: 'id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}' },
            async function (pagesResponse: any) {
              console.log('[Instagram] Pages response:', pagesResponse);
              
              try {
                // Save Instagram accounts
                const res = await fetch('/api/channels/instagram-connect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: response.authResponse.accessToken,
                    pages: pagesResponse.data || [],
                  })
                });

                const data = await res.json();

                if (res.ok) {
                  const count = data.channels?.length || 0;
                  if (count > 0) {
                    toast.success('Instagram Connected!', {
                      description: `${count} Instagram account(s) connected successfully.`,
                    });
                  } else {
                    toast.info('No Instagram Accounts Found', {
                      description: 'Make sure your Facebook Page is connected to an Instagram Business account.',
                    });
                  }
                  loadChannels();
                } else {
                  toast.error('Connection Failed', {
                    description: data.error || 'Failed to save connection',
                  });
                }
              } catch (error) {
                toast.error('Connection Error', {
                  description: 'Failed to connect Instagram account',
                });
              }
              
              setIgConnecting(false);
            }
          );
        } else {
          setIgConnecting(false);
          toast.error('Instagram Login Cancelled', {
            description: 'Please try again to connect your Instagram account.',
          });
        }
      },
      { scope: 'public_profile,pages_show_list' }
    );
  };

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
  });

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

  // Update channel settings
  const updateChannelSettings = async () => {
    if (!selectedChannel) return;

    const loadingToast = toast.loading('Saving Settings', {
      description: 'Updating channel configuration...',
    });

    try {
      await api.channels.update(selectedChannel.id, editSettings);
      toast.dismiss(loadingToast);
      toast.success('Settings Saved', {
        description: `Upload schedule updated: ${editSettings.frequency} at ${editSettings.uploadTime}`,
      });
      loadChannelDetails(selectedChannel.id);
      loadChannels();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Save Settings', {
        description: 'Could not update channel settings. Please try again.',
      });
    }
  };

  // Toggle channel active status
  const toggleChannelActive = async (channel: Channel) => {
    const loadingToast = toast.loading(channel.isActive ? 'Pausing Channel' : 'Activating Channel', {
      description: `Updating ${channel.name} status...`,
    });
    
    try {
      await api.channels.update(channel.id, { isActive: !channel.isActive });
      toast.dismiss(loadingToast);
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
      toast.dismiss(loadingToast);
      toast.error('Failed to Update Status', {
        description: 'Could not change channel status. Please try again.',
      });
    }
  };

  // Delete channel
  const deleteChannel = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    const loadingToast = toast.loading('Disconnecting Channel', {
      description: `Removing ${channel?.name || 'Channel'} and all queued videos...`,
    });
    
    try {
      await api.channels.delete(channelId);
      toast.dismiss(loadingToast);
      toast.success('Channel Disconnected', {
        description: `${channel?.name || 'Channel'} has been removed along with all queued videos.`,
      });
      setChannels(channels.filter(c => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setView('dashboard');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to Disconnect Channel', {
        description: 'Could not remove the channel. Please try again.',
      });
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={runScheduler} disabled={runningScheduler}>
            {runningScheduler ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Scheduler
          </Button>
          <Button 
            variant="outline" 
            className="bg-[#1877F2] text-white hover:bg-[#166FE5] border-0"
            onClick={connectFacebook} 
            disabled={fbConnecting}
          >
            {fbConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Facebook className="mr-2 h-4 w-4" />
            )}
            Connect Facebook
          </Button>
          <Button 
            variant="outline" 
            className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90 border-0"
            onClick={connectInstagram} 
            disabled={igConnecting}
          >
            {igConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Instagram className="mr-2 h-4 w-4" />
            )}
            Connect Instagram
          </Button>
          <Button onClick={connectChannel}>
            <Plus className="mr-2 h-4 w-4" />
            Add YouTube Channel
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
                        {channel.platform === 'facebook' ? (
                          <Facebook className="h-4 w-4 text-[#1877F2]" />
                        ) : channel.platform === 'instagram' ? (
                          <Instagram className="h-4 w-4 text-[#E4405F]" />
                        ) : (
                          <Youtube className="h-4 w-4 text-red-500" />
                        )}
                        {channel.name}
                        {channel.platform && channel.platform !== 'youtube' && (
                          <Badge variant="outline" className="text-xs">
                            {channel.platform}
                          </Badge>
                        )}
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

    // Sort by createdAt ascending - first uploaded will be first to go to YouTube (FIFO)
    const queuedVideos = videos
      .filter(v => v.status === 'queued')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
                      Videos will upload within ±15 min of this time randomly (e.g., 6:00 PM may upload at 5:52, 6:03, 6:12, etc.)
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
                    <p className="text-xs text-muted-foreground mt-1">
                      ±15 min random delay applied
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
                        <TableHead className="w-[80px]">#</TableHead>
                        <TableHead>Thumbnail</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queuedVideos.map((video, index) => (
                        <TableRow key={video.id} className={index === 0 ? 'bg-green-50 dark:bg-green-950' : ''}>
                          <TableCell>
                            {index === 0 ? (
                              <Badge className="bg-green-600">Next</Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
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
                            <div>
                              <p className="font-medium">{video.title}</p>
                              {video.tags && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
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
                          <TableCell>{formatFileSize(video.fileSize)}</TableCell>
                          <TableCell>{formatDate(video.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewVideo(video)}
                                title="Preview Video"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditVideo(video)}
                                title="Edit Video"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteVideo(video.id)}
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

        {/* Edit Video Dialog */}
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
              <DialogDescription>
                Update video details before upload
              </DialogDescription>
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
                  rows={4}
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
                <p className="text-xs text-muted-foreground">
                  Upload a new image or leave empty to keep current
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingVideo(null)}>
                Cancel
              </Button>
              <Button onClick={saveVideoEdit} disabled={savingVideo}>
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
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Thumbnail Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {previewThumbnail && (
                <img 
                  src={previewThumbnail} 
                  alt="Thumbnail preview" 
                  className="max-w-full max-h-[500px] rounded-lg"
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
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>{previewVideo?.title || 'Video Preview'}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Title</p>
                  <p className="font-medium">{previewVideo?.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <Badge variant={previewVideo ? (getVideoType(previewVideo) === 'shorts' ? 'default' : 'secondary') : 'secondary'}>
                    {previewVideo ? (getVideoType(previewVideo) === 'shorts' ? 'Shorts' : 'Video') : 'Video'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="truncate">{previewVideo?.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tags</p>
                  <p className="truncate">{previewVideo?.tags || 'No tags'}</p>
                </div>
              </div>

              {/* Open in Drive Link */}
              {previewVideo && getDriveLink(previewVideo.fileName) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
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