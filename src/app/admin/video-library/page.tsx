'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Video,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Loader2,
  FolderOpen,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import DriveThumbnail from '@/components/VideoThumbnail';

interface VideoCategory {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  driveUrl: string;
  folderId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  videoCount?: number;
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


export default function AdminVideoLibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Form state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    thumbnailUrl: '',
    driveUrl: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete state
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync state
  const [syncingCategoryId, setSyncingCategoryId] = useState<string | null>(null);

  // Fetch durations state
  const [fetchingDurations, setFetchingDurations] = useState(false);
  const [durationStats, setDurationStats] = useState<{ total: number; pending: number; done: number } | null>(null);

  // Import extra folder state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDriveUrl, setImportDriveUrl] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      loadCategories();
    }
  }, [status, session, router]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/video-library/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to Load Categories', {
        description: 'Could not fetch video library categories.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryVideos = async (categoryId: string) => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/video-library/categories/${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.category?.videos || []);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to Load Videos', {
        description: 'Could not fetch videos for this category.'
      });
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleOpenCategory = (category: VideoCategory) => {
    setSelectedCategory(category);
    loadCategoryVideos(category.id);
  };

  const handleBackToList = () => {
    setSelectedCategory(null);
    setVideos([]);
  };

  const openAddDialog = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', thumbnailUrl: '', driveUrl: '', sortOrder: 0 });
    setShowAddDialog(true);
  };

  const openEditDialog = (category: VideoCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      thumbnailUrl: category.thumbnailUrl || '',
      driveUrl: category.driveUrl,
      sortOrder: category.sortOrder,
    });
    setShowAddDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name || !formData.driveUrl) {
      toast.error('Missing Fields', {
        description: 'Name and Drive URL are required.'
      });
      return;
    }

    setSaving(true);

    try {
      if (editingCategory) {
        // Update existing category
        const res = await fetch(`/api/video-library/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success('Category Updated', {
            description: `${formData.name} has been updated. ${data.videosFetched ? `Fetched ${data.videosFetched} videos.` : ''}`
          });
          loadCategories();
          setShowAddDialog(false);
        } else {
          throw new Error(data.error || 'Failed to update category');
        }
      } else {
        // Create new category
        const res = await fetch('/api/video-library/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success('Category Created', {
            description: `${formData.name} created with ${data.videosSaved ?? data.videosFetched ?? 0} videos saved.`
          });
          // Add the new category directly to state with correct count, then reload
          if (data.category) {
            setCategories(prev => [...prev, data.category]);
          }
          setShowAddDialog(false);
          // Reload after short delay to ensure DB consistency
          setTimeout(() => loadCategories(), 500);
        } else {
          throw new Error(data.error || 'Failed to create category');
        }
      }
    } catch (error: any) {
      toast.error('Save Failed', {
        description: error.message || 'Could not save category.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/video-library/categories/${deleteCategoryId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Category Deleted', {
          description: 'The category and all its videos have been removed.'
        });
        setCategories(categories.filter(c => c.id !== deleteCategoryId));
        if (selectedCategory?.id === deleteCategoryId) {
          setSelectedCategory(null);
          setVideos([]);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error: any) {
      toast.error('Delete Failed', {
        description: error.message
      });
    } finally {
      setDeleting(false);
      setDeleteCategoryId(null);
    }
  };

  const handleSyncVideos = async (categoryId: string) => {
    setSyncingCategoryId(categoryId);

    try {
      const res = await fetch(`/api/video-library/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync: true }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Videos Synced', {
          description: `Found ${data.newVideosFetched} new videos. Total: ${data.totalVideos}`
        });
        if (selectedCategory?.id === categoryId) {
          loadCategoryVideos(categoryId);
        }
        loadCategories();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error('Sync Failed', {
        description: error.message
      });
    } finally {
      setSyncingCategoryId(null);
    }
  };

  const handleImportFolder = async () => {
    if (!importDriveUrl.trim() || !selectedCategory) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/video-library/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importDriveUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Folder Imported', {
          description: `${data.imported} videos imported. Total: ${data.totalVideos} videos in category.`
        });
        setShowImportDialog(false);
        setImportDriveUrl('');
        loadCategoryVideos(selectedCategory.id);
        loadCategories();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error('Import Failed', { description: error.message });
    } finally {
      setImporting(false);
    }
  };

  const handleFetchDurations = async () => {
    setFetchingDurations(true);
    try {
      // First check stats
      const statsRes = await fetch('/api/admin/video-library/fetch-durations');
      const stats = await statsRes.json();
      setDurationStats(stats);

      if (stats.pending === 0) {
        toast.info('All videos already have duration data');
        return;
      }

      toast.info(`Fetching durations for ${stats.pending} videos... This may take a while.`);

      const res = await fetch('/api/admin/video-library/fetch-durations', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success('Durations Fetched', { description: data.message });
        const newStats = await fetch('/api/admin/video-library/fetch-durations').then(r => r.json());
        setDurationStats(newStats);
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (error: any) {
      toast.error('Failed to fetch durations', { description: error.message });
    } finally {
      setFetchingDurations(false);
    }
  };

  const handleToggleActive = async (category: VideoCategory) => {
    try {
      const res = await fetch(`/api/video-library/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (res.ok) {
        toast.success(category.isActive ? 'Category Deactivated' : 'Category Activated', {
          description: `${category.name} is now ${category.isActive ? 'hidden' : 'visible'} to users.`
        });
        loadCategories();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
    } catch (error: any) {
      toast.error('Update Failed', {
        description: error.message
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Video List View
  if (selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedCategory.name}</h1>
                <p className="text-muted-foreground">
                  {videos.length} videos • {selectedCategory.description || 'No description'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setImportDriveUrl(''); setShowImportDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Import Folder
              </Button>
              <Button
                onClick={() => handleSyncVideos(selectedCategory.id)}
                disabled={syncingCategoryId === selectedCategory.id}
              >
                {syncingCategoryId === selectedCategory.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Videos
              </Button>
            </div>

            {/* Import extra folder dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import from Another Folder</DialogTitle>
                  <DialogDescription>
                    Paste a Google Drive folder link to import more videos into <strong>{selectedCategory.name}</strong>.
                    Existing videos won't be duplicated.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label>Google Drive Folder URL</Label>
                  <Input
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={importDriveUrl}
                    onChange={(e) => setImportDriveUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportFolder()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
                  <Button onClick={handleImportFolder} disabled={importing || !importDriveUrl.trim()}>
                    {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : 'Import Videos'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Drive URL */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Source:</span>
                <a
                  href={selectedCategory.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {selectedCategory.driveUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Videos Grid */}
          {loadingVideos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No videos found in this category.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Make sure the Google Drive folder is publicly accessible.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video) => {
                return (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                      <DriveThumbnail
                        driveFileId={video.driveFileId}
                        thumbnailUrl={video.thumbnailLink}
                        name={video.name}
                        className="w-full h-full"
                      />
                      {video.addedToQueue && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        </div>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 right-2 text-xs bg-black/60 text-white border-0"
                      >
                        {formatFileSize(video.size)}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate" title={video.name}>
                        {video.name.replace(/\.[^/.]+$/, '')}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {video.createdTime ? new Date(video.createdTime).toLocaleDateString() : 'Unknown date'}
                        </span>
                        {video.webViewLink && (
                          <a
                            href={video.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Categories List View
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-muted-foreground">Manage video categories from Google Drive</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              Back to Admin
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchDurations}
              disabled={fetchingDurations}
              title="Fetch video durations from Google Drive to enable 60s filter"
            >
              {fetchingDurations ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching Durations...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Fetch Durations</>
              )}
            </Button>
            {durationStats && (
              <span className="text-xs text-muted-foreground">
                {durationStats.done}/{durationStats.total} done
              </span>
            )}
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No categories yet</p>
              <p className="text-muted-foreground mb-4">
                Create a category and add a Google Drive folder URL to automatically fetch videos.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                  !category.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Thumbnail */}
                {category.thumbnailUrl && (
                  <div className="w-full h-36 overflow-hidden">
                    <img
                      src={category.thumbnailUrl}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-yellow-500" />
                      {category.name}
                    </CardTitle>
                    <Badge variant={category.isActive ? 'default' : 'secondary'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {category.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Video className="h-4 w-4" />
                      {category.videoCount || 0} videos
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCategory(category)}
                      >
                        View Videos
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSyncVideos(category.id)}
                        disabled={syncingCategoryId === category.id}
                      >
                        {syncingCategoryId === category.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteCategoryId(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Update the category details. Changing the Drive URL will re-fetch all videos.'
                  : 'Add a Google Drive folder URL. Videos will be automatically fetched.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Motivation Videos, Tech Tutorials"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Category Thumbnail</Label>
                {formData.thumbnailUrl && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                    <img
                      src={formData.thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 w-full h-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-muted/50'}`}>
                  {uploadingImage ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Uploading...</span></>
                  ) : (
                    <><Upload className="h-4 w-4" /><span className="text-sm">{formData.thumbnailUrl ? 'Change Image' : 'Upload Image'}</span></>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (data.url) {
                          setFormData(prev => ({ ...prev, thumbnailUrl: data.url }));
                        } else {
                          throw new Error(data.error || 'Upload failed');
                        }
                      } catch (err: any) {
                        toast.error('Upload Failed', { description: err.message });
                      } finally {
                        setUploadingImage(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF supported</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driveUrl">Google Drive Folder URL *</Label>
                <Input
                  id="driveUrl"
                  value={formData.driveUrl}
                  onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <p className="text-xs text-muted-foreground">
                  Make sure the folder is shared publicly (Anyone with the link can view)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingCategory ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingCategory ? 'Update Category' : 'Create Category'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this category and all {categories.find(c => c.id === deleteCategoryId)?.videoCount || 0} videos.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}