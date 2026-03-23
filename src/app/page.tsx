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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-base sm:text-xl font-bold">GPMart Studio</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">Reviews</a>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 text-sm lg:text-base">Login</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/25 text-sm lg:text-base">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900/98 backdrop-blur-md border-t border-gray-800">
            <div className="px-4 py-6 space-y-4">
              <a 
                href="#features" 
                className="block text-gray-300 hover:text-white py-2 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-300 hover:text-white py-2 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#testimonials" 
                className="block text-gray-300 hover:text-white py-2 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Reviews
              </a>
              <div className="flex flex-col gap-2 pt-2">
                <Link 
                  href="/login" 
                  className="w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-white/5 text-sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 sm:px-4 sm:py-2 mb-4 sm:mb-6 lg:mb-8">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
            <span className="text-xs sm:text-sm text-red-400 font-medium">Automate your YouTube workflow</span>
          </div>
          
          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 lg:mb-6 leading-tight">
            Upload Videos on
            <span className="block sm:inline mt-1 sm:mt-0 sm:ml-2 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent"> Autopilot</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto mb-6 sm:mb-8 lg:mb-10 px-2 leading-relaxed">
            Schedule YouTube uploads, manage multiple channels, and grow your audience — all from one powerful dashboard. Save 10+ hours every week.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 max-w-md mx-auto sm:max-w-none">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-xl shadow-red-500/25">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-600 text-white hover:bg-white/5 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6">
                Watch Demo <Play className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
          
          {/* Trust Text */}
          <p className="text-gray-500 mt-4 sm:mt-6 text-xs sm:text-sm">
            No credit card required • Free plan available • Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-6 sm:py-8 lg:py-12 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-center">
            <div className="p-2 sm:p-4">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">10K+</div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">Videos Uploaded</div>
            </div>
            <div className="p-2 sm:p-4">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">500+</div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">Active Users</div>
            </div>
            <div className="p-2 sm:p-4">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">99.9%</div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">Uptime</div>
            </div>
            <div className="p-2 sm:p-4">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">24/7</div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4">
              Everything You Need to <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Grow</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm lg:text-base">
              Powerful features designed for content creators, marketers, and agencies.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-gray-800/50 border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/5 rounded-xl p-4 sm:p-6"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-700 flex items-center justify-center mb-3 sm:mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4 bg-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4">
              How It <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Works</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg shadow-red-500/25">
                1
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 text-white">Connect</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Link your YouTube channels and Google Drive in seconds.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg shadow-red-500/25">
                2
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 text-white">Upload</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Add videos from your Drive or upload directly to the platform.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg shadow-red-500/25">
                3
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 text-white">Schedule</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Set your schedule and let GPMart Studio handle the rest.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4">
              Simple, Transparent <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm lg:text-base">
              Choose the plan that fits your needs. All plans include core features.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-gray-800/50 border rounded-xl p-6 sm:p-8 ${
                  plan.popular ? 'border-red-500/50 md:scale-105 shadow-xl shadow-red-500/10' : 'border-gray-700/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">{plan.description}</p>
                <div className="mt-4 mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm"> /{plan.period}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button 
                    className={`w-full text-sm ${
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
      <section id="testimonials" className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4 bg-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4">
              Loved by <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Creators</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 sm:p-6">
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-white text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-gray-500 text-xs sm:text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl py-8 sm:py-12 lg:py-16 px-4 sm:px-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4 text-white">
              Ready to Save 10+ Hours Every Week?
            </h2>
            <p className="text-gray-400 mb-4 sm:mb-6 lg:mb-8 text-xs sm:text-sm lg:text-base">
              Join 500+ creators who are automating their YouTube workflow with GPMart Studio.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-xl shadow-red-500/25">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-3 sm:px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="font-bold text-sm sm:text-base">GPMart Studio</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Automate your YouTube workflow and grow your channel faster.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 lg:mb-4 text-sm sm:text-base text-white">Product</h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 lg:mb-4 text-sm sm:text-base text-white">Legal</h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 sm:mb-3 lg:mb-4 text-sm sm:text-base text-white">Support</h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="mailto:support@gpmart.in" className="hover:text-white transition-colors">support@gpmart.in</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-500 text-xs sm:text-sm pt-6 sm:pt-8 border-t border-gray-800">
            © {new Date().getFullYear()} GPMart Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}