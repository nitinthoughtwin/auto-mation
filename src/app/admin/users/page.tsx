'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search, ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  name: string;
  displayName: string;
  priceINR: number;
  maxChannels: number;
  maxVideosPerMonth: number;
  maxStorageMB: number;
  aiCreditsPerMonth: number;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  subscription: {
    status: string;
    plan: { name: string; displayName: string };
  } | null;
}

export default function AdminUsersPage() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || 'loading';
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Plan change dialog
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planDialogUser, setPlanDialogUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      loadUsers();
      loadPlans();
    }
  }, [status, session, router]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/admin/set-plan');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const openPlanDialog = (user: User) => {
    setPlanDialogUser(user);
    setSelectedPlan(user.subscription?.plan?.name || '');
  };

  const changePlan = async () => {
    if (!planDialogUser || !selectedPlan) return;
    setChangingPlan(true);
    try {
      const res = await fetch('/api/admin/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: selectedPlan, userId: planDialogUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change plan');

      toast.success(`Plan changed to ${data.displayName}`, {
        description: `${planDialogUser.name || planDialogUser.email} is now on the ${data.displayName} plan.`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === planDialogUser.id
            ? {
                ...u,
                subscription: {
                  status: 'active',
                  plan: { name: selectedPlan, displayName: data.displayName },
                },
              }
            : u
        )
      );
      setPlanDialogUser(null);
    } catch (error: any) {
      toast.error('Failed to change plan', { description: error.message });
    } finally {
      setChangingPlan(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage all registered users</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {user.subscription?.plan?.displayName || 'Free'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.subscription?.status === 'active' ? 'default' : 'outline'}
                          className={user.subscription?.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                        >
                          {user.subscription?.status || 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPlanDialog(user)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Change Plan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={!!planDialogUser} onOpenChange={() => setPlanDialogUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">User</p>
              <p className="font-medium">{planDialogUser?.name || planDialogUser?.email}</p>
              <p className="text-xs text-muted-foreground">{planDialogUser?.email}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Select Plan</p>
              <div className="grid gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.name}
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      selectedPlan === plan.name
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{plan.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.maxChannels} ch · {plan.maxVideosPerMonth} videos/mo · {plan.aiCreditsPerMonth} AI credits
                        </p>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {plan.priceINR === 0 ? 'Free' : `₹${plan.priceINR}/mo`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogUser(null)}>
              Cancel
            </Button>
            <Button onClick={changePlan} disabled={!selectedPlan || changingPlan}>
              {changingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                'Apply Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
