'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Crown,
  Zap,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      const subRes = await fetch('/api/subscription');
      const subData = await subRes.json();
      if (subData.subscription) {
        setSubscription(subData.subscription);
      }

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
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Trial</Badge>;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm">Manage your subscription and payment history</p>
          </div>
        </div>

        {/* Current Plan */}
        <Card className="border-border/50 shadow-soft overflow-hidden">
          {subscription && (
            <div className="h-1.5 gradient-primary" />
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {subscription ? (
                <>
                  <Crown className="h-5 w-5 text-amber-500" />
                  Current Plan
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  Subscription
                </>
              )}
            </CardTitle>
            <CardDescription>
              {subscription ? 'Your subscription details and benefits' : 'Choose a plan to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-6">
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold">{subscription.plan.displayName}</h3>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription.cancelAtPeriodEnd 
                        ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                        : `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/pricing')} 
                      className="flex-1 sm:flex-none h-10"
                    >
                      Change Plan
                    </Button>
                    {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                      <Button 
                        variant="ghost" 
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Videos/Month</p>
                    <p className="text-xl font-bold text-primary">{subscription.plan.maxVideosPerMonth}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/10">
                    <p className="text-xs text-muted-foreground mb-1">Channels</p>
                    <p className="text-xl font-bold text-emerald-600">{subscription.plan.maxChannels}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/5 to-violet-500/10 border border-violet-500/10">
                    <p className="text-xs text-muted-foreground mb-1">Storage</p>
                    <p className="text-xl font-bold text-violet-600">
                      {subscription.plan.maxStorageMB >= 1024 
                        ? `${subscription.plan.maxStorageMB / 1024}GB` 
                        : `${subscription.plan.maxStorageMB}MB`
                      }
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/10">
                    <p className="text-xs text-muted-foreground mb-1">AI Credits</p>
                    <p className="text-xl font-bold text-amber-600">{subscription.plan.aiCreditsPerMonth}</p>
                  </div>
                </div>

                {/* Trial Info */}
                {subscription.trialEndsAt && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-sm text-primary">
                        Trial ends on {formatDate(subscription.trialEndsAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold mb-1">No active subscription</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a plan to unlock all features
                </p>
                <Button 
                  onClick={() => router.push('/pricing')}
                  className="gradient-primary text-white shadow-lg shadow-primary/25"
                >
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
            <CardDescription>View your past payments and download invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {getStatusIcon(payment.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{formatDate(payment.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.invoiceNumber || 'Processing...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                      <div className="text-right sm:text-left">
                        <p className="text-base font-bold">{formatCurrency(payment.amount, payment.currency)}</p>
                        {payment.gstAmount && (
                          <p className="text-xs text-muted-foreground">
                            incl. GST: {formatCurrency(payment.gstAmount, payment.currency)}
                          </p>
                        )}
                      </div>
                      {payment.invoiceUrl ? (
                        <Button variant="outline" size="sm" className="h-8" asChild>
                          <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Invoice
                            <ExternalLink className="h-3 w-3 ml-1.5" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-border/50 shadow-soft bg-gradient-to-br from-primary/5 to-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Need help with billing?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Contact our support team for any billing related queries
                </p>
              </div>
              <Button variant="outline" className="h-10" asChild>
                <a href="mailto:support@gpmart.in">
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
