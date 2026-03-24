'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from 'lucide-react';
import { toast } from 'sonner';

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
  channels: Channel[];
  onVideosAdded: () => void;
}

// Get thumbnail URL with fallback
const getThumbnailUrl = (video: LibraryVideo): string => {
  // Use stored thumbnail or generate Google Drive thumbnail URL
  if (video.thumbnailLink) {
    return video.thumbnailLink;
  }
  // Google Drive thumbnail URL format
  if (video.driveFileId) {
    return `https://lh3.googleusercontent.com/d/${video.driveFileId}=w300-h200-c`;
  }
  return '';
};

// Default video thumbnail component
const DefaultThumbnail = ({ name }: { name: string }) => {
  // Generate a color based on the video name
  const colors = [
    'from-red-500 to-orange-500',
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-purple-500 to-pink-500',
    'from-yellow-500 to-red-500',
    'from-indigo-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-teal-500 to-cyan-500',
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const gradientClass = colors[colorIndex];
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
      <div className="text-center text-white/90">
        <Video className="h-10 w-10 mx-auto mb-1 opacity-80" />
        <p className="text-xs font-medium px-2 truncate max-w-[120px]">
          {name.replace(/\.[^/.]+$/, '').substring(0, 15)}
        </p>
      </div>
    </div>
  );
};

export default function VideoLibraryBrowser({
  open,
  onClose,
  channels,
  onVideosAdded
}: VideoLibraryBrowserProps) {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<LibraryVideo | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      setSelectedCategory(null);
      setSelectedVideos(new Set());
      setSelectedChannelId(channels[0]?.id || '');
    }
  }, [open, channels]);

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
        toast.success('Videos Added to Queue', {
          description: `${data.created} video(s) added successfully.`
        });
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getVideoPreviewUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-yellow-500" />
            {selectedCategory ? selectedCategory.name : 'Video Library'}
          </DialogTitle>
          <DialogDescription>
            {selectedCategory
              ? `${selectedCategory.videos.length} videos available`
              : 'Browse pre-added videos by category'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedCategory ? (
          // Videos View
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between py-2 border-b flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToCategories}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Categories
              </Button>
              <div className="flex items-center gap-2">
                {selectedVideos.size > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {selectedVideos.size} selected
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={selectedVideos.size > 0 ? deselectAll : selectAllVideos}>
                  {selectedVideos.size > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            {/* Videos Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                {selectedCategory.videos.map((video) => {
                  const thumbnailUrl = getThumbnailUrl(video);
                  
                  return (
                    <Card
                      key={video.id}
                      className={`cursor-pointer transition-all hover:shadow-md group overflow-hidden ${
                        selectedVideos.has(video.id)
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                          : ''
                      }`}
                    >
                      <div className="relative aspect-video bg-muted">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={video.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image and show default
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={thumbnailUrl ? 'hidden w-full h-full' : 'w-full h-full'}>
                          <DefaultThumbnail name={video.name} />
                        </div>

                        {/* Play Button Overlay */}
                        <button
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewVideo(video);
                          }}
                        >
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 text-blue-600 ml-1" />
                          </div>
                        </button>

                        {/* Selection Check */}
                        {selectedVideos.has(video.id) && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-6 w-6 text-blue-500 bg-white rounded-full" />
                          </div>
                        )}

                        {video.addedToQueue && (
                          <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs">
                            Added
                          </Badge>
                        )}

                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 right-2 text-xs bg-black/60 text-white border-0"
                        >
                          {formatFileSize(video.size)}
                        </Badge>
                      </div>
                      <CardContent className="p-2" onClick={() => toggleVideoSelection(video.id)}>
                        <p className="text-xs truncate font-medium" title={video.name}>
                          {video.name.replace(/\.[^/.]+$/, '')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}

                {selectedCategory.videos.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No videos in this category</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2">
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddToQueue}
                disabled={selectedVideos.size === 0 || adding || !selectedChannelId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {selectedVideos.size} Video(s) to Queue
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Categories View
          <>
            <div className="flex-1 overflow-y-auto">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No video categories available</p>
                  <p className="text-sm mt-1">Ask admin to add video categories</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-2">
                  {categories.map((category) => (
                    <Card
                      key={category.id}
                      className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group overflow-hidden"
                      onClick={() => handleOpenCategory(category)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 line-clamp-1">
                          <FolderOpen className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                          <span className="truncate">{category.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                          {category.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Video className="h-4 w-4" />
                            <span>{category.videos?.length || 0} videos</span>
                          </div>
                          <div className="text-xs text-primary font-medium group-hover:underline">
                            Browse →
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4 flex-shrink-0">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg truncate pr-8">
              {previewVideo?.name.replace(/\.[^/.]+$/, '')}
            </DialogTitle>
            <DialogDescription>
              {formatFileSize(previewVideo?.size ?? null)} • Click outside to close
            </DialogDescription>
          </DialogHeader>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewVideo && (
              <iframe
                src={getVideoPreviewUrl(previewVideo.driveFileId)}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewVideo(null)}>
              Close
            </Button>
            {previewVideo?.webViewLink && (
              <Button variant="outline" asChild>
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {previewVideo && selectedVideos.has(previewVideo.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Already Selected
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Select This Video
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
