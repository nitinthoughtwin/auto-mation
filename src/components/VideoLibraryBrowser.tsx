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
  Play,
  Grid,
  List,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  driveFolderUrl?: string | null;
  driveFolderId?: string | null;
  items: Item[];
}

interface Item {
  id: string;
  title: string;
  description?: string | null;
  driveFileId?: string | null;
  driveFolderUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  createdTime?: string;
}

interface DriveVideo {
  id: string;
  title: string;
  driveFileId: string;
  driveFolderUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number | null;
  mimeType?: string;
  webViewLink?: string;
  createdTime?: string;
}

interface VideoLibraryBrowserProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onVideosAdded: () => void;
}

export default function VideoLibraryBrowser({
  open,
  onClose,
  channelId,
  onVideosAdded,
}: VideoLibraryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dynamicVideos, setDynamicVideos] = useState<DriveVideo[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewItem, setPreviewItem] = useState<Item | DriveVideo | null>(null);
  const [source, setSource] = useState<'static' | 'drive'>('static');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      setSelectedCategory(null);
      setDynamicVideos([]);
      setSelectedItems(new Set());
    }
  }, [open]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/video-library');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      toast.error('Failed to load video library');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryVideos = async (category: Category) => {
    setSelectedCategory(category);
    setLoadingVideos(true);
    setDynamicVideos([]);
    setSelectedItems(new Set());
    
    try {
      // Fetch videos from the category API (handles both static and drive)
      const res = await fetch(`/api/video-library/category/${category.id}/videos`);
      const data = await res.json();
      
      if (data.videos) {
        // Transform to consistent format
        const videos = data.videos.map((v: any) => ({
          id: v.id,
          title: v.title || v.name,
          driveFileId: v.driveFileId,
          driveFolderUrl: v.driveFolderUrl || category.driveFolderUrl,
          thumbnailUrl: v.thumbnailUrl,
          fileSize: v.fileSize || v.size,
          mimeType: v.mimeType,
          webViewLink: v.webViewLink,
          createdTime: v.createdTime,
        }));
        setDynamicVideos(videos);
        setSource(data.source || 'static');
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      // Fall back to static items from category
      if (category.items) {
        setDynamicVideos(category.items.map(item => ({
          id: item.id,
          title: item.title,
          driveFileId: item.driveFileId || undefined,
          driveFolderUrl: item.driveFolderUrl || category.driveFolderUrl || undefined,
          thumbnailUrl: item.thumbnailUrl || undefined,
          fileSize: item.fileSize || undefined,
          mimeType: item.mimeType || undefined,
        })));
      }
      setSource('static');
    } finally {
      setLoadingVideos(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = dynamicVideos.map(v => v.id);
    setSelectedItems(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const addSelectedVideos = async () => {
    if (selectedItems.size === 0) {
      toast.error('No videos selected');
      return;
    }

    setAdding(true);
    const loadingToast = toast.loading(`Adding ${selectedItems.size} video(s)...`);

    try {
      // Get selected videos
      const videosToAdd = dynamicVideos.filter(v => selectedItems.has(v.id));

      // Map videos to queue
      const response = await fetch('/api/drive/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          videos: videosToAdd.map(v => ({
            id: v.driveFileId || v.id,
            name: v.title,
            url: v.webViewLink || v.driveFolderUrl || `https://drive.google.com/file/d/${v.driveFileId}`,
            size: v.fileSize,
            mimeType: v.mimeType || 'video/mp4',
            thumbnail: v.thumbnailUrl,
            title: v.title,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.dismiss(loadingToast);
        toast.success(`${data.created} video(s) added to queue`);
        onVideosAdded();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to add videos');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to add videos');
    } finally {
      setAdding(false);
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getVideoPreviewUrl = (driveFileId: string) => {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  };

  const getThumbnailUrl = (video: DriveVideo) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.driveFileId) {
      return `https://lh3.googleusercontent.com/d/${video.driveFileId}=w200-h120-c`;
    }
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Grid className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              Video Library
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Browse and select pre-added videos to add to your queue
            </DialogDescription>
          </DialogHeader>

          {/* Navigation */}
          {selectedCategory && (
            <div className="flex items-center gap-2 py-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setDynamicVideos([]);
                  setSelectedItems(new Set());
                }}
                className="h-7 sm:h-8 text-xs sm:text-sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <span className="text-lg sm:text-xl mr-1.5">{selectedCategory.icon}</span>
                {selectedCategory.name}
              </div>
              {source === 'drive' && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-green-50 text-green-700 border-green-200">
                  <ExternalLink className="h-2.5 w-2.5 mr-1" />
                  Live from Drive
                </Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-[10px] sm:text-xs">
                    {selectedItems.size} selected
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedItems.size > 0 ? deselectAll : selectAll}
                  disabled={loadingVideos}
                  className="h-7 sm:h-8 text-[10px] sm:text-xs"
                >
                  {selectedItems.size > 0 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedCategory ? (
              // Videos in category
              loadingVideos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                  {dynamicVideos.map((video) => (
                    <Card
                      key={video.id}
                      className={`cursor-pointer transition-all hover:shadow-md group ${
                        selectedItems.has(video.id)
                          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950'
                          : ''
                      }`}
                    >
                      <div className="relative aspect-video bg-muted">
                        {getThumbnailUrl(video) ? (
                          <img
                            src={getThumbnailUrl(video)!}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <Video className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                          </div>
                        )}

                        {/* Play Button Overlay */}
                        {video.driveFileId && (
                          <button
                            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(video);
                            }}
                          >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                              <Play className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 ml-0.5" />
                            </div>
                          </button>
                        )}

                        {/* Selection Check */}
                        {selectedItems.has(video.id) && (
                          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 bg-white rounded-full" />
                          </div>
                        )}

                        {video.fileSize && (
                          <Badge
                            variant="secondary"
                            className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 text-[8px] sm:text-[10px] bg-black/60 text-white"
                          >
                            {formatSize(video.fileSize)}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-1.5 sm:p-2" onClick={() => toggleItem(video.id)}>
                        <p className="text-[10px] sm:text-xs truncate font-medium" title={video.title}>
                          {video.title}
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                  {dynamicVideos.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Video className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                      <p className="text-xs sm:text-sm">No videos found in this category</p>
                      {selectedCategory.driveFolderUrl && (
                        <p className="text-[10px] sm:text-xs mt-1">
                          Make sure the folder is shared publicly
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              // Categories list
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-md transition group"
                    onClick={() => loadCategoryVideos(category)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg sm:text-xl">
                          {category.icon || '📁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{category.name}</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {category.driveFolderUrl ? (
                              <span className="flex items-center gap-1">
                                <ExternalLink className="h-2.5 w-2.5" />
                                Drive folder
                              </span>
                            ) : (
                              `${category.items?.length || 0} videos`
                            )}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {categories.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-xs sm:text-sm">No video categories available</p>
                    <p className="text-[10px] sm:text-xs mt-1">Check back later for pre-added videos</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="h-8 sm:h-9 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button
              onClick={addSelectedVideos}
              disabled={selectedItems.size === 0 || adding}
              className="bg-purple-600 hover:bg-purple-700 h-8 sm:h-9 text-xs sm:text-sm"
            >
              {adding ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Add {selectedItems.size} Video(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-lg truncate pr-8">{previewItem?.title}</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs">
              Preview • Click outside to close
            </DialogDescription>
          </DialogHeader>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewItem?.driveFileId && (
              <iframe
                src={getVideoPreviewUrl(previewItem.driveFileId)}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewItem(null)}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewItem) {
                  toggleItem(previewItem.id);
                  setPreviewItem(null);
                }
              }}
              disabled={previewItem ? selectedItems.has(previewItem.id) : false}
              className="bg-purple-600 hover:bg-purple-700 h-8 sm:h-9 text-xs sm:text-sm"
            >
              {previewItem && selectedItems.has(previewItem.id) ? (
                <>
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Already Selected
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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