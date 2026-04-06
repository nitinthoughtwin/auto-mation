'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  FolderOpen,
  Loader2,
  CheckCircle2,
  Plus,
  Play,
  ChevronLeft,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import DriveThumbnail from '@/components/VideoThumbnail';

interface VideoCategory {
  id: string;
  name: string;
  description: string | null;
  videos: LibraryVideo[];
}

interface LibraryVideo {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  size: number | null;
  thumbnailLink: string | null;
  webViewLink: string | null;
  downloadUrl: string | null;
  createdTime: string | null;
  addedToQueue: boolean;
}

interface Channel {
  id: string;
  name: string;
}

interface VideoLibraryBrowserProps {
  open: boolean;
  onClose: () => void;
  channels?: Channel[];
  onVideosAdded: () => void;
  defaultChannelId?: string;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// Video card with selection, preview, and thumbnail
const VideoThumbnail = ({ video, isSelected, onClick, onPreview }: {
  video: LibraryVideo;
  isSelected: boolean;
  onClick: () => void;
  onPreview: () => void;
}) => {
  return (
    <div
      className={`relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer transition-all touch-manipulation ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      }`}
      onClick={onPreview}
    >
      {/* Thumbnail with loading skeleton + fallback */}
      <DriveThumbnail
        driveFileId={video.driveFileId}
        thumbnailUrl={video.thumbnailLink}
        name={video.name}
        className="w-full h-full"
      />

      {/* Play icon hint (center, subtle) */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors pointer-events-none">
        <div className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="h-4 w-4 text-white ml-0.5" />
        </div>
      </div>

      {/* Circle select button — always visible top-left */}
      <button
        className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow transition-all touch-manipulation z-10 ${
          isSelected
            ? 'bg-blue-500 border-blue-500'
            : 'bg-black/40 border-white/70 hover:bg-black/60'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
      </button>

      {/* Status badges */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {video.addedToQueue && (
          <Badge className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
            Added
          </Badge>
        )}
        {video.size && (
          <Badge variant="secondary" className="text-[10px] sm:text-xs bg-black/60 text-white border-0 px-1.5 sm:px-2">
            {formatFileSize(video.size)}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default function VideoLibraryBrowser({
  open,
  onClose,
  channels = [],
  onVideosAdded,
  defaultChannelId,
}: VideoLibraryBrowserProps) {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<LibraryVideo | null>(null);
  const [remainingSlots, setRemainingSlots] = useState<number | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      setSelectedCategory(null);
      setSelectedVideos(new Set());
      setSelectedChannelId(defaultChannelId || (channels && channels.length > 0 ? channels[0].id : ''));
      // Fetch remaining video slots for this billing period
      fetch('/api/usage')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.usage?.videos) {
            setRemainingSlots(data.usage.videos.limit - data.usage.videos.used);
          } else {
            setRemainingSlots(null); // unknown — backend will enforce
          }
        })
        .catch(() => setRemainingSlots(null));
    }
  }, [open, channels, defaultChannelId]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/video-library');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to Load Library', {
        description: 'Could not fetch video library categories.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCategory = (category: VideoCategory) => {
    setSelectedCategory(category);
    setSelectedVideos(new Set());
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedVideos(new Set());
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const selectAllVideos = () => {
    if (!selectedCategory) return;
    const allVideoIds = selectedCategory.videos.map(v => v.id);
    setSelectedVideos(new Set(allVideoIds));
  };

  const deselectAll = () => {
    setSelectedVideos(new Set());
  };

  const handleAddToQueue = async () => {
    if (!selectedChannelId) {
      toast.error('No Channel Selected', {
        description: 'Please select a channel to add videos to.'
      });
      return;
    }

    if (selectedVideos.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select at least one video to add.'
      });
      return;
    }

    // Pre-check plan limit before hitting the API
    if (remainingSlots !== null) {
      if (remainingSlots <= 0) {
        toast.error('Video Limit Reached', {
          description: 'You have used all your video slots this month. Please upgrade your plan.'
        });
        return;
      }
      if (selectedVideos.size > remainingSlots) {
        toast.error(`Too Many Videos Selected (${selectedVideos.size})`, {
          description: `You only have ${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining this month. Please deselect some videos.`
        });
        return;
      }
    }

    setAdding(true);

    try {
      const res = await fetch('/api/video-library/add-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          videoIds: Array.from(selectedVideos)
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-generate titles using category name as topic (before closing dialog)
        if (data.videos?.length > 0 && selectedCategory) {
          setGeneratingTitles(true);
          try {
            await fetch('/api/ai/generate-for-videos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channelId: selectedChannelId,
                videos: data.videos.map((v: { id: string; title: string }) => ({ id: v.id, title: v.title })),
                topic: selectedCategory.name,
                language: 'english',
              })
            });
            toast.success('Videos Added to Queue', {
              description: `${data.created} video(s) added with AI-generated titles.`
            });
          } catch {
            toast.success('Videos Added to Queue', {
              description: `${data.created} video(s) added successfully.`
            });
          } finally {
            setGeneratingTitles(false);
          }
        } else {
          toast.success('Videos Added to Queue', {
            description: `${data.created} video(s) added successfully.`
          });
        }

        onVideosAdded();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to add videos');
      }
    } catch (error: any) {
      toast.error('Failed to Add Videos', {
        description: error.message || 'Please try again.'
      });
    } finally {
      setAdding(false);
    }
  };

  const getVideoPreviewUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open && !previewVideo} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header - Fixed */}
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FolderOpen className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <span className="truncate">
                    {selectedCategory ? selectedCategory.name : 'Video Library'}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  {selectedCategory
                    ? `${selectedCategory.videos.length} videos available`
                    : 'Browse pre-added videos by category'}
                </DialogDescription>
              </div>
              {/* <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button> */}
            </div>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedCategory ? (
              // Videos View
              <div className="p-3 sm:p-4">
                {/* Navigation & Actions */}
                <div className="flex flex-col gap-3 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToCategories}
                    className="self-start"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Categories
                  </Button>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedVideos.size > 0 && (
                      <Badge variant="secondary" className={`${remainingSlots !== null && selectedVideos.size > remainingSlots ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                        {selectedVideos.size} selected
                      </Badge>
                    )}
                    {remainingSlots !== null && (
                      <Badge variant="outline" className={remainingSlots <= 0 ? 'text-red-500 border-red-300' : 'text-muted-foreground'}>
                        {remainingSlots <= 0 ? 'No slots left' : `${remainingSlots} slots left`}
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectedVideos.size > 0 ? deselectAll : selectAllVideos}
                    >
                      {selectedVideos.size > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>

                {/* Videos Grid */}
                {selectedCategory.videos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No videos in this category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {selectedCategory.videos.map((video) => (
                      <div
                        key={video.id}
                        className="group"
                      >
                        <VideoThumbnail
                          video={video}
                          isSelected={selectedVideos.has(video.id)}
                          onClick={() => toggleVideoSelection(video.id)}
                          onPreview={() => setPreviewVideo(video)}
                        />
                        <p className="mt-1.5 text-xs sm:text-sm font-medium truncate px-0.5" title={video.name}>
                          {video.name.replace(/\.[^/.]+$/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Categories View
              <div className="p-3 sm:p-4">
                {categories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No video categories available</p>
                    <p className="text-sm mt-1">Add video categories to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((category) => (
                      <Card
                        key={category.id}
                        className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all overflow-hidden"
                        onClick={() => handleOpenCategory(category)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                              <FolderOpen className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base truncate">
                                {category.name}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {category.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Video className="h-3 w-3" />
                                <span>{category.videos?.length || 0} videos</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="border-t p-3 sm:p-4 flex-shrink-0 bg-background">
            {selectedCategory ? (
              // Videos footer with channel selection
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels && channels.length > 0 ? (
                      channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No channels available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddToQueue}
                  disabled={selectedVideos.size === 0 || adding || generatingTitles || !selectedChannelId}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                >
                  {generatingTitles ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Titles...
                    </>
                  ) : adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add {selectedVideos.size} Video{selectedVideos.size !== 1 ? 's' : ''} to Queue
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Categories footer
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg truncate pr-4">
                {previewVideo?.name.replace(/\.[^/.]+$/, '')}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewVideo(null)}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="aspect-video bg-black">
            {previewVideo && (
              <iframe
                src={getVideoPreviewUrl(previewVideo.driveFileId)}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          <div className="p-3 sm:p-4 border-t flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreviewVideo(null)} className="flex-1 sm:flex-none">
              Close
            </Button>
            {previewVideo?.webViewLink && (
              <Button variant="outline" asChild className="flex-1 sm:flex-none">
                <a href={previewVideo.webViewLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Drive
                </a>
              </Button>
            )}
            <Button
              onClick={() => {
                if (previewVideo) {
                  toggleVideoSelection(previewVideo.id);
                  setPreviewVideo(null);
                }
              }}
              disabled={previewVideo ? selectedVideos.has(previewVideo.id) : false}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              {previewVideo && selectedVideos.has(previewVideo.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Selected
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Select Video
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}