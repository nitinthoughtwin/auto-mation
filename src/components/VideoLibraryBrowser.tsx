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
  Link2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import DriveThumbnail from '@/components/VideoThumbnail';
import VideoPreviewDialog from '@/components/VideoPreviewDialog';

interface VideoCategory {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  videos: LibraryVideo[];
}

interface LibraryVideo {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  size: number | null;
  durationMillis: number | null;
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

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      setSelectedCategory(null);
      setSelectedVideos(new Set());
      setSelectedChannelId(defaultChannelId || (channels && channels.length > 0 ? channels[0].id : ''));
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


  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open && !previewVideo} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header - Fixed */}
          <DialogHeader className="p-3 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 text-yellow-500 shrink-0" />
                <DialogTitle className="text-base truncate">
                  {selectedCategory ? selectedCategory.name : 'Video Library'}
                </DialogTitle>
                <DialogDescription className="hidden">
                  {selectedCategory ? `${selectedCategory.videos.length} videos` : 'Browse categories'}
                </DialogDescription>
              </div>
              <button onClick={onClose} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
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
              <div className="p-2 sm:p-3">
                {/* Navigation & Actions */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCategories}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </Button>
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {selectedVideos.size > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {selectedVideos.size} selected
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
                    {selectedCategory.videos.filter((video) =>
                      // Hide videos longer than 60 seconds (only if duration is known)
                      video.durationMillis === null || video.durationMillis <= 60000
                    ).map((video) => (
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
                        <p className="mt-1 text-xs font-medium truncate" title={video.name}>
                          {video.name.replace(/\.[^/.]+$/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Categories View
              <div className="p-2 sm:p-3">
                {categories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No video categories available</p>
                    <p className="text-sm mt-1">Add video categories to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <Card
                        key={category.id}
                        className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all overflow-hidden"
                        onClick={() => handleOpenCategory(category)}
                      >
                        {category.thumbnailUrl ? (
                          <div className="w-full aspect-video overflow-hidden">
                            <img
                              src={category.thumbnailUrl}
                              alt={category.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                            <FolderOpen className="h-8 w-8 text-yellow-500 opacity-60" />
                          </div>
                        )}
                        <CardContent className="p-2">
                          <h3 className="font-semibold text-xs truncate">{category.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                            <Video className="h-2.5 w-2.5" />
                            <span>{category.videos?.length || 0} videos</span>
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
          <div className="border-t p-3 flex-shrink-0 bg-background">
            {selectedCategory ? (
              // Videos footer with channel selection
              channels && channels.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                    <SelectTrigger className="w-full sm:w-52">
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4 flex-shrink-0" />
                    <span>Connect a YouTube channel to add videos to the queue</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={onClose} asChild>
                    <a href="/connect-youtube">Connect Channel</a>
                  </Button>
                </div>
              )
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

      <VideoPreviewDialog
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        title={previewVideo?.name.replace(/\.[^/.]+$/, '') ?? ''}
        driveFileId={previewVideo?.driveFileId}
        externalLink={previewVideo?.webViewLink}
        isSelected={previewVideo ? selectedVideos.has(previewVideo.id) : false}
        onSelect={previewVideo ? () => toggleVideoSelection(previewVideo.id) : undefined}
      />
    </>
  );
}