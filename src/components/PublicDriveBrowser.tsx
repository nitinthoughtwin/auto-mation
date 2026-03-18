'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Link2,
  ExternalLink,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnail?: string;
  createdTime?: string;
  url: string;
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
  const [folderUrl, setFolderUrl] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<DriveFile | null>(null);

  // Extract folder ID from Google Drive URL
  const extractFolderId = (url: string): string | null => {
    // https://drive.google.com/drive/folders/FOLDER_ID
    const match1 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match1) return match1[1];
    
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const match2 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];
    
    // Just folder ID
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
    
    return null;
  };

  // Browse folder
  const browseFolder = async () => {
    const folderId = extractFolderId(folderUrl);
    
    if (!folderId) {
      toast.error('Invalid Folder URL', {
        description: 'Please enter a valid Google Drive folder URL or ID'
      });
      return;
    }

    setLoading(true);
    setFiles([]);
    setSelectedFiles(new Set());

    try {
      const response = await fetch(`/api/drive/browse?folderId=${folderId}&channelId=${channelId}`);
      const data = await response.json();

      if (data.error) {
        toast.error('Cannot Access Folder', {
          description: data.error
        });
        return;
      }

      setFiles(data.files || []);
      
      if (data.files?.length === 0) {
        toast.info('No Videos Found', {
          description: 'This folder does not contain any video files'
        });
      } else {
        toast.success('Videos Loaded', {
          description: `Found ${data.files.length} video(s) in the folder`
        });
      }
    } catch (error) {
      toast.error('Failed to Browse Folder', {
        description: 'Please check the URL and try again'
      });
    } finally {
      setLoading(false);
    }
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

  // Select all files
  const selectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // Map selected videos to queue
  const mapVideosToQueue = async () => {
    if (selectedFiles.size === 0) {
      toast.error('No Videos Selected', {
        description: 'Please select at least one video'
      });
      return;
    }

    setMapping(true);
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
            url: v.url,
            size: v.size,
            mimeType: v.mimeType,
            thumbnail: v.thumbnail,
            title: v.name.replace(/\.[^/.]+$/, ''), // Remove extension
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Videos Added to Queue', {
          description: `${data.created} video(s) added successfully`
        });
        onVideosAdded();
        onClose();
      } else {
        toast.error('Failed to Add Videos', {
          description: data.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      toast.error('Failed to Add Videos', {
        description: 'Please try again'
      });
    } finally {
      setMapping(false);
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

  // Reset on close
  const handleClose = () => {
    setFolderUrl('');
    setFiles([]);
    setSelectedFiles(new Set());
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-green-500" />
              Add Videos from Public Google Drive Link
            </DialogTitle>
            <DialogDescription>
              Enter a public Google Drive folder URL, preview and select videos
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 py-4">
            <div className="flex-1">
              <Input
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && browseFolder()}
              />
            </div>
            <Button onClick={browseFolder} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Browse
                </>
              )}
            </Button>
          </div>

          {files.length > 0 && (
            <div className="flex items-center justify-between py-2 border-t border-b flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{files.length} videos found</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {selectedFiles.size} selected
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectedFiles.size > 0 ? deselectAll : selectAll}>
                  {selectedFiles.size > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a Google Drive folder URL to browse videos</p>
                <p className="text-xs mt-2">Make sure the folder is shared publicly (Anyone with link)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
                {files.map((file) => (
                  <Card 
                    key={file.id}
                    className={`cursor-pointer transition-all hover:shadow-md group ${
                      selectedFiles.has(file.id) 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : ''
                    }`}
                  >
                    <div className="relative aspect-video bg-muted">
                      {file.thumbnail ? (
                        <img 
                          src={file.thumbnail} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Play Button Overlay */}
                      <button
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVideo(file);
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-green-600 ml-1" />
                        </div>
                      </button>

                      {/* Selection Check */}
                      {selectedFiles.has(file.id) && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-6 w-6 text-green-500 bg-white rounded-full" />
                        </div>
                      )}

                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-2 right-2 text-xs bg-black/60 text-white"
                      >
                        {formatSize(file.size)}
                      </Badge>
                    </div>
                    <CardContent className="p-2" onClick={() => toggleFile(file.id)}>
                      <p className="text-xs truncate font-medium" title={file.name}>
                        {file.name.replace(/\.[^/.]+$/, '')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={mapVideosToQueue}
              disabled={selectedFiles.size === 0 || mapping}
              className="bg-green-600 hover:bg-green-700"
            >
              {mapping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add {selectedFiles.size} Video(s) to Queue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg truncate pr-8">
              {previewVideo?.name.replace(/\.[^/.]+$/, '')}
            </DialogTitle>
            <DialogDescription>
              {formatSize(previewVideo?.size)} • Click outside to close
            </DialogDescription>
          </DialogHeader>
          
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewVideo && (
              <iframe
                src={getVideoPreviewUrl(previewVideo.id)}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewVideo(null)}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                if (previewVideo) {
                  toggleFile(previewVideo.id);
                  setPreviewVideo(null);
                }
              }}
              disabled={previewVideo ? selectedFiles.has(previewVideo.id) : false}
              className="bg-green-600 hover:bg-green-700"
            >
              {previewVideo && selectedFiles.has(previewVideo.id) ? (
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
    </>
  );
}
