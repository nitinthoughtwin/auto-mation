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
        return <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-[9px] sm:text-[10px]">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500 text-[9px] sm:text-[10px]">Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-[9px] sm:text-[10px]">Cancelled</Badge>;
      case 'past_due':
        return <Badge variant="destructive" className="text-[9px] sm:text-[10px]">Past Due</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px] sm:text-[10px]">{status}</Badge>;
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Billing & Subscription</h1>
        </div>

        {/* Current Plan */}
        <Card className="border-0 shadow-lg overflow-hidden">
          {subscription && (
            <div className="h-1 sm:h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
          )}
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              {subscription ? (
                <>
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  Current Plan
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  Subscription
                </>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {subscription ? 'Your subscription details and benefits' : 'Choose a plan to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            {subscription ? (
              <div className="space-y-4 sm:space-y-6">
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold">
                        {subscription.plan.displayName}
                      </h3>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                      className="flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      Change Plan
                    </Button>
                    {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                      <Button 
                        variant="ghost" 
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        {cancelling ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Plan Limits */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Videos/Month</p>
                    <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">{subscription.plan.maxVideosPerMonth}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Channels</p>
                    <p className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400">{subscription.plan.maxChannels}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Storage</p>
                    <p className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                      {subscription.plan.maxStorageMB >= 1024 
                        ? `${subscription.plan.maxStorageMB / 1024}GB` 
                        : `${subscription.plan.maxStorageMB}MB`
                      }
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">AI Credits</p>
                    <p className="text-base sm:text-xl font-bold text-orange-600 dark:text-orange-400">{subscription.plan.aiCreditsPerMonth}</p>
                  </div>
                </div>

                {/* Trial Info */}
                {subscription.trialEndsAt && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                        Trial ends on {formatDate(subscription.trialEndsAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                </div>
                <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">No active subscription</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Choose a plan to unlock all features
                </p>
                <Button 
                  onClick={() => router.push('/pricing')}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              View your past payments and download invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            {payments.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {getStatusIcon(payment.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{formatDate(payment.createdAt)}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {payment.invoiceNumber || 'Processing...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
                      <div className="text-right sm:text-left">
                        <p className="text-sm sm:text-base font-bold">{formatCurrency(payment.amount, payment.currency)}</p>
                        {payment.gstAmount && (
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            incl. GST: {formatCurrency(payment.gstAmount, payment.currency)}
                          </p>
                        )}
                      </div>
                      {payment.invoiceUrl ? (
                        <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs" asChild>
                          <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                            Invoice
                            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
                <p className="text-xs sm:text-sm text-muted-foreground">No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="font-medium text-sm sm:text-base">Need help with billing?</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  Contact our support team for any billing related queries
                </p>
              </div>
              <Button 
                variant="outline" 
                className="h-8 sm:h-9 text-[10px] sm:text-xs"
                asChild
              >
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
