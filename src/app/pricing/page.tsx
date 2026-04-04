'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  Rocket,
  Star,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
  aiCreditsPerMonth: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

// Declare Razorpay type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || 'loading';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    loadPlans();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('[Pricing] Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      if (data.subscription?.plan?.name) {
        setCurrentPlan(data.subscription.plan.name);
      }
    } catch (error) {
      // User might not have a subscription yet
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    // Check if user is logged in
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
        // For free plan, create subscription directly
        const res = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id }),
        });
        const data = await res.json();
        
        if (data.success) {
          toast.success('Free plan activated successfully!');
          setCurrentPlan('free');
          router.push('/');
        } else {
          throw new Error(data.error || 'Failed to activate plan');
        }
      } else {
        // For paid plans, initiate Razorpay payment
        if (!razorpayLoaded) {
          throw new Error('Payment gateway is loading. Please try again.');
        }

        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: plan.id,
            billingPeriod,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create payment');
        }

        if (data.orderId) {
          // Check if demo mode
          if (data.demoMode) {
            // Handle demo payment flow
            handleDemoPayment(data, plan);
          } else {
            // Open Razorpay checkout
            openRazorpayCheckout(data, plan);
          }
        } else {
          throw new Error('Invalid payment response');
        }
      }
    } catch (error: any) {
      console.error('[Pricing] Error:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleDemoPayment = async (orderData: any, plan: Plan) => {
    // Show demo payment confirmation
    const confirmed = confirm(
      `Demo Mode\n\nPlan: ${plan.displayName}\nAmount: ₹${(orderData.amount / 100).toLocaleString('en-IN')}\n\nThis is a demo payment. Click OK to simulate successful payment.`
    );
    
    if (!confirmed) {
      setProcessingPlan(null);
      toast.info('Payment cancelled');
      return;
    }

    try {
      // Simulate payment verification
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
        toast.success('Demo payment successful! Plan activated.', {
          description: 'This was a simulated payment. Configure Razorpay credentials for real payments.',
        });
        setCurrentPlan(plan.name);
        router.push('/');
      } else {
        throw new Error(verifyData.error || 'Payment verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment verification failed');
    } finally {
      setProcessingPlan(null);
    }
  };

  const openRazorpayCheckout = (orderData: any, plan: Plan) => {
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'GPMart Studio',
      description: `${plan.displayName} - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}`,
      handler: async (response: any) => {
        try {
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
            router.push('/');
          } else {
            throw new Error(verifyData.error || 'Payment verification failed');
          }
        } catch (error: any) {
          toast.error(error.message || 'Payment verification failed');
        }
      },
      prefill: {
        name: session?.user?.name || '',
        email: session?.user?.email || '',
      },
      theme: {
        color: '#ef4444', // Red color matching YouTube theme
      },
      modal: {
        ondismiss: () => {
          setProcessingPlan(null);
          toast.info('Payment cancelled');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // priceINR is stored in paise — divide by 100 to display in rupees
  const formatPrice = (price: number) => {
    return `₹${(price / 100).toLocaleString('en-IN')}`;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free':
        return <Sparkles className="h-6 w-6" />;
      case 'starter':
        return <Star className="h-6 w-6" />;
      case 'basic':
        return <Rocket className="h-6 w-6" />;
      case 'pro':
        return <Zap className="h-6 w-6" />;
      case 'premium':
        return <Crown className="h-6 w-6" />;
      default:
        return <Sparkles className="h-6 w-6" />;
    }
  };

  const getPlanGradient = (planName: string) => {
    switch (planName) {
      case 'free':
        return 'from-gray-500 to-gray-600';
      case 'starter':
        return 'from-teal-400 to-cyan-500';
      case 'basic':
        return 'from-green-500 to-emerald-600';
      case 'pro':
        return 'from-blue-500 to-indigo-600';
      case 'premium':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">Choose Your Plan</h1>
          <p className="text-xs text-muted-foreground">Upgrade as you grow</p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 py-2">
        <Label htmlFor="billing-toggle" className={billingPeriod === 'monthly' ? 'font-semibold text-sm' : 'text-muted-foreground text-sm'}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingPeriod === 'yearly'}
          onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="billing-toggle" className={billingPeriod === 'yearly' ? 'font-semibold text-sm' : 'text-muted-foreground text-sm'}>
            Yearly
          </Label>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
            Save 25%
          </Badge>
        </div>
      </div>

      {/* Plans — stacked on mobile, side-by-side on md+ */}
      {plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No plans available.</p>
          <Button onClick={loadPlans}>Retry</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.name === currentPlan;
            const price = billingPeriod === 'monthly'
              ? formatPrice(plan.priceINR)
              : formatPrice(plan.yearlyPriceINR);
            const isProcessing = processingPlan === plan.name;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-200 ${
                  plan.name === 'pro'
                    ? 'border-2 border-indigo-500 shadow-lg'
                    : 'border hover:shadow-md'
                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
              >
                  {plan.name === 'pro' && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-1 text-xs font-medium">
                      Most Popular
                    </div>
                  )}
                  
                  <CardHeader className={`${plan.name === 'pro' ? 'pt-8' : ''} pb-3`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanGradient(plan.name)} text-white flex items-center justify-center mb-4`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold">{price}</span>
                        <span className="text-muted-foreground">
                          /{billingPeriod === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingPeriod === 'yearly' && plan.yearlyDiscountPercent && (
                        <p className="text-sm text-green-600 mt-1">
                          Save {plan.yearlyDiscountPercent}% with yearly billing
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={plan.name === 'pro' || plan.name === 'premium' ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isProcessing || isCurrentPlan}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Current Plan
                        </>
                      ) : plan.name === 'free' ? (
                        'Get Started'
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

      {/* Trust Section */}
      <div className="text-center py-2 pb-4">
        <p className="text-xs text-muted-foreground">
          7-day free trial · Cancel anytime · No questions asked
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-green-500" />
            Secure payments
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-green-500" />
            GST Invoice
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-green-500" />
            24/7 Support
          </span>
        </div>
      </div>
    </div>
  );
}
