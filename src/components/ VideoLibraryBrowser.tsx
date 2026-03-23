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
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  items: Item[];
}

interface Item {
  id: string;
  title: string;
  description: string | null;
  driveFileId: string | null;
  driveFolderUrl: string | null;
  thumbnailUrl: string | null;
  fileSize: number | null;
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [previewItem, setPreviewItem] = useState<Item | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      setSelectedCategory(null);
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

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllInCategory = () => {
    if (!selectedCategory) return;
    const allIds = selectedCategory.items.map(item => item.id);
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
      // Get selected items from current category
      const itemsToAdd = selectedCategory?.items.filter(item => selectedItems.has(item.id)) || [];

      // Map videos to queue
      const response = await fetch('/api/drive/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          videos: itemsToAdd.map(item => ({
            id: item.driveFileId || item.id,
            name: item.title,
            url: item.driveFolderUrl || `https://drive.google.com/file/d/${item.driveFileId}`,
            size: item.fileSize,
            mimeType: 'video/mp4',
            thumbnail: item.thumbnailUrl,
            title: item.title,
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
              <div className="ml-auto flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-[10px] sm:text-xs">
                    {selectedItems.size} selected
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedItems.size > 0 ? deselectAll : selectAllInCategory}
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
              // Items in category
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                {selectedCategory.items.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all hover:shadow-md group ${
                      selectedItems.has(item.id)
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950'
                        : ''
                    }`}
                  >
                    <div className="relative aspect-video bg-muted">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <Video className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      {item.driveFileId && (
                        <button
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 ml-0.5" />
                          </div>
                        </button>
                      )}

                      {/* Selection Check */}
                      {selectedItems.has(item.id) && (
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 bg-white rounded-full" />
                        </div>
                      )}

                      {item.fileSize && (
                        <Badge
                          variant="secondary"
                          className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 text-[8px] sm:text-[10px] bg-black/60 text-white"
                        >
                          {formatSize(item.fileSize)}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-1.5 sm:p-2" onClick={() => toggleItem(item.id)}>
                      <p className="text-[10px] sm:text-xs truncate font-medium" title={item.title}>
                        {item.title}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {selectedCategory.items.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Video className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-xs sm:text-sm">No videos in this category</p>
                  </div>
                )}
              </div>
            ) : (
              // Categories list
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-md transition group"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg sm:text-xl">
                          {category.icon || '📁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{category.name}</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {category.items.length} videos
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