'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  FolderOpen,
  Video,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  ChevronRight,
  GripVertical,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { items: number };
  items?: Item[];
}

interface Item {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  driveFileId: string | null;
  driveFolderUrl: string | null;
  thumbnailUrl: string | null;
  fileSize: number | null;
  duration: number | null;
  mimeType: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function VideoLibraryAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '📁',
    sortOrder: 0,
    isActive: true,
  });
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    driveFileId: '',
    driveFolderUrl: '',
    thumbnailUrl: '',
    fileSize: null as number | null,
    sortOrder: 0,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);

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
      const res = await fetch('/api/admin/video-library/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryItems = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/admin/video-library/categories/${categoryId}`);
      const data = await res.json();
      if (data.category) {
        setSelectedCategory(data.category);
        setItems(data.category.items || []);
      }
    } catch (error) {
      toast.error('Failed to load items');
    }
  };

  // Category CRUD
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '📁',
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        icon: '📁',
        sortOrder: categories.length,
        isActive: true,
      });
    }
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/video-library/categories/${editingCategory.id}`
        : '/api/admin/video-library/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setCategoryDialogOpen(false);
        loadCategories();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/admin/video-library/categories/${categoryId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Category deleted');
        loadCategories();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  // Item CRUD
  const openItemDialog = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        categoryId: item.categoryId,
        title: item.title,
        description: item.description || '',
        driveFileId: item.driveFileId || '',
        driveFolderUrl: item.driveFolderUrl || '',
        thumbnailUrl: item.thumbnailUrl || '',
        fileSize: item.fileSize,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        categoryId: selectedCategory?.id || '',
        title: '',
        description: '',
        driveFileId: '',
        driveFolderUrl: '',
        thumbnailUrl: '',
        fileSize: null,
        sortOrder: items.length,
        isActive: true,
      });
    }
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.title || !itemForm.categoryId) {
      toast.error('Title and category are required');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/video-library/items/${editingItem.id}`
        : '/api/admin/video-library/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingItem ? 'Item updated' : 'Item created');
        setItemDialogOpen(false);
        if (selectedCategory) {
          loadCategoryItems(selectedCategory.id);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deletingItem) return;

    try {
      const res = await fetch(`/api/admin/video-library/items/${deletingItem.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Item deleted');
        setDeleteDialogOpen(false);
        setDeletingItem(null);
        if (selectedCategory) {
          loadCategoryItems(selectedCategory.id);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => selectedCategory ? setSelectedCategory(null) : router.push('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{selectedCategory ? 'Categories' : 'Admin'}</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">
                {selectedCategory ? selectedCategory.name : 'Video Library'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedCategory ? 'Manage videos in this category' : 'Manage video categories and content'}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => selectedCategory ? openItemDialog() : openCategoryDialog()}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-8 sm:h-10 text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {selectedCategory ? 'Add Video' : 'Add Category'}
          </Button>
        </div>

        {/* Categories List */}
        {!selectedCategory && (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-lg transition cursor-pointer group">
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex items-center gap-2 sm:gap-3 flex-1"
                      onClick={() => loadCategoryItems(category.id)}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg sm:text-xl">
                        {category.icon || '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate">{category.name}</CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs">
                          {category._count?.items || 0} videos
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategoryDialog(category);
                        }}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this category and all its videos?')) {
                            deleteCategory(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0" onClick={() => loadCategoryItems(category.id)}>
                  {category.description && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 line-clamp-2">{category.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant={category.isActive ? 'default' : 'secondary'} className={`text-[9px] sm:text-[10px] ${category.isActive ? 'bg-green-500' : ''}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {categories.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 border-dashed">
                <CardContent className="p-6 sm:p-8 text-center">
                  <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">No categories yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Create your first category to organize videos</p>
                  <Button onClick={() => openCategoryDialog()} className="h-8 sm:h-10 text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add Category
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Items List */}
        {selectedCategory && (
          <div className="space-y-3 sm:space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 sm:w-24 sm:h-16 rounded-md sm:rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">{item.title}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {item.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                        <Badge variant={item.isActive ? 'default' : 'secondary'} className={`text-[8px] sm:text-[10px] ${item.isActive ? 'bg-green-500' : ''}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {item.driveFileId && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px]">Drive</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        onClick={() => openItemDialog(item)}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => {
                          setDeletingItem(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {items.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-6 sm:p-8 text-center">
                  <Video className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">No videos in this category</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Add videos to make them available to users</p>
                  <Button onClick={() => openItemDialog()} className="h-8 sm:h-10 text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add Video
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update category details' : 'Create a new video category'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Icon</Label>
                <Input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="📁"
                  className="h-8 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Name *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Category name"
                  className="h-8 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Active</Label>
                <Switch
                  checked={categoryForm.isActive}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="h-8 sm:h-10 text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={saveCategory} disabled={saving} className="h-8 sm:h-10 text-xs sm:text-sm">
                {saving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Video' : 'Add Video'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update video details' : 'Add a new video to the library'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Title *</Label>
                <Input
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Video title"
                  className="h-8 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Video description"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Google Drive File ID</Label>
                <Input
                  value={itemForm.driveFileId}
                  onChange={(e) => setItemForm({ ...itemForm, driveFileId: e.target.value })}
                  placeholder="e.g., 1abc123xyz..."
                  className="h-8 sm:h-10 text-sm font-mono text-xs"
                />
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                  The file ID from Google Drive URL
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Or Google Drive Folder URL</Label>
                <Input
                  value={itemForm.driveFolderUrl}
                  onChange={(e) => setItemForm({ ...itemForm, driveFolderUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="h-8 sm:h-10 text-sm text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Thumbnail URL</Label>
                <Input
                  value={itemForm.thumbnailUrl}
                  onChange={(e) => setItemForm({ ...itemForm, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-8 sm:h-10 text-sm text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Active</Label>
                <Switch
                  checked={itemForm.isActive}
                  onCheckedChange={(checked) => setItemForm({ ...itemForm, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemDialogOpen(false)} className="h-8 sm:h-10 text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={saveItem} disabled={saving} className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-8 sm:h-10 text-xs sm:text-sm">
                {saving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" /> : null}
                Save Video
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deletingItem?.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteItem} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}