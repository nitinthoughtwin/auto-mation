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
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Video, 
  CheckCircle2, 
  Link as LinkIcon,
  RefreshCw,
  FileVideo,
  Folder,
  ChevronRight,
  Home,
  ExternalLink,
  AlertCircle,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

interface FolderInfo {
  id: string;
  name: string;
  parents?: string[];
}

interface PublicDriveBrowserProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onVideosAdded: () => void;
}

export default function PublicDriveBrowser({
  open,
  onClose,
  channelId,
  onVideosAdded
}: PublicDriveBrowserProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current folder state
  const [currentFolder, setCurrentFolder] = useState<FolderInfo | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<FolderInfo[]>([]);
  
  // Contents
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [videos, setVideos] = useState<DriveItem[]>([]);
  
  // Selection
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [addingToQueue, setAddingToQueue] = useState(false);

  // Video preview
  const [previewVideo, setPreviewVideo] = useState<DriveItem | null>(null);

  // Pagination
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Loading more items
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setUrl('');
      setError(null);
      setCurrentFolder(null);
      setBreadcrumb([]);
      setFolders([]);
      setVideos([]);
      setSelectedVideos(new Set());
      setNextPageToken(null);
      setHasMore(false);
      setPreviewVideo(null);
      setLoadingMore(false);
    }
  }, [open]);

  // Fetch folder contents
  const fetchFolderContents = async (folderId: string, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      let fetchUrl = `/api/drive/public?folderId=${folderId}`;
      if (append && nextPageToken) {
        fetchUrl += `&pageToken=${nextPageToken}`;
      }

      const res = await fetch(fetchUrl);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch folder contents');
      }

      if (append) {
        setFolders(prev => [...prev, ...(data.folders || [])]);
        setVideos(prev => [...prev, ...(data.videos || [])]);
      } else {
        setFolders(data.folders || []);
        setVideos(data.videos || []);
      }

      if (data.folder) {
        setCurrentFolder(data.folder);
      }

      setNextPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);

    } catch (err: any) {
      console.error('[Public Drive] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load from URL
  const loadFromUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a Google Drive URL');
      return;
    }

    setLoading(true);
    setError(null);
    setBreadcrumb([]);
    setSelectedVideos(new Set());

    try {
      const res = await fetch(`/api/drive/public?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to access Google Drive');
      }

      if (data.type === 'folder') {
        setFolders(data.folders || []);
        setVideos(data.videos || []);
        setCurrentFolder(data.folder);
        setBreadcrumb(data.folder ? [{ id: data.folder.id, name: data.folder.name }] : []);
        setNextPageToken(data.nextPageToken || null);
        setHasMore(!!data.nextPageToken);
      } else if (data.type === 'file') {
        if (data.file.mimeType?.startsWith('video/')) {
          setVideos([data.file]);
          setFolders([]);
        } else {
          setError('The provided link is not a video file');
        }
      }

    } catch (err: any) {
      console.error('[Public Drive] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folder: DriveItem) => {
    if (currentFolder) {
      setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
    } else {
      setBreadcrumb([{ id: folder.id, name: folder.name }]);
    }
    
    setSelectedVideos(new Set());
    fetchFolderContents(folder.id);
  };

  // Navigate to breadcrumb item
  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    
    const folder = newBreadcrumb[newBreadcrumb.length - 1];
    if (folder) {
      setSelectedVideos(new Set());
      fetchFolderContents(folder.id);
    }
  };

  // Load more videos
  const loadMore = () => {
    if (currentFolder && hasMore && !loadingMore) {
      fetchFolderContents(currentFolder.id, true);
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

  // Select all videos
  const selectAll = () => {
    setSelectedVideos(new Set(videos.map(v => v.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedVideos(new Set());
  };

  // Add selected videos to queue
  const addToQueue = async () => {
    if (selectedVideos.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select at least one video.'
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
          thumbnailLink: v.thumbnailUrl || v.thumbnailLink,
          isPublicDrive: true
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

      toast.success('Videos Added!', {
        description: `${data.added || data.created || selectedVideos.size} video(s) added to queue.`
      });

      setSelectedVideos(new Set());
      onVideosAdded();
      onClose();

    } catch (error: any) {
      console.error('[Public Drive] Add to queue error:', error);
      toast.error('Failed to Add Videos', {
        description: error.message
      });
    } finally {
      setAddingToQueue(false);
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Get video preview URL
  const getVideoPreviewUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  // Default thumbnail
  const DefaultThumbnail = ({ isFolder = false }: { isFolder?: boolean }) => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
      {isFolder ? (
        <Folder className="h-8 w-8 text-yellow-400" />
      ) : (
        <FileVideo className="h-8 w-8 text-gray-400" />
      )}
    </div>
  );

  // Loading skeleton for grid
  const GridSkeleton = ({ count = 8 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border overflow-hidden animate-pulse">
          <div className="aspect-video bg-muted" />
          <div className="p-2 space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <LinkIcon className="h-5 w-5 text-green-500" />
              Add Videos from Drive Link
            </DialogTitle>
            <DialogDescription className="text-sm">
              Paste a public Google Drive folder link
            </DialogDescription>
          </DialogHeader>

          {/* URL Input */}
          <div className="flex gap-2 p-4 sm:px-6 flex-shrink-0">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste Google Drive folder link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFromUrl()}
                className="pl-9 h-10 sm:h-9"
              />
            </div>
            <Button onClick={loadFromUrl} disabled={loading} className="h-10 sm:h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Browse'}
            </Button>
            {currentFolder && (
              <Button variant="outline" onClick={() => fetchFolderContents(currentFolder.id)} disabled={loading} className="h-10 sm:h-9 w-10 sm:w-9 p-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm text-destructive flex-shrink-0">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto flex-shrink-0 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setBreadcrumb([]);
                  setCurrentFolder(null);
                  setFolders([]);
                  setVideos([]);
                }}
              >
                <Home className="h-4 w-4" />
              </Button>
              {breadcrumb.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 truncate max-w-[120px]"
                    onClick={() => navigateToBreadcrumb(index)}
                  >
                    {item.name}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Selection Actions */}
          {(folders.length > 0 || videos.length > 0) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 flex-shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {videos.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={selectAll} className="h-8 text-xs">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll} className="h-8 text-xs">
                      Deselect
                    </Button>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {selectedVideos.size} selected
                    </Badge>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {folders.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {folders.length} folders
                  </Badge>
                )}
                {videos.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {videos.length} videos
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading && folders.length === 0 && videos.length === 0 ? (
              <GridSkeleton />
            ) : !currentFolder && folders.length === 0 && videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <LinkIcon className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">Paste a Google Drive folder link</p>
                <p className="text-sm mt-1 text-center px-4">Folder must be shared with "Anyone with the link"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition-all"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <div className="aspect-video bg-muted relative">
                      <DefaultThumbnail isFolder />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">Folder</p>
                    </div>
                  </div>
                ))}

                {/* Videos */}
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`cursor-pointer border rounded-lg overflow-hidden transition-all ${
                      selectedVideos.has(video.id) 
                        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => toggleVideo(video.id)}
                  >
                    <div className="aspect-video bg-muted relative group">
                      {video.thumbnailUrl || video.thumbnailLink ? (
                        <img
                          src={video.thumbnailUrl || video.thumbnailLink || ''}
                          alt={video.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <DefaultThumbnail />
                      )}
                      
                      {/* Play Button */}
                      <button
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVideo(video);
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-green-600 ml-1" />
                        </div>
                      </button>

                      {/* Selection Check */}
                      {selectedVideos.has(video.id) && (
                        <div className="absolute top-1.5 left-1.5">
                          <CheckCircle2 className="h-5 w-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}

                      {/* File Size */}
                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-1.5 right-1.5 text-[10px] sm:text-xs bg-black/70 text-white"
                      >
                        {formatSize(video.size)}
                      </Badge>
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate font-medium">{video.name.replace(/\.[^/.]+$/, '')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-9"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex-shrink-0 gap-2">
            <Button variant="outline" onClick={onClose} className="h-10 sm:h-9">
              Cancel
            </Button>
            <Button
              onClick={addToQueue}
              disabled={selectedVideos.size === 0 || addingToQueue}
              className="bg-green-600 hover:bg-green-700 h-10 sm:h-9"
            >
              {addingToQueue ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add {selectedVideos.size} Video{selectedVideos.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <div className="bg-black aspect-video w-full relative">
            {previewVideo && (
              <iframe
                src={getVideoPreviewUrl(previewVideo.id)}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>
          
          <div className="p-4 bg-background">
            <div className="mb-3">
              <h3 className="font-medium truncate text-sm sm:text-base">
                {previewVideo?.name.replace(/\.[^/.]+$/, '')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Size: {formatSize(previewVideo?.size)}
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setPreviewVideo(null)} className="h-9">
                Close
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (previewVideo) {
                    window.open(`https://drive.google.com/file/d/${previewVideo.id}/view`, '_blank');
                  }
                }}
                className="h-9"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Drive
              </Button>
              <Button 
                onClick={() => {
                  if (previewVideo) {
                    toggleVideo(previewVideo.id);
                    setPreviewVideo(null);
                  }
                }}
                disabled={previewVideo ? selectedVideos.has(previewVideo.id) : false}
                className="bg-green-600 hover:bg-green-700 h-9"
              >
                {previewVideo && selectedVideos.has(previewVideo.id) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Selected
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Select
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
