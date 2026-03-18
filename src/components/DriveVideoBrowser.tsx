'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Search, 
  Video, 
  CheckCircle2, 
  Folder, 
  HardDrive,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveVideo {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  webViewLink?: string;
  isMapped?: boolean;
}

interface DriveVideoBrowserProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onVideosAdded: () => void;
}

export default function DriveVideoBrowser({
  open,
  onClose,
  channelId,
  onVideosAdded
}: DriveVideoBrowserProps) {
  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Form fields
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultTags, setDefaultTags] = useState('');

  // Fetch videos from Drive
  const fetchVideos = async (search: string = '', pageToken: string | null = null) => {
    if (!channelId) return;

    setLoading(true);
    try {
      let url = `/api/drive/search?channelId=${channelId}`;
      if (search) {
        url += `&q=${encodeURIComponent(search)}`;
      }
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        if (data.needsReconnect) {
          toast.error('Token Expired', {
            description: 'Please reconnect your YouTube channel.'
          });
          onClose();
          return;
        }
        throw new Error(data.error || 'Failed to fetch videos');
      }

      if (pageToken) {
        // Append to existing videos
        setVideos(prev => [...prev, ...(data.videos || [])]);
      } else {
        setVideos(data.videos || []);
      }

      setNextPageToken(data.nextPageToken);
      setHasMore(!!data.nextPageToken);

    } catch (error: any) {
      console.error('[Drive Browser] Error:', error);
      toast.error('Failed to Load Videos', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Load videos when dialog opens
  useEffect(() => {
    if (open && channelId) {
      setVideos([]);
      setSelectedVideos(new Set());
      setNextPageToken(null);
      fetchVideos();
    }
  }, [open, channelId]);

  // Handle search
  const handleSearch = () => {
    setVideos([]);
    setNextPageToken(null);
    fetchVideos(searchQuery);
  };

  // Load more videos
  const loadMore = () => {
    if (!loading && hasMore && nextPageToken) {
      fetchVideos(searchQuery, nextPageToken);
    }
  };

  // Toggle video selection
  const toggleVideo = (videoId: string) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Select all visible videos
  const selectAll = () => {
    const unmappedVideos = videos.filter(v => !v.isMapped).map(v => v.id);
    setSelectedVideos(new Set(unmappedVideos));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedVideos(new Set());
  };

  // Add selected videos to queue
  const addToQueue = async () => {
    if (selectedVideos.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select at least one video to add to queue.'
      });
      return;
    }

    setAddingToQueue(true);

    try {
      const selectedVideoData = videos
        .filter(v => selectedVideos.has(v.id))
        .map(v => ({
          id: v.id,
          name: v.name,
          size: v.size,
          mimeType: v.mimeType,
          webViewLink: v.webViewLink,
          thumbnailLink: v.thumbnailLink || v.thumbnailUrl
        }));

      const res = await fetch('/api/drive/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          videos: selectedVideoData,
          title: defaultTitle,
          description: defaultDescription,
          tags: defaultTags
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add videos');
      }

      toast.success('Videos Added to Queue', {
        description: `${data.added} video(s) added successfully.`
      });

      // Reset form
      setDefaultTitle('');
      setDefaultDescription('');
      setDefaultTags('');
      setSelectedVideos(new Set());

      // Notify parent
      onVideosAdded();
      onClose();

    } catch (error: any) {
      console.error('[Drive Browser] Add to queue error:', error);
      toast.error('Failed to Add Videos', {
        description: error.message
      });
    } finally {
      setAddingToQueue(false);
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Add Videos from Google Drive
          </DialogTitle>
          <DialogDescription>
            Select videos from your Google Drive to add to the upload queue
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
            <Button variant="outline" onClick={() => fetchVideos(searchQuery)} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <Badge variant="secondary">
                {selectedVideos.size} selected
              </Badge>
            </div>
          </div>

          {/* Video List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2 space-y-2">
              {loading && videos.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mb-4 opacity-50" />
                  <p>No videos found in your Google Drive</p>
                  <p className="text-sm">Upload videos to Drive first, then map them here</p>
                </div>
              ) : (
                <>
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedVideos.has(video.id)
                          ? 'bg-primary/10 border-primary'
                          : video.isMapped
                          ? 'bg-muted/50 opacity-60'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !video.isMapped && toggleVideo(video.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="h-6 w-6 m-auto text-muted-foreground" />
                        )}
                        {video.isMapped && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Badge variant="outline" className="text-xs">
                              In Queue
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{video.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(video.size)} • {video.mimeType.split('/')[1]?.toUpperCase() || 'VIDEO'}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedVideos.has(video.id)}
                        disabled={video.isMapped}
                        onCheckedChange={() => toggleVideo(video.id)}
                      />
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Default Fields */}
          {selectedVideos.size > 0 && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium text-sm">Default Values (Optional)</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="driveTitle">Default Title</Label>
                  <Input
                    id="driveTitle"
                    placeholder="Leave empty to use filename"
                    value={defaultTitle}
                    onChange={(e) => setDefaultTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driveTags">Default Tags</Label>
                  <Input
                    id="driveTags"
                    placeholder="tag1, tag2, tag3"
                    value={defaultTags}
                    onChange={(e) => setDefaultTags(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driveDescription">Default Description</Label>
                <Textarea
                  id="driveDescription"
                  placeholder="Enter default description..."
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={addToQueue}
            disabled={selectedVideos.size === 0 || addingToQueue}
          >
            {addingToQueue ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Add {selectedVideos.size} Video{selectedVideos.size !== 1 ? 's' : ''} to Queue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
