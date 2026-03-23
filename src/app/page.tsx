'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Youtube,
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
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Youtube className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />,
    title: 'YouTube Integration',
    description: 'Connect multiple YouTube channels and manage all your uploads from one dashboard.',
  },
  {
    icon: <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />,
    title: 'Smart Scheduling',
    description: 'Schedule videos to upload at optimal times. Set daily, weekly, or custom schedules.',
  },
  {
    icon: <Play className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />,
    title: 'Google Drive Import',
    description: 'Import videos directly from Google Drive. No need to download and re-upload.',
  },
  {
    icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />,
    title: 'AI-Powered',
    description: 'Generate titles, descriptions, and tags using AI. Save hours of manual work.',
  },
  {
    icon: <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with 99.9% uptime. Your data is always safe.',
  },
  {
    icon: <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500" />,
    title: 'Multi-Platform',
    description: 'Coming soon: Upload to Instagram, Facebook, and more platforms simultaneously.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '10 videos per month',
      '1 YouTube channel',
      '500MB storage',
      'Basic scheduling',
      'Email support',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    description: 'For growing creators',
    features: [
      '100 videos per month',
      '3 YouTube channels',
      '5GB storage',
      'Advanced scheduling',
      'Random delay feature',
      'Priority support',
      'Video analytics',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    price: '₹1,499',
    period: 'per month',
    description: 'For power users & agencies',
    features: [
      '1000 videos per month',
      '10 YouTube channels',
      '50GB storage',
      'All Pro features',
      'Multi-platform (coming soon)',
      'API access',
      'Dedicated support',
    ],
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Tech YouTuber',
    content: 'GPMart Studio saved me 10+ hours every week. The scheduling feature is a game-changer!',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Content Creator',
    content: 'Finally, a tool that handles all my YouTube uploads. The AI title generation is amazing!',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    role: 'Digital Marketer',
    content: 'Managing 5 YouTube channels was a nightmare. Now it takes just minutes. Highly recommended!',
    rating: 5,
  },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-sm sm:text-lg font-bold">GPMart Studio</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors text-sm">Reviews</a>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 text-sm h-8">Login</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm h-8">
                  Get Started <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900/98 backdrop-blur-md border-t border-gray-800">
            <div className="px-3 py-4 space-y-3">
              <a 
                href="#features" 
                className="block text-gray-300 hover:text-white py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-300 hover:text-white py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#testimonials" 
                className="block text-gray-300 hover:text-white py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Reviews
              </a>
              <div className="flex gap-2 pt-2">
                <Link 
                  href="/login" 
                  className="flex-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-white/5 text-sm h-9">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-sm h-9">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 lg:pb-16 px-2 sm:px-3">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 mb-3 sm:mb-4 lg:mb-6">
            <Zap className="h-3 w-3 text-red-400" />
            <span className="text-[10px] sm:text-xs text-red-400 font-medium">Automate your YouTube workflow</span>
          </div>
          
          {/* Heading */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 lg:mb-4 leading-tight px-1">
            Upload Videos on
            <span className="block sm:inline mt-0.5 sm:mt-0 sm:ml-1.5 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent"> Autopilot</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-400 max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8 px-2 leading-relaxed">
            Schedule YouTube uploads, manage multiple channels, and grow your audience — all from one powerful dashboard.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center max-w-sm mx-auto sm:max-w-none px-1">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm sm:text-base px-5 sm:px-6 py-3 sm:py-4 shadow-xl shadow-red-500/25">
                Start Free Trial <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-600 text-white hover:bg-white/10 hover:text-white text-sm sm:text-base px-5 sm:px-6 py-3 sm:py-4">
                Watch Demo <Play className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {/* Trust Text */}
          <p className="text-gray-500 mt-3 sm:mt-4 text-[10px] sm:text-xs">
            No credit card required • Free plan available • Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-4 sm:py-6 lg:py-8 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 text-center">
            <div className="p-1.5 sm:p-3">
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">10K+</div>
              <div className="text-gray-400 text-[10px] sm:text-xs mt-0.5">Videos Uploaded</div>
            </div>
            <div className="p-1.5 sm:p-3">
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">500+</div>
              <div className="text-gray-400 text-[10px] sm:text-xs mt-0.5">Active Users</div>
            </div>
            <div className="p-1.5 sm:p-3">
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">99.9%</div>
              <div className="text-gray-400 text-[10px] sm:text-xs mt-0.5">Uptime</div>
            </div>
            <div className="p-1.5 sm:p-3">
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">24/7</div>
              <div className="text-gray-400 text-[10px] sm:text-xs mt-0.5">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 sm:py-12 lg:py-16 px-2 sm:px-3">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-10 lg:mb-12">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 lg:mb-3">
              Everything You Need to <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Grow</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-[10px] sm:text-xs lg:text-sm">
              Powerful features designed for content creators, marketers, and agencies.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/60 border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/5 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-700/60 flex items-center justify-center mb-2 sm:mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-[10px] sm:text-xs leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-8 sm:py-12 lg:py-16 px-2 sm:px-3 bg-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-10 lg:mb-12">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 lg:mb-3">
              How It <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Works</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-2 sm:mb-3 shadow-lg shadow-red-500/25">
                1
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 text-white">Connect</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs">Link your YouTube channels and Google Drive in seconds.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-2 sm:mb-3 shadow-lg shadow-red-500/25">
                2
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 text-white">Upload</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs">Add videos from your Drive or upload directly to the platform.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-2 sm:mb-3 shadow-lg shadow-red-500/25">
                3
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-1 text-white">Schedule</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs">Set your schedule and let GPMart Studio handle the rest.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-8 sm:py-12 lg:py-16 px-2 sm:px-3">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-10 lg:mb-12">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 lg:mb-3">
              Simple, Transparent <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-[10px] sm:text-xs lg:text-sm">
              Choose the plan that fits your needs. All plans include core features.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-gray-800/60 border rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 ${
                  plan.popular ? 'border-red-500/50 md:scale-105 shadow-xl shadow-red-500/10' : 'border-gray-700/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] sm:text-xs font-medium px-2.5 sm:px-3 py-0.5 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5">{plan.description}</p>
                <div className="mt-3 mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-[10px] sm:text-xs"> /{plan.period}</span>
                </div>
                <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-gray-300 text-[10px] sm:text-xs">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button 
                    className={`w-full text-xs sm:text-sm ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/25' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-8 sm:py-12 lg:py-16 px-2 sm:px-3 bg-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-10 lg:mb-12">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 lg:mb-3">
              Loved by <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Creators</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800/60 border border-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex gap-0.5 mb-2 sm:mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 mb-2 sm:mb-3 text-[10px] sm:text-xs leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-white text-xs sm:text-sm">{testimonial.name}</p>
                  <p className="text-gray-500 text-[10px] sm:text-xs">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-2 sm:px-3">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg sm:rounded-xl py-6 sm:py-10 lg:py-12 px-3 sm:px-6">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2 lg:mb-3 text-white">
              Ready to Save 10+ Hours Every Week?
            </h2>
            <p className="text-gray-400 mb-3 sm:mb-5 lg:mb-6 text-[10px] sm:text-xs lg:text-sm">
              Join 500+ creators who are automating their YouTube workflow with GPMart Studio.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm sm:text-base px-5 sm:px-6 py-3 sm:py-4 shadow-xl shadow-red-500/25">
                Start Free Trial <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-2 sm:px-3 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="font-bold text-xs sm:text-sm">GPMart Studio</span>
              </div>
              <p className="text-gray-400 text-[10px] sm:text-xs leading-relaxed">
                Automate your YouTube workflow and grow your channel faster.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm text-white">Product</h4>
              <ul className="space-y-1 text-gray-400 text-[10px] sm:text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm text-white">Legal</h4>
              <ul className="space-y-1 text-gray-400 text-[10px] sm:text-xs">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm text-white">Support</h4>
              <ul className="space-y-1 text-gray-400 text-[10px] sm:text-xs">
                <li><a href="mailto:support@gpmart.in" className="hover:text-white transition-colors">support@gpmart.in</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-500 text-[10px] sm:text-xs pt-4 sm:pt-6 border-t border-gray-800">
            © {new Date().getFullYear()} GPMart Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}