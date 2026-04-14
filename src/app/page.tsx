'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Play,
  Calendar,
  Zap,
  Shield,
  Globe,
  Check,
  Star,
  ArrowRight,
  Menu,
  X,
  Loader2,
  Youtube,
  Upload,
  Clock,
  Users,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// FEATURE DATA
// ============================================
const features = [
  {
    icon: <Upload className="h-6 w-6" />,
    title: 'Bulk Import from Google Drive',
    description: 'Bought a reels bundle? Import all videos directly from your Drive folder — no downloading, no re-uploading.',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Auto-Schedule Uploads',
    description: 'Set it once — daily, every 2 days, or weekly. Your videos go live automatically at the right time.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'AI Titles & Descriptions',
    description: 'Generate SEO-friendly titles, descriptions, and tags using AI. No more writing the same thing over and over.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: <Youtube className="h-6 w-6" />,
    title: 'Multiple YouTube Channels',
    description: 'Manage all your YouTube channels from one dashboard. Scale from 1 channel to many without extra effort.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Zero Manual Work',
    description: 'Once your queue is full and schedule is set, the system handles everything — you just watch the views come in.',
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: 'Multi-Platform (Coming Soon)',
    description: 'Upload the same reels to Instagram and Facebook automatically. One bundle, multiple income streams.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
];

// ============================================
// PRICING DATA
// ============================================
interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceINR: number;
  priceUSD: number;
  maxVideosPerMonth: number;
  maxChannels: number;
  maxStorageMB: number;
  aiCreditsPerMonth: number;
  features: string[];
  sortOrder: number;
}

// ============================================
// TESTIMONIAL DATA
// ============================================
const testimonials = [
  {
    name: 'Rahul Verma',
    role: 'YouTube Automation Creator',
    content: 'I bought a reels bundle and uploaded 90 videos in one go. GPMart AI Studio scheduled them automatically — I earned my first ₹5,000 from YouTube without recording a single video!',
    rating: 5,
    avatar: 'RV',
  },
  {
    name: 'Priya Sharma',
    role: 'New Creator, 3 Channels',
    content: 'I had no idea how to start on YouTube. This tool made it so simple — connect Drive, pick videos, set schedule. Done. My channels are growing every day on autopilot.',
    rating: 5,
    avatar: 'PS',
  },
  {
    name: 'Amit Patel',
    role: 'Reels Bundle Reseller',
    content: 'Managing 5 YouTube channels was a nightmare. Now I just dump the bundle into Drive and GPMart does the rest. Best investment for my YouTube automation business!',
    rating: 5,
    avatar: 'AP',
  },
];

// ============================================
// STATS DATA
// ============================================
const stats = [
  { label: 'Videos Uploaded', value: '10K+', icon: <Play className="h-5 w-5" /> },
  { label: 'Active Users', value: '500+', icon: <Users className="h-5 w-5" /> },
  { label: 'Uptime', value: '99.9%', icon: <Clock className="h-5 w-5" /> },
  { label: 'Support', value: '24/7', icon: <Shield className="h-5 w-5" /> },
];

// ============================================
// LANDING PAGE COMPONENT
// ============================================
export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => { if (data.plans) setPlans(data.plans); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================
          NAVIGATION
          ============================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass border-b border-border/50 shadow-soft'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                <Youtube className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                GPMart AI Studio
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Reviews
              </a>
              <Link
                href="/instructions"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Instructions
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="default" className="text-sm">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="gradient-primary gradient-primary-hover text-white shadow-lg shadow-primary/25 btn-press">
                  Get Started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-border/50 animate-fade-in">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#features"
                className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Reviews
              </a>
              <Link
                href="/instructions"
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="h-4 w-4" />
                Instructions
              </Link>
              <div className="pt-3 border-t border-border flex gap-3">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full gradient-primary text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-teal-500/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Turn reels bundles into YouTube income
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Start Earning from
            <span className="block mt-2 text-gradient">YouTube Today</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Buy a reels bundle, import from Google Drive, set a schedule — and let
            GPMart AI Studio upload to YouTube automatically every single day.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full gradient-primary gradient-primary-hover text-white shadow-xl shadow-primary/25 btn-press h-12 px-8 text-base"
              >
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/instructions" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 px-8 text-base"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                How It Works
              </Button>
            </Link>
          </div>

          {/* Trust Text */}
          <p className="mt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
            No credit card required • Free plan available • Cancel anytime
          </p>
        </div>
      </section>

      {/* ============================================
          STATS SECTION
          ============================================ */}
      <section className="py-12 sm:py-16 border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-background shadow-soft mb-3 text-primary">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          FEATURES SECTION
          ============================================ */}
      <section id="features" className="py-16 sm:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for{' '}
              <span className="text-gradient">YouTube Automation</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything a new creator or reels bundle buyer needs to build a
              profitable YouTube channel — without recording a single video.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft-lg transition-all duration-300 card-hover"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 ${feature.color} group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS SECTION
          ============================================ */}
      <section className="py-16 sm:py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get started in minutes with our simple 3-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Connect Your Channel',
                description: 'Sign up and connect your YouTube channel and Google Drive in under 2 minutes.',
              },
              {
                step: '2',
                title: 'Import Your Bundle',
                description: 'Import your reels bundle directly from Google Drive — no downloading needed.',
              },
              {
                step: '3',
                title: 'Earn on Autopilot',
                description: 'Set your upload schedule and relax. Videos go live automatically every day.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative text-center animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                {/* Connector Line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}

                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-lg shadow-primary/25">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          PRICING SECTION
          ============================================ */}
      <section id="pricing" className="py-16 sm:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent{' '}
              <span className="text-gradient">Pricing</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the plan that fits your needs. All plans include core
              features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {plans.length === 0 ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : plans.map((plan, index) => {
              const isPopular = index === 1;
              const isFree = plan.priceINR === 0;
              const storage = plan.maxStorageMB >= 1024
                ? `${plan.maxStorageMB / 1024}GB storage`
                : `${plan.maxStorageMB}MB storage`;
              const autoFeatures = [
                `${plan.maxVideosPerMonth} videos per month`,
                `${plan.maxChannels} YouTube channel${plan.maxChannels > 1 ? 's' : ''}`,
                storage,
                `${plan.aiCreditsPerMonth} AI credits`,
              ];
              const extraFeatures: string[] = Array.isArray(plan.features) ? plan.features : [];
              const allFeatures = [...autoFeatures, ...extraFeatures];

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-2xl bg-card border transition-all duration-300 ${
                    isPopular
                      ? 'border-primary/50 shadow-xl shadow-primary/10 md:scale-105 md:z-10'
                      : 'border-border/50 hover:border-primary/30 hover:shadow-soft-lg'
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                      Most Popular
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.displayName}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {isFree ? 'Free' : `₹${plan.priceINR.toLocaleString('en-IN')}`}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground ml-1">/month</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {allFeatures.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href={isFree ? '/signup' : '/pricing'} className="block">
                    <Button
                      className={`w-full btn-press ${
                        isPopular
                          ? 'gradient-primary gradient-primary-hover text-white shadow-lg shadow-primary/25'
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {isFree ? 'Start Free' : 'Get Started'}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          TESTIMONIALS SECTION
          ============================================ */}
      <section id="testimonials" className="py-16 sm:py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by <span className="text-gradient">Creators</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              See what our users are saying about GPMart AI Studio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border/50 shadow-soft"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-teal-500/10 border border-primary/20 text-center overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 -z-10 opacity-30">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Your YouTube Channel Won't Grow Itself
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Stop uploading manually. Start earning passively. Join hundreds of creators
              already running YouTube on autopilot with GPMart AI Studio.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="gradient-primary gradient-primary-hover text-white shadow-xl shadow-primary/25 btn-press h-12 sm:h-14 px-8"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="py-12 px-4 border-t border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <Youtube className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">GPMart AI Studio</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automate your YouTube workflow and grow your channel faster.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/instructions"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Instructions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:support@gpmart.in"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    support@gpmart.in
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} GPMart AI Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}