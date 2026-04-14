'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Youtube,
  Zap,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Play,
} from 'lucide-react';

const benefits = [
  {
    icon: <Youtube className="h-5 w-5 text-blue-600" />,
    title: 'YouTube pe Auto Upload',
    desc: 'Videos queue karo — tool khud sahi time pe upload karta hai. Roz manually kuch nahi karna.',
  },
  {
    icon: <Clock className="h-5 w-5 text-blue-600" />,
    title: 'Roz 2+ Ghante Bachao',
    desc: 'Bulk import, schedule set karo, bas. Baaki sab automatic.',
  },
  {
    icon: <Zap className="h-5 w-5 text-blue-600" />,
    title: 'AI Title & Description',
    desc: 'Ek click mein SEO-friendly titles aur tags generate karo. Khud likhne ki zarurat nahi.',
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
    title: 'Multiple Channels',
    desc: '1 dashboard se 2-3 channels manage karo. Sab ka schedule alag, sab automatic.',
  },
];

const steps = [
  { step: '1', text: 'Account banao — Free mein' },
  { step: '2', text: 'YouTube channel connect karo' },
  { step: '3', text: 'Videos Google Drive se import karo' },
  { step: '4', text: 'Schedule set karo — kaam khatam' },
];

const reviews = [
  {
    name: 'Rahul V.',
    text: '90 videos ek saath upload ho gaye. Pehle mahine mein ₹4,800 earn kiya bina ek bhi video banaye.',
    stars: 5,
  },
  {
    name: 'Priya S.',
    text: '3 channels ek jagah se manage hote hain. Roz subah sirf dashboard check karta hoon.',
    stars: 5,
  },
  {
    name: 'Amit P.',
    text: 'Drive folder connect kiya, schedule set kiya — ab kuch nahi karna. Channel khud grow ho raha hai.',
    stars: 5,
  },
];

export default function LandingPage() {
  const router = useRouter();

  const handleCTA = () => router.push('/signup');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-5 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <Zap className="h-3 w-3" /> YouTube Automation Tool
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-gray-900 mb-4">
          YouTube Channel<br />
          <span className="text-blue-600">Autopilot Pe Daal Do</span>
        </h1>

        <p className="text-gray-600 text-base sm:text-lg mb-6 max-w-md mx-auto">
          Videos khud upload honge, sahi time pe, roz — bina tumhare kuch kiye.
          Sirf queue bharo aur bhool jao.
        </p>

        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white text-base font-bold px-8 py-6 rounded-xl w-full max-w-xs mx-auto flex items-center justify-center gap-2 shadow-lg"
          onClick={handleCTA}
        >
          Free Mein Start Karo
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-xs text-gray-400 mt-3">Credit card ki zarurat nahi • Free plan hamesha ke liye</p>

        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-1 mt-6">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-sm text-gray-500 ml-1">500+ creators use kar rahe hain</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-5 py-10 bg-white">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Sirf 4 Steps</h2>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {steps.map((s) => (
            <div key={s.step} className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {s.step}
              </div>
              <p className="text-gray-700 font-medium text-sm">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-5 py-10 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Kya milega?</h2>
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-4 bg-white rounded-xl p-4 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAIN POINT ── */}
      <section className="px-5 py-10 bg-white text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Kya ye problems hain?</h2>
          <div className="flex flex-col gap-2 text-left">
            {[
              'Roz manually YouTube pe video upload karna padta hai',
              'Title aur description likhna time waste lagta hai',
              'Multiple channels manage karna mushkil hai',
              'Drive pe videos pile ho rahe hain upload nahi hue',
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2">
                <span className="text-red-500 font-bold text-sm mt-0.5">✗</span>
                <span className="text-gray-700 text-sm">{pain}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-600 font-semibold mt-5 text-sm">GPMart AI Studio ye sab automatically handle karta hai.</p>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="px-5 py-10 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Creators kya bol rahe hain</h2>
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-0.5 mb-2">
                {[...Array(r.stars)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm mb-2">"{r.text}"</p>
              <p className="text-gray-400 text-xs font-medium">— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-5 py-12 bg-blue-600 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Abhi Start Karo — Free Hai</h2>
        <p className="text-blue-100 text-sm mb-6">
          Aaj channel connect karo, kal se uploads automatic.
        </p>
        <Button
          size="lg"
          className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-base px-8 py-6 rounded-xl w-full max-w-xs mx-auto flex items-center justify-center gap-2 shadow-lg"
          onClick={handleCTA}
        >
          Free Account Banao
          <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-blue-200 text-xs mt-3">No credit card • Setup 5 minutes mein</p>
      </section>

      {/* ── FOOTER LINKS ── */}
      <footer className="px-5 py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-xs">
          © 2025 GPMart AI Studio •{' '}
          <a href="/privacy" className="hover:text-gray-300">Privacy</a>{' '}
          •{' '}
          <a href="/terms" className="hover:text-gray-300">Terms</a>
        </p>
      </footer>

    </div>
  );
}
