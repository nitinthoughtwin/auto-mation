'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  FolderOpen, 
  Video, 
  Loader2, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  HardDrive,
  Play,
  ExternalLink,
  Home
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  createdTime?: string;
  webViewLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
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
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('My Drive');
  const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<DriveFile | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadFolders(null);
      setSelectedFiles(new Set());
      setFiles([]);
      setFolderStack([]);
      setCurrentFolderName('My Drive');
    }
  }, [open]);

  // Load folders and files from Google Drive
  const loadFolders = async (folderId: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) {
        params.set('folderId', folderId);
      }
      params.set('channelId', channelId);

      const response = await fetch(`/api/drive/list?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setFolders(data.folders || []);
      setFiles(data.files || []);
      setCurrentFolder(folderId);
    } catch (error: any) {
      toast.error('Failed to Load Drive', {
        description: error.message || 'Could not load Google Drive contents'
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigate into folder
  const navigateToFolder = (folder: DriveFolder) => {
    setFolderStack(prev => [...prev, { id: currentFolder || 'root', name: currentFolderName }]);
    setCurrentFolderName(folder.name);
    loadFolders(folder.id);
    setSelectedFiles(new Set());
  };

  // Navigate back
  const navigateBack = () => {
    const lastFolder = folderStack[folderStack.length - 1];
    if (lastFolder) {
      setFolderStack(prev => prev.slice(0, -1));
      setCurrentFolderName(lastFolder.name);
      loadFolders(lastFolder.id === 'root' ? null : lastFolder.id);
    } else {
      setCurrentFolderName('My Drive');
      loadFolders(null);
    }
    setSelectedFiles(new Set());
  };

  // Toggle file selection
  const toggleFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Select all video files
  const selectAll = () => {
    const videoFiles = files.filter(f => isVideo(f.mimeType));
    setSelectedFiles(new Set(videoFiles.map(f => f.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // Add selected videos to queue
  const addVideosToQueue = async () => {
    if (selectedFiles.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select at least one video'
      });
      return;
    }

    setAdding(true);
    const selectedVideos = files.filter(f => selectedFiles.has(f.id));

    try {
      const response = await fetch('/api/drive/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          videos: selectedVideos.map(v => ({
            id: v.id,
            name: v.name,
            url: v.webViewLink,
            size: v.size,
            mimeType: v.mimeType,
            thumbnail: v.thumbnailLink,
            title: v.name.replace(/\.[^/.]+$/, ''),
          }))
        })
      });

      const data = await response.json();

      if (data.success || data.created) {
        toast.success('Videos Added to Queue', {
          description: `${data.created || data.added || selectedVideos.length} video(s) added successfully`
        });
        onVideosAdded();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to add videos');
      }
    } catch (error: any) {
      toast.error('Failed to Add Videos', {
        description: error.message || 'Please try again'
      });
    } finally {
      setAdding(false);
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

  // Check if file is video
  const isVideo = (mimeType: string) => mimeType?.startsWith('video/');

  // Get video preview URL
  const getVideoPreviewUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  // Default thumbnail component
  const DefaultThumbnail = ({ isFolder = false }: { isFolder?: boolean }) => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
      {isFolder ? (
        <FolderOpen className="h-8 w-8 text-yellow-400" />
      ) : (
        <Video className="h-8 w-8 text-gray-400" />
      )}
    </div>
  );

  // Loading skeleton
  const GridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
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
              <HardDrive className="h-5 w-5 text-blue-500" />
              Add from My Google Drive
            </DialogTitle>
            <DialogDescription className="text-sm">
              Browse and select videos from your connected Google Drive
            </DialogDescription>
          </DialogHeader>

          {/* Navigation */}
          <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b flex-wrap">
            {folderStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={navigateBack} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <div className="flex items-center text-sm text-muted-foreground overflow-x-auto">
              <FolderOpen className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{currentFolderName}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                  {selectedFiles.size} selected
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={selectedFiles.size > 0 ? deselectAll : selectAll} className="h-8 text-xs">
                {selectedFiles.size > 0 ? 'Deselect' : 'Select All'}
              </Button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <GridSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                {/* Folders */}
                {folders.map((folder) => (
                  <Card 
                    key={folder.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <div className="aspect-video bg-muted relative">
                      <DefaultThumbnail isFolder />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{folder.name}</p>
                      <p className="text-[10px] text-muted-foreground">Folder</p>
                    </CardContent>
                  </Card>
                ))}

                {/* Video Files */}
                {files.filter(f => isVideo(f.mimeType)).map((file) => (
                  <Card 
                    key={file.id}
                    className={`cursor-pointer transition-all overflow-hidden ${
                      selectedFiles.has(file.id) 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="aspect-video bg-muted relative group">
                      {file.thumbnailLink ? (
                        <img 
                          src={file.thumbnailLink} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <DefaultThumbnail />
                      )}
                      
                      {/* Play Button */}
                      <button
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVideo(file);
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-blue-600 ml-1" />
                        </div>
                      </button>

                      {/* Selection Check */}
                      {selectedFiles.has(file.id) && (
                        <div className="absolute top-1.5 left-1.5">
                          <CheckCircle2 className="h-5 w-5 text-blue-500 bg-white rounded-full" />
                        </div>
                      )}

                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-1.5 right-1.5 text-[10px] bg-black/70 text-white"
                      >
                        {formatSize(file.size)}
                      </Badge>
                    </div>
                    <CardContent className="p-2" onClick={() => toggleFile(file.id)}>
                      <p className="text-xs truncate font-medium">{file.name.replace(/\.[^/.]+$/, '')}</p>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty state */}
                {folders.length === 0 && files.filter(f => isVideo(f.mimeType)).length === 0 && !loading && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No videos found in this folder</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t gap-2">
            <Button variant="outline" onClick={onClose} className="h-10 sm:h-9">
              Cancel
            </Button>
            <Button 
              onClick={addVideosToQueue}
              disabled={selectedFiles.size === 0 || adding}
              className="bg-blue-600 hover:bg-blue-700 h-10 sm:h-9"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add {selectedFiles.size} Video{selectedFiles.size !== 1 ? 's' : ''}
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
                    toggleFile(previewVideo.id);
                    setPreviewVideo(null);
                  }
                }}
                disabled={previewVideo ? selectedFiles.has(previewVideo.id) : false}
                className="bg-blue-600 hover:bg-blue-700 h-9"
              >
                {previewVideo && selectedFiles.has(previewVideo.id) ? (
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