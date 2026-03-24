'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Zap,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceINR: number;
  priceUSD: number;
  yearlyPriceINR: number;
  yearlyPriceUSD: number;
  yearlyDiscountPercent: number | null;
  maxVideosPerMonth: number;
  maxChannels: number;
  maxStorageMB: number;
  maxVideoSizeMB: number;
  aiCreditsPerMonth: number;
  features: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: { subscriptions: number };
}

const defaultFormData = {
  name: '',
  displayName: '',
  description: '',
  priceINR: '0',
  priceUSD: '0',
  yearlyPriceINR: '0',
  yearlyPriceUSD: '0',
  yearlyDiscountPercent: '',
  maxVideosPerMonth: '10',
  maxChannels: '1',
  maxStorageMB: '500',
  maxVideoSizeMB: '100',
  aiCreditsPerMonth: '10',
  features: '',
  isActive: true,
  sortOrder: '0',
};

export default function AdminPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      loadPlans();
    }
  }, [status, session, router]);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      priceINR: plan.priceINR.toString(),
      priceUSD: plan.priceUSD.toString(),
      yearlyPriceINR: plan.yearlyPriceINR.toString(),
      yearlyPriceUSD: plan.yearlyPriceUSD.toString(),
      yearlyDiscountPercent: plan.yearlyDiscountPercent?.toString() || '',
      maxVideosPerMonth: plan.maxVideosPerMonth.toString(),
      maxChannels: plan.maxChannels.toString(),
      maxStorageMB: plan.maxStorageMB.toString(),
      maxVideoSizeMB: plan.maxVideoSizeMB.toString(),
      aiCreditsPerMonth: plan.aiCreditsPerMonth.toString(),
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder.toString(),
    });
    setDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name || !formData.displayName) {
      toast.error('Name and display name are required');
      return;
    }

    setSaving(true);
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || null,
        priceINR: parseInt(formData.priceINR) || 0,
        priceUSD: parseInt(formData.priceUSD) || 0,
        yearlyPriceINR: parseInt(formData.yearlyPriceINR) || 0,
        yearlyPriceUSD: parseInt(formData.yearlyPriceUSD) || 0,
        yearlyDiscountPercent: formData.yearlyDiscountPercent ? parseInt(formData.yearlyDiscountPercent) : null,
        maxVideosPerMonth: parseInt(formData.maxVideosPerMonth) || 10,
        maxChannels: parseInt(formData.maxChannels) || 1,
        maxStorageMB: parseInt(formData.maxStorageMB) || 500,
        maxVideoSizeMB: parseInt(formData.maxVideoSizeMB) || 100,
        aiCreditsPerMonth: parseInt(formData.aiCreditsPerMonth) || 10,
        features: parseFeatures(formData.features),
        isActive: formData.isActive,
        sortOrder: parseInt(formData.sortOrder) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
        setDialogOpen(false);
        loadPlans();
      } else {
        throw new Error(data.error || 'Failed to save plan');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      if (res.ok) {
        toast.success(`Plan ${!plan.isActive ? 'activated' : 'deactivated'}`);
        loadPlans();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update plan');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openDeleteDialog = (plan: Plan) => {
    setDeletingPlan(plan);
    setDeleteDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;

    try {
      const res = await fetch(`/api/admin/plans/${deletingPlan.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Plan deleted successfully');
        setDeleteDialogOpen(false);
        setDeletingPlan(null);
        loadPlans();
      } else {
        throw new Error(data.error || 'Failed to delete plan');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const parseFeatures = (featuresStr: string): string[] => {
    try {
      const parsed = JSON.parse(featuresStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If not JSON, treat as comma-separated
      return featuresStr.split(',').map(f => f.trim()).filter(f => f);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free':
        return <Sparkles className="h-5 w-5" />;
      case 'pro':
        return <Zap className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPlanGradient = (planName: string) => {
    switch (planName) {
      case 'free':
        return 'from-gray-500 to-gray-600';
      case 'pro':
        return 'from-blue-500 to-indigo-600';
      case 'premium':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-green-500 to-teal-600';
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Plan Management</h1>
              <p className="text-muted-foreground">Create and manage subscription plans</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Plans ({plans.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price (Monthly)</TableHead>
                    <TableHead>Price (Yearly)</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Subscribers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id} className={!plan.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getPlanGradient(plan.name)} text-white flex items-center justify-center`}>
                            {getPlanIcon(plan.name)}
                          </div>
                          <div>
                            <div className="font-medium">{plan.displayName}</div>
                            <div className="text-sm text-muted-foreground">{plan.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{plan.priceINR.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">${plan.priceUSD}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{plan.yearlyPriceINR.toLocaleString()}</div>
                        {plan.yearlyDiscountPercent && (
                          <div className="text-sm text-green-600">{plan.yearlyDiscountPercent}% off</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{plan.maxVideosPerMonth} videos/mo</div>
                          <div>{plan.maxChannels} channel{plan.maxChannels > 1 ? 's' : ''}</div>
                          <div>{plan.maxStorageMB >= 1024 ? `${plan.maxStorageMB / 1024}GB` : `${plan.maxStorageMB}MB`}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {plan._count?.subscriptions || 0} users
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.isActive}
                          onCheckedChange={() => handleToggleActive(plan)}
                        />
                      </TableCell>
                      <TableCell>{plan.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(plan)}
                            disabled={(plan._count?.subscriptions || 0) > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the plan details below'
                : 'Fill in the details for the new plan'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name (ID) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., basic, pro, premium"
                  disabled={!!editingPlan}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., Pro Plan"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of the plan"
              />
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Monthly Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceINR">Price (INR) ₹</Label>
                  <Input
                    id="priceINR"
                    type="number"
                    value={formData.priceINR}
                    onChange={(e) => setFormData({ ...formData, priceINR: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceUSD">Price (USD) $</Label>
                  <Input
                    id="priceUSD"
                    type="number"
                    value={formData.priceUSD}
                    onChange={(e) => setFormData({ ...formData, priceUSD: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Yearly Pricing</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearlyPriceINR">Yearly Price (INR) ₹</Label>
                  <Input
                    id="yearlyPriceINR"
                    type="number"
                    value={formData.yearlyPriceINR}
                    onChange={(e) => setFormData({ ...formData, yearlyPriceINR: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearlyPriceUSD">Yearly Price (USD) $</Label>
                  <Input
                    id="yearlyPriceUSD"
                    type="number"
                    value={formData.yearlyPriceUSD}
                    onChange={(e) => setFormData({ ...formData, yearlyPriceUSD: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearlyDiscountPercent">Discount %</Label>
                  <Input
                    id="yearlyDiscountPercent"
                    type="number"
                    value={formData.yearlyDiscountPercent}
                    onChange={(e) => setFormData({ ...formData, yearlyDiscountPercent: e.target.value })}
                    placeholder="e.g., 20"
                  />
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Plan Limits</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxVideosPerMonth">Videos/Month</Label>
                  <Input
                    id="maxVideosPerMonth"
                    type="number"
                    value={formData.maxVideosPerMonth}
                    onChange={(e) => setFormData({ ...formData, maxVideosPerMonth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxChannels">Max Channels</Label>
                  <Input
                    id="maxChannels"
                    type="number"
                    value={formData.maxChannels}
                    onChange={(e) => setFormData({ ...formData, maxChannels: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStorageMB">Storage (MB)</Label>
                  <Input
                    id="maxStorageMB"
                    type="number"
                    value={formData.maxStorageMB}
                    onChange={(e) => setFormData({ ...formData, maxStorageMB: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxVideoSizeMB">Max Video Size (MB)</Label>
                  <Input
                    id="maxVideoSizeMB"
                    type="number"
                    value={formData.maxVideoSizeMB}
                    onChange={(e) => setFormData({ ...formData, maxVideoSizeMB: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aiCreditsPerMonth">AI Credits/Month</Label>
                  <Input
                    id="aiCreditsPerMonth"
                    type="number"
                    value={formData.aiCreditsPerMonth}
                    onChange={(e) => setFormData({ ...formData, aiCreditsPerMonth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="features">Features (comma-separated or JSON array)</Label>
                <Input
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder='["Feature 1", "Feature 2"] or Feature 1, Feature 2'
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 border-t pt-4">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active (visible to users)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingPlan?.displayName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              This plan has <strong>{deletingPlan?._count?.subscriptions || 0}</strong> subscriber(s).
              You can only delete plans with no subscribers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={(deletingPlan?._count?.subscriptions || 0) > 0}
            >
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}