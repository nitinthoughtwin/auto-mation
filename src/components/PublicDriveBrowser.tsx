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
import { 
  Loader2, 
  Search, 
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
  Sparkles,
  Wand2
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

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  tags: string;
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

  // Video details
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultTags, setDefaultTags] = useState('');
  
  // AI Generated metadata per video
  const [aiMetadata, setAiMetadata] = useState<Map<string, VideoMetadata>>(new Map());
  const [generatingAI, setGeneratingAI] = useState(false);
  const [useAI, setUseAI] = useState(true); // Default to use AI metadata
  
  // Pagination
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

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
      setDefaultTitle('');
      setDefaultDescription('');
      setDefaultTags('');
      setAiMetadata(new Map());
      setUseAI(true);
    }
  }, [open]);

  // Fetch folder contents
  const fetchFolderContents = async (folderId: string, append: boolean = false) => {
    setLoading(true);
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
        // Single video file
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
    // Add current folder to breadcrumb
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
    if (currentFolder && hasMore && !loading) {
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

  // Generate AI metadata for selected videos
  const generateAIMetadata = async () => {
    if (selectedVideos.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select videos first.'
      });
      return;
    }

    setGeneratingAI(true);
    
    const loadingToast = toast.loading('Generating AI Metadata', {
      description: `Analyzing ${selectedVideos.size} video(s)...`
    });

    try {
      const selectedVideoList = videos.filter(v => selectedVideos.has(v.id));
      
      const res = await fetch('/api/ai/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedVideoList.map(v => ({
            id: v.id,
            name: v.name
          })),
          language: 'hindi'
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate metadata');
      }

      // Store AI generated metadata
      const newMetadata = new Map(aiMetadata);
      data.results.forEach((result: any) => {
        newMetadata.set(result.id, {
          id: result.id,
          title: result.title,
          description: result.description,
          tags: result.tags
        });
      });
      
      setAiMetadata(newMetadata);
      setUseAI(true);
      
      toast.dismiss(loadingToast);
      toast.success('AI Metadata Generated', {
        description: `Generated titles and descriptions for ${data.results.length} video(s)`
      });

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('AI Generation Failed', {
        description: error.message
      });
    } finally {
      setGeneratingAI(false);
    }
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
        .map(v => {
          // Check if we have AI metadata for this video
          const aiData = useAI ? aiMetadata.get(v.id) : null;
          
          return {
            id: v.id,
            name: v.name,
            size: v.size,
            mimeType: v.mimeType,
            webViewLink: v.webViewLink,
            thumbnailLink: v.thumbnailUrl || v.thumbnailLink,
            isPublicDrive: true,
            // Use AI metadata if available, otherwise use defaults
            title: aiData?.title || undefined,
            description: aiData?.description || undefined,
            tags: aiData?.tags || undefined
          };
        });

      const res = await fetch('/api/drive/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          videos: selectedVideoData,
          // Don't send default title/description if using AI
          title: useAI ? undefined : (defaultTitle || undefined),
          description: useAI ? undefined : (defaultDescription || undefined),
          tags: useAI ? undefined : (defaultTags || undefined)
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
      setDefaultTitle('');
      setDefaultDescription('');
      setDefaultTags('');
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
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Add Videos from Public Google Drive
          </DialogTitle>
          <DialogDescription>
            Paste a public Google Drive folder link to browse and select videos
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden flex-1 min-h-0">
          {/* URL Input */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste Google Drive folder link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFromUrl()}
                className="pl-9"
              />
            </div>
            <Button onClick={loadFromUrl} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Browse'}
            </Button>
            {currentFolder && (
              <Button variant="outline" onClick={() => fetchFolderContents(currentFolder.id)} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0 overflow-x-auto pb-1">
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
                    className="h-7 px-2 truncate max-w-[150px]"
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
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {videos.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                    <Badge variant="secondary">
                      {selectedVideos.size} selected
                    </Badge>
                    {selectedVideos.size > 0 && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={generateAIMetadata}
                        disabled={generatingAI}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {generatingAI ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-1" />
                        )}
                        AI Generate
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {folders.length > 0 && (
                  <Badge variant="outline">
                    {folders.length} folder{folders.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {videos.length > 0 && (
                  <Badge variant="outline">
                    {videos.length} video{videos.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* AI Generated Metadata Preview */}
          {aiMetadata.size > 0 && selectedVideos.size > 0 && (
            <div className="flex-shrink-0 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    AI Generated Metadata ({aiMetadata.size} videos)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAiMetadata(new Map())}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-2">
                {Array.from(aiMetadata.entries()).slice(0, 5).map(([id, meta]) => (
                  <div key={id} className="p-2 bg-white/50 dark:bg-black/20 rounded text-xs">
                    <p className="font-medium truncate">{meta.title}</p>
                    <p className="text-muted-foreground truncate">{meta.description?.substring(0, 80)}...</p>
                  </div>
                ))}
                {aiMetadata.size > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{aiMetadata.size - 5} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Video Details Form - Show when videos selected and no AI metadata */}
          {selectedVideos.size > 0 && aiMetadata.size === 0 && (
            <div className="flex-shrink-0 p-3 border rounded-lg bg-muted/30 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Video Details (Optional - Or use AI Generate above)
              </p>
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="Enter custom title (or use AI Generate)"
                    value={defaultTitle}
                    onChange={(e) => setDefaultTitle(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    placeholder="Enter video description..."
                    value={defaultDescription}
                    onChange={(e) => setDefaultDescription(e.target.value)}
                    className="min-h-[60px] mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tags (comma separated)</Label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    value={defaultTags}
                    onChange={(e) => setDefaultTags(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
            <div className="p-2 space-y-2">
              {loading && folders.length === 0 && videos.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !currentFolder && folders.length === 0 && videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>Paste a public Google Drive folder link above</p>
                  <p className="text-sm mt-1">Make sure the folder is shared with "Anyone with the link"</p>
                </div>
              ) : (
                <>
                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToFolder(folder)}
                    >
                      <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        <DefaultThumbnail isFolder />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{folder.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Folder</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}

                  {/* Videos */}
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedVideos.has(video.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleVideo(video.id)}
                    >
                      <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        {video.thumbnailUrl || video.thumbnailLink ? (
                          <img
                            src={video.thumbnailUrl || video.thumbnailLink || ''}
                            alt={video.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.default-thumb')) {
                                const defaultDiv = document.createElement('div');
                                defaultDiv.className = 'default-thumb w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800';
                                defaultDiv.innerHTML = '<svg class="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 11-2 2 2 2"/><path d="m14 11 2 2-2 2"/></svg>';
                                parent.appendChild(defaultDiv);
                              }
                            }}
                          />
                        ) : (
                          <DefaultThumbnail />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{video.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatSize(video.size)} • {video.mimeType?.split('/')[1]?.toUpperCase() || 'VIDEO'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {video.webViewLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(video.webViewLink, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Checkbox
                          checked={selectedVideos.has(video.id)}
                          onCheckedChange={() => toggleVideo(video.id)}
                          className="flex-shrink-0"
                        />
                      </div>
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