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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  Video, 
  CheckCircle2, 
  HardDrive,
  RefreshCw,
  FileVideo
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
          videos: selectedVideoData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add videos');
      }

      toast.success('Videos Added to Queue', {
        description: `${data.added} video(s) added successfully.`
      });

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

  // Default thumbnail component
  const DefaultThumbnail = () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
      <FileVideo className="h-8 w-8 text-gray-400" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Add Videos from Google Drive
          </DialogTitle>
          <DialogDescription>
            Select videos from your Google Drive to add to the upload queue
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden flex-1 min-h-0">
          {/* Search Bar */}
          <div className="flex gap-2 flex-shrink-0">
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
          <div className="flex items-center justify-between flex-shrink-0">
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
            {videos.length > 0 && (
              <Badge variant="outline">
                {videos.length} video{videos.length !== 1 ? 's' : ''} found
              </Badge>
            )}
          </div>

          {/* Video List - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
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
                          ? 'bg-muted/50 opacity-60 cursor-not-allowed'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !video.isMapped && toggleVideo(video.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        {video.thumbnailUrl || video.thumbnailLink ? (
                          <img
                            src={video.thumbnailUrl || video.thumbnailLink || ''}
                            alt={video.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image and show default
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.default-thumb')) {
                                const defaultDiv = document.createElement('div');
                                defaultDiv.className = 'default-thumb w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800';
                                defaultDiv.innerHTML = '<svg class="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 11-2 2 2 2"/><path d="m14 11 2 2-2 2"/></svg>';
                                parent.appendChild(defaultDiv);
                              }
                            }}
                          />
                        ) : (
                          <DefaultThumbnail />
                        )}
                        {video.isMapped && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Badge variant="outline" className="text-xs bg-background">
                              In Queue
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{video.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatSize(video.size)} • {video.mimeType.split('/')[1]?.toUpperCase() || 'VIDEO'}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedVideos.has(video.id)}
                        disabled={video.isMapped}
                        onCheckedChange={() => toggleVideo(video.id)}
                        className="flex-shrink-0"
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
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0">
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
