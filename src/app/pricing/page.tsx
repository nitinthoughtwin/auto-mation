'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Zap, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceINR: number;
  yearlyPriceINR: number;
  yearlyDiscountPercent: number | null;
  maxVideosPerMonth: number;
  aiCreditsPerMonth: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

declare global {
  interface Window { Razorpay: any; }
}

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  // Pro billing toggle: monthly or quarterly
  const [proBilling, setProBilling] = useState<'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    Promise.all([loadPlans(), loadCurrentSubscription()]);
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (Array.isArray(data.plans)) setPlans(data.plans);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      if (data.subscription?.plan?.name) setCurrentPlan(data.subscription.plan.name);
    } catch { /* no subscription yet */ }
  };

  const handleSelectPlan = async (plan: Plan, billingPeriod: 'monthly' | 'quarterly') => {
    if (status !== 'authenticated' || !session?.user) {
      toast.error('Please login to subscribe');
      router.push('/login');
      return;
    }
    if (plan.name === currentPlan) {
      toast.info('You are already on this plan');
      return;
    }

    setProcessingPlan(plan.name);

    try {
      if (plan.name === 'free') {
        const res = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Free plan activated!');
          setCurrentPlan('free');
          router.push('/dashboard');
        } else {
          throw new Error(data.error || 'Failed to activate plan');
        }
        return;
      }

      if (!razorpayLoaded) throw new Error('Payment gateway loading. Please try again.');

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, billingPeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      if (data.demoMode) {
        await handleDemoPayment(data, plan);
      } else {
        openRazorpayCheckout(data, plan, billingPeriod);
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleDemoPayment = async (orderData: any, plan: Plan) => {
    const amt = orderData.amount / 100;
    const confirmed = confirm(
      `Demo Mode\n\nPlan: ${plan.displayName}\nAmount: ₹${amt.toLocaleString('en-IN')}\n\nClick OK to simulate successful payment.`
    );
    if (!confirmed) { toast.info('Payment cancelled'); return; }

    const verifyRes = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `demo_pay_${Date.now()}`,
        razorpay_signature: 'demo_signature',
        demoMode: true,
      }),
    });
    const verifyData = await verifyRes.json();
    if (verifyData.success) {
      toast.success('Plan activated!');
      setCurrentPlan(plan.name);
      router.push('/dashboard');
    } else {
      throw new Error(verifyData.error || 'Payment verification failed');
    }
  };

  const openRazorpayCheckout = (orderData: any, plan: Plan, billingPeriod: string) => {
    const label = billingPeriod === 'quarterly' ? '3 Months' : 'Monthly';
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'GPMart AI Studio',
      description: `${plan.displayName} — ${label}`,
      handler: async (response: any) => {
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          toast.success('Payment successful! Plan activated.');
          setCurrentPlan(plan.name);
          router.push('/dashboard');
        } else {
          toast.error(verifyData.error || 'Payment verification failed');
        }
      },
      prefill: { name: session?.user?.name || '', email: session?.user?.email || '' },
      theme: { color: '#2563eb' },
      modal: { ondismiss: () => { setProcessingPlan(null); toast.info('Payment cancelled'); } },
    };
    new window.Razorpay(options).open();
  };

  const freePlan = plans.find(p => p.name === 'free');
  const proPlan = plans.find(p => p.name === 'pro');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">Choose Your Plan</h1>
          <p className="text-xs text-muted-foreground">Simple pricing, no surprises</p>
        </div>
      </div>

      {/* Free Plan */}
      {freePlan && (
        <div className={`border rounded-2xl p-5 space-y-4 ${currentPlan === 'free' ? 'border-green-400 bg-green-50/40 dark:bg-green-950/20' : 'border-border/60'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-bold text-base">{freePlan.displayName}</p>
                <p className="text-xs text-muted-foreground">{freePlan.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">₹0</p>
              <p className="text-xs text-muted-foreground">forever</p>
            </div>
          </div>

          <ul className="space-y-2">
            {freePlan.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            variant="outline"
            className="w-full h-10 rounded-xl font-semibold"
            onClick={() => handleSelectPlan(freePlan, 'monthly')}
            disabled={processingPlan === 'free' || currentPlan === 'free'}
          >
            {processingPlan === 'free' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {currentPlan === 'free' ? <><Check className="h-4 w-4 mr-2 text-green-500" />Current Plan</> : 'Get Started Free'}
          </Button>
        </div>
      )}

      {/* Pro Plan */}
      {proPlan && (
        <div className={`border-2 rounded-2xl p-5 space-y-4 ${currentPlan === 'pro' ? 'border-green-400 bg-green-50/40 dark:bg-green-950/20' : 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'}`}>
          {/* Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base">{proPlan.displayName}</p>
                  <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                </div>
                <p className="text-xs text-muted-foreground">{proPlan.description}</p>
              </div>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex gap-2 bg-muted/50 rounded-xl p-1">
            <button
              onClick={() => setProBilling('monthly')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                proBilling === 'monthly'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Monthly
              <span className="block text-xs font-normal">₹199/mo</span>
            </button>
            <button
              onClick={() => setProBilling('quarterly')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                proBilling === 'quarterly'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              3 Months
              <span className="block text-xs font-normal">₹499 total</span>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                Save ₹98
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center py-1">
            {proBilling === 'monthly' ? (
              <div>
                <span className="text-3xl font-extrabold">₹199</span>
                <span className="text-muted-foreground text-sm"> / month</span>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-extrabold">₹499</span>
                <span className="text-muted-foreground text-sm"> for 3 months</span>
                <p className="text-xs text-green-600 font-medium mt-0.5">₹166/month · Save ₹98</p>
              </div>
            )}
          </div>

          <ul className="space-y-2">
            {proPlan.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            className="w-full h-11 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => handleSelectPlan(proPlan, proBilling)}
            disabled={!!processingPlan || currentPlan === 'pro'}
          >
            {processingPlan === 'pro' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {currentPlan === 'pro'
              ? <><Check className="h-4 w-4 mr-2" />Current Plan</>
              : proBilling === 'quarterly'
                ? 'Subscribe — ₹499 for 3 Months'
                : 'Subscribe — ₹199/month'
            }
          </Button>
        </div>
      )}

      {/* Trust footer */}
      <div className="text-center space-y-2 pb-2">
        <p className="text-xs text-muted-foreground">Secure payments via Razorpay · Cancel anytime</p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:underline">Terms</a>
          <span>·</span>
          <a href="/refund-policy" className="hover:underline">Refund Policy</a>
        </div>
      </div>

    </div>
  );
}
