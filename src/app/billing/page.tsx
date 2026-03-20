'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Download,
  Loader2,
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  gstAmount: number | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: string;
    displayName: string;
    maxVideosPerMonth: number;
    maxChannels: number;
    maxStorageMB: number;
    aiCreditsPerMonth: number;
  };
}

export default function BillingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      // Load subscription
      const subRes = await fetch('/api/subscription');
      const subData = await subRes.json();
      if (subData.subscription) {
        setSubscription(subData.subscription);
      }

      // Load payments
      const payRes = await fetch('/api/payments');
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments || []);
      }
    } catch (error) {
      console.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the current billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Subscription cancelled', {
          description: 'Your subscription will end at the current billing period.',
        });
        loadData();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${(amount / 100).toLocaleString('en-IN')}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your subscription details and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">
                      {subscription.plan.displayName}
                    </h3>
                    {getStatusBadge(subscription.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscription.cancelAtPeriodEnd 
                      ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push('/pricing')}>
                    Change Plan
                  </Button>
                  {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Cancel'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Plan Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Videos/Month</p>
                  <p className="text-xl font-bold">{subscription.plan.maxVideosPerMonth}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Channels</p>
                  <p className="text-xl font-bold">{subscription.plan.maxChannels}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Storage</p>
                  <p className="text-xl font-bold">
                    {subscription.plan.maxStorageMB >= 1024 
                      ? `${subscription.plan.maxStorageMB / 1024}GB` 
                      : `${subscription.plan.maxStorageMB}MB`
                    }
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">AI Credits</p>
                  <p className="text-xl font-bold">{subscription.plan.aiCreditsPerMonth}</p>
                </div>
              </div>

              {/* Trial Info */}
              {subscription.trialEndsAt && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Trial ends on {formatDate(subscription.trialEndsAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active subscription</p>
              <Button onClick={() => router.push('/pricing')}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            View your past payments and download invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(payment.amount, payment.currency)}
                          {payment.gstAmount && (
                            <p className="text-xs text-muted-foreground">
                              incl. GST: {formatCurrency(payment.gstAmount, payment.currency)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className="capitalize">{payment.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.invoiceUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" />
                              Invoice
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payment history yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}