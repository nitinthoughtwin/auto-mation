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
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      console.log('[Pricing] Loaded plans:', data);
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
          toast.success('Plan activated successfully!');
          setCurrentPlan('free');
        } else {
          throw new Error(data.error || 'Failed to activate plan');
        }
      } else {
        toast.info('Payment integration coming soon!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process plan selection');
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free':
        return <Sparkles className="h-6 w-6" />;
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4 sm:mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Start for free and upgrade as you grow. All plans include core YouTube automation features.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8 sm:mb-12">
          <Label htmlFor="billing-toggle" className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === 'yearly'}
            onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className={billingPeriod === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
              Yearly
            </Label>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Save up to 25%
            </Badge>
          </div>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No plans available.</p>
            <Button onClick={loadPlans}>Retry</Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3 max-w-6xl mx-auto px-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.name === currentPlan;
              const price = billingPeriod === 'monthly' 
                ? formatPrice(plan.priceINR)
                : formatPrice(plan.yearlyPriceINR);
              const isProcessing = processingPlan === plan.name;

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    plan.name === 'pro' 
                      ? 'border-2 border-indigo-500 shadow-xl scale-105 z-10' 
                      : 'border hover:shadow-lg'
                  } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                >
                  {plan.name === 'pro' && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-center py-1 text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  
                  <CardHeader className={plan.name === 'pro' ? 'pt-8' : ''}>
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
                      variant={plan.name === 'pro' ? 'default' : 'outline'}
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
        <div className="mt-12 sm:mt-16 text-center px-4">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. Cancel anytime. No questions asked.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Secure payments via Razorpay & Stripe
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              GST Invoice included
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              24/7 Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}