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
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Link as LinkIcon,
  Sparkles,
  Wand2,
  TrendingUp,
  Zap,
  ArrowRight,
  LogOut,
  User,
  LayoutDashboard,
  CreditCard,
  Bell,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize, formatDate, formatNextUpload } from '@/lib/utils-shared';
import DriveVideoBrowser from '@/components/DriveVideoBrowser';
import PublicDriveBrowser from '@/components/PublicDriveBrowser';
import UsageDashboard from '@/components/UsageDashboard';
import Link from 'next/link';

// Helper to get Google Drive thumbnail URL from file ID or URL
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

// Helper to get Google Drive video URL for preview
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

// Sidebar Navigation Component
function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'channels', label: 'Channels', icon: Youtube },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'ai', label: 'AI Tools', icon: Sparkles },
  ];
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-60 bg-gradient-to-b from-slate-900 to-slate-800 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">GPMart Studio</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                  ${activeTab === item.id 
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-white border border-red-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Link href="/billing" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition">
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
              <Link href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: 'red' | 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    red: 'from-red-500 to-rose-600',
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-violet-600',
    orange: 'from-orange-500 to-amber-600',
  };
  
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5`} />
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-sm font-medium text-gray-500">{title}</p>
            <p className="text-xl sm:text-3xl font-bold mt-1">{value}</p>
            {trend && (
              <p className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Channel Card Component
function ChannelCard({ channel, onManage, onDelete, onToggle, isToggling, isDeleting }: {
  channel: Channel;
  onManage: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
              {channel.platform === 'instagram' ? (
                <Instagram className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              ) : channel.platform === 'facebook' ? (
                <Facebook className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              ) : (
                <Youtube className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base truncate max-w-[140px] sm:max-w-[200px]">{channel.name}</h3>
              <p className="text-[10px] sm:text-xs text-gray-500">{channel.queuedVideos || 0} videos in queue</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <Switch
                  checked={channel.isActive}
                  onCheckedChange={onToggle}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                />
                <span className="text-xs text-gray-500 hidden sm:inline">{channel.isActive ? 'On' : 'Off'}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <p className="text-lg sm:text-2xl font-bold text-blue-600">{channel.stats?.queued || 0}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Queued</p>
          </div>
          <div className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 dark:bg-green-900/20">
            <p className="text-lg sm:text-2xl font-bold text-green-600">{channel.stats?.uploaded || 0}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Uploaded</p>
          </div>
          <div className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-900/20">
            <p className="text-lg sm:text-2xl font-bold text-red-600">{channel.stats?.failed || 0}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Failed</p>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6 flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-1 sm:gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{channel.uploadTime}</span>
            <Badge variant="outline" className="text-[10px] sm:text-xs">{channel.frequency}</Badge>
          </div>
          <Badge variant={channel.isActive ? 'default' : 'secondary'} className={`text-[10px] sm:text-xs ${channel.isActive ? 'bg-green-500' : ''}`}>
            {channel.isActive ? 'Active' : 'Paused'}
          </Badge>
        </div>
        
        <div className="mt-3 sm:mt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
            onClick={onManage}
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Manage
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />}
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
                <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Item Component
function ActivityItem({ log }: { log: SchedulerLog }) {
  const isSuccess = log.status === 'success';
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {isSuccess ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{log.message}</p>
        <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function NewDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [schedulerLogs, setSchedulerLogs] = useState<SchedulerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);
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
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Channel settings state
  const [editSettings, setEditSettings] = useState({
    uploadTime: '',
    frequency: '',
    randomDelayEnabled: false,
    randomDelayMinutes: 30,
  });
  const [savingSettings, setSavingSettings] = useState(false);

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
          randomDelayEnabled: data.channel.randomDelayMinutes ? true : false,
          randomDelayMinutes: data.channel.randomDelayMinutes || 30,
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
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadChannels();
      loadSchedulerLogs();
    }
  }, [status, router, loadChannels]);

  // Initialize Facebook SDK
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
      toast.success('Channel Connected!');
      loadChannels();
      window.history.replaceState({}, '', '/dashboard');
    }

    if (error) {
      toast.error(`Connection Failed: ${error}`);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [loadChannels]);

  // Connect new channel
  const connectChannel = () => {
    window.location.href = '/api/auth/youtube';
  };

  // Connect Facebook page
  const connectFacebook = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please refresh.');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        window.FB?.api('/me/accounts', 'GET', { fields: 'id,name,access_token' }, (pagesResponse) => {
          if (pagesResponse.data && pagesResponse.data.length > 0) {
            toast.success(`Found ${pagesResponse.data.length} Facebook page(s).`);
          } else {
            toast.error('No Facebook Pages found.');
          }
        });
      } else {
        toast.error('Facebook login cancelled.');
      }
    }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts' });
  };

  // Connect Instagram
  const connectInstagram = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please refresh.');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        window.FB?.api('/me/accounts', 'GET', { fields: 'id,name,access_token,instagram_business_account' }, (pagesResponse) => {
          if (pagesResponse.data) {
            const igAccounts = pagesResponse.data.filter((page: any) => page.instagram_business_account);
            if (igAccounts.length > 0) {
              toast.success(`Found ${igAccounts.length} Instagram account(s).`);
            } else {
              toast.error('No Instagram Business accounts found.');
            }
          }
        });
      } else {
        toast.error('Instagram connection cancelled.');
      }
    }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish' });
  };

  // Toggle channel active status
  const toggleChannelActive = async (channel: Channel) => {
    setTogglingChannelId(channel.id);
    try {
      await api.channels.update(channel.id, { isActive: !channel.isActive });
      toast.success(channel.isActive ? 'Channel Paused' : 'Channel Activated');
      loadChannels();
      if (selectedChannel?.id === channel.id) {
        loadChannelDetails(channel.id);
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setTogglingChannelId(null);
    }
  };

  // Delete channel
  const deleteChannel = async (channelId: string) => {
    setDeletingChannelId(channelId);
    try {
      await api.channels.delete(channelId);
      toast.success('Channel Disconnected');
      setChannels(channels.filter(c => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setActiveTab('dashboard');
      }
    } catch (error) {
      toast.error('Failed to disconnect channel');
    } finally {
      setDeletingChannelId(null);
    }
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
      toast.success('Settings saved');
      loadChannelDetails(selectedChannel.id);
      loadChannels();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Direct upload to Google Drive
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
          'Authorization': `Bearer ${accessToken}`,
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
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    const result = await uploadRes.json();
    const fileId = result.id;

    // Make file public
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

  // Upload videos
  const uploadVideos = async () => {
    if (!selectedChannel || !uploadFiles || uploadFiles.length === 0) {
      toast.error('No files selected');
      return;
    }

    setUploading(true);
    setUploadProgress({});
    
    const loadingToast = toast.loading(`Uploading ${uploadFiles.length} file(s)...`);
    
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

      // Upload thumbnails first
      const thumbnailData: { url: string; fileId: string; name: string; size: number }[] = [];
      if (thumbnailFiles && thumbnailFiles.length > 0) {
        for (let i = 0; i < thumbnailFiles.length; i++) {
          const thumbFile = thumbnailFiles[i];
          try {
            setUploadProgress(prev => ({ ...prev, [`thumb-${thumbFile.name}`]: 50 }));
            const result = await directUploadToGoogleDrive(thumbFile, accessToken);
            thumbnailData.push({ 
              url: result.url, 
              fileId: result.id,
              name: thumbFile.name, 
              size: thumbFile.size 
            });
            setUploadProgress(prev => ({ ...prev, [`thumb-${thumbFile.name}`]: 100 }));
          } catch (error: any) {
            errors.push(`Thumbnail ${thumbFile.name}: ${error.message}`);
          }
        }
      }

      // Upload videos
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
          const result = await directUploadToGoogleDrive(file, accessToken);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
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
          errors.push(`${file.name}: ${error.message}`);
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

      toast.dismiss(loadingToast);
      if (uploadedVideos.length > 0) {
        toast.success(`${uploadedVideos.length} video(s) uploaded`);
        setUploadFiles(null);
        setThumbnailFiles(null);
        setDefaultTitle('');
        setDefaultDescription('');
        setDefaultTags('');
        loadChannelDetails(selectedChannel.id);
        loadChannels();
      }
      if (errors.length > 0) {
        toast.error('Some uploads failed');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    const loadingToast = toast.loading('Deleting video...');
    try {
      await api.videos.delete(videoId);
      toast.dismiss(loadingToast);
      toast.success('Video deleted');
      setVideos(videos.filter(v => v.id !== videoId));
      loadChannels();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete video');
    }
  };

  // Save video edits
  const saveVideoEdit = async () => {
    if (!editingVideo) return;
    setSavingVideo(true);
    const loadingToast = toast.loading('Saving changes...');
    
    try {
      let thumbnailUrl = editingVideo.thumbnailName;
      let fileId = undefined;
      
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
        toast.success('Video updated');
        setEditingVideo(null);
        setEditThumbnailFile(null);
        if (selectedChannel) loadChannelDetails(selectedChannel.id);
        loadChannels();
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error || 'Failed to update');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to update video');
    } finally {
      setSavingVideo(false);
    }
  };

  // Run scheduler
  const runScheduler = async () => {
    setRunningScheduler(true);
    try {
      const result = await api.scheduler.run();
      if (result.success) {
        toast.success('Scheduler completed');
        loadSchedulerLogs();
        loadChannels();
        if (selectedChannel) loadChannelDetails(selectedChannel.id);
      } else {
        toast.error(result.error || 'Scheduler failed');
      }
    } catch (error) {
      toast.error('Failed to run scheduler');
    } finally {
      setRunningScheduler(false);
    }
  };

  // Open channel detail
  const openChannelDetail = (channel: Channel) => {
    setSelectedChannel(channel);
    setActiveTab('channel');
    loadChannelDetails(channel.id);
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

  // Generate AI titles
  const generateAITitles = async () => {
    if (!selectedChannel) return;
    
    const queuedVideos = videos.filter(v => v.status === 'queued');
    const selectedVideos = queuedVideos.filter(v => selectedVideoIds.has(v.id));
    
    if (selectedVideos.length === 0) {
      toast.error('No videos selected');
      return;
    }

    setGeneratingAI(true);
    const loadingToast = toast.loading(`Generating AI metadata for ${selectedVideos.length} video(s)...`);

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
        toast.success(`Updated ${result.updated} video(s) with AI metadata`);
        setSelectedVideoIds(new Set());
        loadChannelDetails(selectedChannel.id);
        loadChannels();
      } else {
        toast.warning(result.error || 'No videos updated');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Generation failed');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-red-500" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalQueued = channels.reduce((sum, c) => sum + (c.queuedVideos || 0), 0);
  const activeChannels = channels.filter(c => c.isActive).length;
  const queuedVideos = videos.filter(v => v.status === 'queued');
  const uploadedVideos = videos.filter(v => v.status === 'uploaded');
  const failedVideos = videos.filter(v => v.status === 'failed');

  // Render Dashboard Tab
  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Channels" value={channels.length} icon={Youtube} color="red" />
        <StatsCard title="Active Channels" value={activeChannels} icon={CheckCircle} color="green" />
        <StatsCard title="Videos in Queue" value={totalQueued} icon={Video} color="blue" />
        <StatsCard
          title="Uploads Today"
          value={schedulerLogs.filter(l => l.status === 'success' && new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
          icon={TrendingUp}
          color="purple"
        />
      </div>
      
      {/* Quick Actions */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Quick Actions</h3>
              <p className="text-white/80 mt-1 text-sm sm:text-base">Manage your content efficiently</p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {/* Run Scheduler - Hidden for now */}
              {/* <Button variant="secondary" onClick={runScheduler} disabled={runningScheduler}>
                <Zap className="h-4 w-4 mr-2" />
                Run Scheduler
              </Button> */}
              {/* Facebook - Hidden for now */}
              {/* <Button variant="outline" onClick={connectFacebook} className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700">
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button> */}
              {/* Instagram - Hidden for now */}
              {/* <Button variant="outline" onClick={connectInstagram} className="bg-pink-600 text-white border-pink-600 hover:bg-pink-700">
                <Instagram className="h-4 w-4 mr-2" />
                Instagram
              </Button> */}
              <Button variant="secondary" onClick={connectChannel} className="text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                Add Channel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Dashboard */}
      <UsageDashboard />
      
      {/* Channels Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Channels</h2>
          {channels.length > 0 && (
            <Button variant="ghost" onClick={connectChannel}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          )}
        </div>
        
        {channels.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center mx-auto mb-6">
                <Youtube className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Channels Connected</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Connect your YouTube channel to start scheduling and automating your video uploads.
              </p>
              <Button 
                onClick={connectChannel}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onManage={() => openChannelDetail(channel)}
                onDelete={() => deleteChannel(channel.id)}
                onToggle={() => toggleChannelActive(channel)}
                isToggling={togglingChannelId === channel.id}
                isDeleting={deletingChannelId === channel.id}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Activity</h2>
        </div>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {schedulerLogs.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No activity yet. Run the scheduler to see logs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedulerLogs.slice(0, 5).map((log) => (
                  <ActivityItem key={log.id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Channel Detail Tab
  const renderChannelDetailTab = () => {
    if (!selectedChannel) return null;

    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Mobile Friendly */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedChannel(null); setActiveTab('dashboard'); }} className="w-fit h-8 text-xs sm:text-sm">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                {selectedChannel.platform === 'instagram' ? (
                  <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : selectedChannel.platform === 'facebook' ? (
                  <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold truncate max-w-[150px] sm:max-w-none">{selectedChannel.name}</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">ID: {selectedChannel.youtubeChannelId}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-auto">
              <Switch
                checked={selectedChannel.isActive}
                onCheckedChange={() => toggleChannelActive(selectedChannel)}
              />
              <Badge variant={selectedChannel.isActive ? 'default' : 'secondary'} className={`text-[10px] sm:text-xs ${selectedChannel.isActive ? 'bg-green-500' : ''}`}>
                {selectedChannel.isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total" value={selectedChannel.stats?.total || videos.length} icon={Video} color="blue" />
          <StatsCard title="Queue" value={selectedChannel.stats?.queued || queuedVideos.length} icon={Clock} color="green" />
          <StatsCard title="Uploaded" value={selectedChannel.stats?.uploaded || uploadedVideos.length} icon={CheckCircle} color="purple" />
          <StatsCard title="Failed" value={selectedChannel.stats?.failed || failedVideos.length} icon={XCircle} color="red" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-3 sm:space-y-4">
          <TabsList className="bg-white dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl w-full overflow-x-auto flex-nowrap flex gap-0.5 sm:gap-1">
            <TabsTrigger value="settings" className="rounded-md text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"><Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" /><span className="hidden sm:inline">Settings</span></TabsTrigger>
            <TabsTrigger value="upload" className="rounded-md text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"><Upload className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" /><span className="hidden sm:inline">Upload</span></TabsTrigger>
            <TabsTrigger value="queue" className="rounded-md text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"><Video className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" /><span className="hidden sm:inline">Queue ({queuedVideos.length})</span><span className="sm:hidden">({queuedVideos.length})</span></TabsTrigger>
            <TabsTrigger value="ai" className="rounded-md text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"><Sparkles className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" /><span className="hidden sm:inline">AI Tools</span></TabsTrigger>
            <TabsTrigger value="history" className="rounded-md text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"><Clock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" /><span className="hidden sm:inline">History</span></TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Upload Schedule</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Configure when videos should be uploaded</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Upload Time</Label>
                    <Input
                      type="time"
                      value={editSettings.uploadTime}
                      onChange={(e) => setEditSettings({ ...editSettings, uploadTime: e.target.value })}
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500">Videos will upload around this time</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Upload Frequency</Label>
                    <Select
                      value={editSettings.frequency}
                      onValueChange={(value) => setEditSettings({ ...editSettings, frequency: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="every6h" className="text-xs sm:text-sm">Every 6 Hours</SelectItem>
                        <SelectItem value="every12h" className="text-xs sm:text-sm">Every 12 Hours</SelectItem>
                        <SelectItem value="daily" className="text-xs sm:text-sm">Daily</SelectItem>
                        <SelectItem value="alternate" className="text-xs sm:text-sm">Every Other Day</SelectItem>
                        <SelectItem value="every3days" className="text-xs sm:text-sm">Every 3 Days</SelectItem>
                        <SelectItem value="weekly" className="text-xs sm:text-sm">Weekly</SelectItem>
                        <SelectItem value="biweekly" className="text-xs sm:text-sm">Bi-Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Random Delay */}
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs sm:text-sm">Random Delay</Label>
                      <p className="text-[10px] sm:text-xs text-gray-500">Add randomness to appear more natural</p>
                    </div>
                    <Switch
                      checked={editSettings.randomDelayEnabled}
                      onCheckedChange={(checked) => setEditSettings({ ...editSettings, randomDelayEnabled: checked })}
                    />
                  </div>
                  {editSettings.randomDelayEnabled && (
                    <div className="mt-3 sm:mt-4 space-y-1.5">
                      <Label className="text-xs sm:text-sm">Maximum Delay (minutes)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={180}
                        value={editSettings.randomDelayMinutes}
                        onChange={(e) => setEditSettings({ ...editSettings, randomDelayMinutes: parseInt(e.target.value) || 30 })}
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  )}
                </div>

                <Button onClick={updateChannelSettings} disabled={savingSettings} size="sm" className="bg-gradient-to-r from-red-500 to-orange-500 h-8 sm:h-10 text-xs sm:text-sm">
                  {savingSettings ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" /> : null}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Upload Videos</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Add new videos to your upload queue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <h3 className="font-medium mb-1 text-sm sm:text-base">Select Video Files</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">MP4, MOV, AVI, MKV supported</p>
                  <Input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="text-[10px] sm:text-xs"
                  />
                </div>

                {/* Thumbnail Upload */}
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs text-center mb-1.5 sm:mb-2">Thumbnails (optional)</p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setThumbnailFiles(e.target.files)}
                    className="text-[10px] sm:text-xs"
                  />
                </div>

                {/* Default Metadata */}
                <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Default Title</Label>
                    <Input
                      value={defaultTitle}
                      onChange={(e) => setDefaultTitle(e.target.value)}
                      placeholder="Enter default title..."
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Tags</Label>
                    <Input
                      value={defaultTags}
                      onChange={(e) => setDefaultTags(e.target.value)}
                      placeholder="tag1, tag2"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Description</Label>
                  <Textarea
                    value={defaultDescription}
                    onChange={(e) => setDefaultDescription(e.target.value)}
                    placeholder="Enter default description..."
                    rows={2}
                    className="text-xs sm:text-sm"
                  />
                </div>

                {/* Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(uploadProgress).map(([name, progress]) => (
                      <div key={name}>
                        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                          <span className="truncate">{name}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 sm:h-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={uploadVideos} disabled={uploading || !uploadFiles} size="sm" className="bg-gradient-to-r from-red-500 to-orange-500 h-8 sm:h-9 text-[10px] sm:text-xs">
                    {uploading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" /> : <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                    Upload Videos
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDriveBrowser(true)} className="h-8 sm:h-9 text-[10px] sm:text-xs">
                    <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Import from Drive
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowPublicDriveBrowser(true)} className="h-8 sm:h-9 text-[10px] sm:text-xs">
                    <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Public Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Video Queue</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Videos waiting to be uploaded</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {queuedVideos.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Video className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-500 text-xs sm:text-sm">No videos in queue</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {queuedVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-slate-800">
                        <div className="w-14 h-10 sm:w-16 sm:h-12 rounded bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {video.thumbnailDriveId ? (
                            <img 
                              src={getThumbnailUrl(video.thumbnailDriveId) || ''} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileVideo className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{video.title}</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5">{video.status}</Badge>
                            {video.fileSize && <span>{formatFileSize(video.fileSize)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setPreviewVideo(video)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingVideo(video);
                            setEditVideoData({
                              title: video.title,
                              description: video.description || '',
                              tags: video.tags || '',
                            });
                          }} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteVideo(video.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tools Tab */}
          <TabsContent value="ai">
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  AI Title Generation
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Generate titles and descriptions using AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Topic (optional)</Label>
                    <Input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g., Gaming, Cooking..."
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Language</Label>
                    <Select value={aiLanguage} onValueChange={(v) => setAiLanguage(v as 'english' | 'hindi')}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english" className="text-xs sm:text-sm">English</SelectItem>
                        <SelectItem value="hindi" className="text-xs sm:text-sm">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {queuedVideos.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Select Videos</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (selectedVideoIds.size === queuedVideos.length) {
                            setSelectedVideoIds(new Set());
                          } else {
                            setSelectedVideoIds(new Set(queuedVideos.map(v => v.id)));
                          }
                        }}
                        className="h-7 text-[10px] sm:text-xs"
                      >
                        {selectedVideoIds.size === queuedVideos.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="grid gap-1.5 sm:gap-2 max-h-48 sm:max-h-64 overflow-y-auto">
                      {queuedVideos.map((video) => (
                        <div 
                          key={video.id}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg cursor-pointer transition ${
                            selectedVideoIds.has(video.id) 
                              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200' 
                              : 'bg-gray-50 dark:bg-slate-800'
                          }`}
                          onClick={() => toggleVideoSelection(video.id)}
                        >
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            selectedVideoIds.has(video.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                          }`}>
                            {selectedVideoIds.has(video.id) && <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />}
                          </div>
                          <span className="text-xs sm:text-sm truncate">{video.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={generateAITitles} 
                  disabled={generatingAI || selectedVideoIds.size === 0}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-8 sm:h-9 text-[10px] sm:text-xs"
                >
                  {generatingAI ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" /> : <Wand2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                  Generate ({selectedVideoIds.size})
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-green-600 text-sm sm:text-base">Uploaded</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {uploadedVideos.length === 0 ? (
                    <p className="text-center text-gray-500 py-3 sm:py-4 text-xs sm:text-sm">No uploaded videos yet</p>
                  ) : (
                    <div className="space-y-2">
                      {uploadedVideos.slice(0, 10).map((video) => (
                        <div key={video.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{video.title}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{formatDate(video.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-red-600 text-sm sm:text-base">Failed</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {failedVideos.length === 0 ? (
                    <p className="text-center text-gray-500 py-3 sm:py-4 text-xs sm:text-sm">No failed uploads</p>
                  ) : (
                    <div className="space-y-2">
                      {failedVideos.slice(0, 10).map((video) => (
                        <div key={video.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{video.title}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{video.error || 'Unknown error'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="lg:ml-60">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {activeTab === 'channel' ? selectedChannel?.name : 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  {activeTab === 'channel' ? 'Manage your channel' : 'Welcome back!'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Run Scheduler Button - Hidden for now */}
              {/* <Button 
                variant="outline" 
                onClick={runScheduler} 
                disabled={runningScheduler}
                className="hidden sm:flex"
              >
                {runningScheduler ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Scheduler
              </Button> */}
              {activeTab !== 'channel' && (
                <Button onClick={connectChannel} className="bg-gradient-to-r from-red-500 to-orange-500">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Channel</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-2 sm:p-4">
          {activeTab === 'dashboard' && renderDashboardTab()}
          {activeTab === 'channel' && renderChannelDetailTab()}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              {channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onManage={() => openChannelDetail(channel)}
                  onDelete={() => deleteChannel(channel.id)}
                  onToggle={() => toggleChannelActive(channel)}
                  isToggling={togglingChannelId === channel.id}
                  isDeleting={deletingChannelId === channel.id}
                />
              ))}
            </div>
          )}
          {(activeTab === 'uploads' || activeTab === 'schedule' || activeTab === 'ai') && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <h3 className="text-xl font-bold mb-2">Select a Channel</h3>
                <p className="text-gray-500">Choose a channel from the dashboard to access this feature.</p>
                <Button className="mt-4" onClick={() => setActiveTab('dashboard')}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Drive Browser Dialog */}
      <Dialog open={showDriveBrowser} onOpenChange={setShowDriveBrowser}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Google Drive</DialogTitle>
            <DialogDescription>Select videos to import from your Google Drive</DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <DriveVideoBrowser
              channelId={selectedChannel.id}
              onImportComplete={() => {
                setShowDriveBrowser(false);
                loadChannelDetails(selectedChannel.id);
                loadChannels();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Public Drive Browser Dialog */}
      <Dialog open={showPublicDriveBrowser} onOpenChange={setShowPublicDriveBrowser}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Public Drive Link</DialogTitle>
            <DialogDescription>Enter a public Google Drive folder link</DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <PublicDriveBrowser
              channelId={selectedChannel.id}
              onImportComplete={() => {
                setShowPublicDriveBrowser(false);
                loadChannelDetails(selectedChannel.id);
                loadChannels();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
          </DialogHeader>
          {previewVideo?.driveFileId && (
            <div className="aspect-video">
              <iframe
                src={getVideoUrl(previewVideo.driveFileId) || ''}
                className="w-full h-full rounded-lg"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVideo(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Edit Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>Update video details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editVideoData.title}
                onChange={(e) => setEditVideoData({ ...editVideoData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editVideoData.description}
                onChange={(e) => setEditVideoData({ ...editVideoData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={editVideoData.tags}
                onChange={(e) => setEditVideoData({ ...editVideoData, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setEditThumbnailFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVideo(null)}>Cancel</Button>
            <Button onClick={saveVideoEdit} disabled={savingVideo} className="bg-gradient-to-r from-red-500 to-orange-500">
              {savingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
