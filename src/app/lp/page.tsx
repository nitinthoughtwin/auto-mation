'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  Star,
  Check,
  Upload,
  Brain,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useEffect } from 'react';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const benefits = [
  {
    icon: <Upload className="h-5 w-5 text-blue-600" />,
    title: 'Auto Upload to YouTube',
    desc: 'Queue your videos — the tool uploads them at the right time automatically. No manual work every day.',
  },
  {
    icon: <Clock className="h-5 w-5 text-blue-600" />,
    title: 'Save 2+ Hours Every Day',
    desc: 'Bulk import, set your schedule, done. Everything else runs on autopilot.',
  },
  {
    icon: <Brain className="h-5 w-5 text-blue-600" />,
    title: 'AI Title & Description',
    desc: 'Generate SEO-friendly titles and tags in one click. No need to write them yourself.',
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
    title: 'Google Drive Import',
    desc: 'Connect your Drive folder directly. Pick videos, set a schedule — channel grows on autopilot.',
  },
];


const reviews = [
  {
    name: 'Rahul V.',
    text: '90 videos uploaded at once. Earned ₹4,800 in the first month without creating a single video.',
    stars: 5,
  },
  {
    name: 'Priya S.',
    text: 'I manage my channel from one place now. Just check the dashboard every morning, that\'s it.',
    stars: 5,
  },
  {
    name: 'Amit P.',
    text: 'Connected my Drive folder, set the schedule — nothing left to do. Channel is growing on its own.',
    stars: 5,
  },
];

const faqs = [
  {
    q: 'What kind of videos can I upload?',
    a: 'Any video file from your device or Google Drive — MP4, MOV, AVI etc. The tool uploads them to YouTube exactly as-is.',
  },
  {
    q: 'Does it work with any YouTube channel?',
    a: 'Yes. Just connect your YouTube account via Google login and your channel is linked in seconds.',
  },
  {
    q: 'What happens when my free quota runs out?',
    a: 'Uploads pause automatically. Upgrade to Pro (₹199/month) to continue — no data is lost.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your billing page anytime. You keep access until the end of your current period.',
  },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-800"
        onClick={() => setOpen(v => !v)}
      >
        {q}
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const handleCTA = () => router.push('/signup');

  interface LibraryVideo { id: string; driveFileId: string; durationMillis: number | null; name: string; }
  interface LibraryCategory { id: string; name: string; videos: LibraryVideo[]; }
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<LibraryVideo | null>(null);

  useEffect(() => {
    fetch('/api/public/library-preview')
      .then(r => r.json())
      .then(d => {
        const cats: LibraryCategory[] = d.categories || [];
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].id);
      })
      .catch(() => {});
  }, []);

  const toggleVideoSelect = (id: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    localStorage.setItem('pendingLibraryVideos', JSON.stringify(Array.from(selectedVideoIds)));
    router.push('/signup');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <span className="font-extrabold text-gray-900 text-base tracking-tight">GPMart AI Studio</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5"
          >
            Login
          </button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg h-8 px-3"
            onClick={handleCTA}
          >
            Start Free
          </Button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-5 pt-10 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <Zap className="h-3 w-3" /> YouTube Automation Tool
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-gray-900 mb-2">
        Ek baar set karo. <br />
          <span className="text-blue-600">YouTube daily grow hoga.</span>
        </h1>
        <p className="text-gray-400 text-sm mb-4 font-medium">Put your channel on autopilot</p>

        <p className="text-gray-600 text-base mb-6 max-w-sm mx-auto">
          बस videos select karo ya es tool me upload karo — tool खुद सही time पर YouTube पर upload कर देगा।<br />
          <span className="text-gray-400 text-sm">Daily manually upload करने की झंझट खत्म।</span>
        </p>

        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white text-base font-bold px-8 py-6 rounded-xl w-full max-w-xs mx-auto flex items-center justify-center gap-2 shadow-lg"
          onClick={handleCTA}
        >
          Start for free
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-xs text-gray-400 mt-3">कोई credit card नहीं • Free plan हमेशा के लिए</p>

        {/* ── PRODUCT MOCKUP ── */}

      </section>

      {/* ── LIBRARY PREVIEW ── */}
      {categories.length > 0 && (
        <section className="px-5 py-10 bg-white">
          <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
            इन videos को आज ही upload करो 🎬
          </h2>
          <p className="text-center text-gray-400 text-sm mb-4">
            Copyright-free videos — directly apne channel pe schedule karo
          </p>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-sm mx-auto scrollbar-hide mb-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Videos grid */}
          {categories.filter(c => c.id === activeCategory).map(cat => (
            <div key={cat.id} className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
              {cat.videos.map(v => {
                const isSelected = selectedVideoIds.has(v.id);
                return (
                  <div
                    key={v.id}
                    className={`relative rounded-xl overflow-hidden bg-gray-100 aspect-video border-2 shadow-sm transition-all ${
                      isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-100'
                    }`}
                  >
                    {/* Play area — tapping opens video */}
                    <button
                      className="absolute inset-0 w-full h-full group"
                      onClick={() => setPlayingVideo(v)}
                    >
                      <img
                        src={`https://drive.google.com/thumbnail?id=${v.driveFileId}&sz=w400-h225`}
                        alt={v.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {/* Play button shown on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                        <div className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <svg className="h-4 w-4 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 8 8">
                            <polygon points="1,0 7,4 1,8" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Checkbox — tapping selects without opening video */}
                    <button
                      onClick={() => toggleVideoSelect(v.id)}
                      className={`absolute top-1.5 left-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/30 border-white/60 hover:bg-black/50'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {v.durationMillis && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10">
                        {formatDuration(v.durationMillis)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="mt-5 max-w-sm mx-auto text-center">
            <p className="text-xs text-gray-400 mb-3">Register karo — poori library free mein milegi</p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-5"
              onClick={handleCTA}
            >
              Free mein access karo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </section>
      )}

      {/* ── STICKY SELECTION BAR ── */}
      {selectedVideoIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
          <div className="max-w-sm mx-auto mb-4">
            <div className="bg-blue-600 rounded-2xl shadow-2xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">
                  {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? 's' : ''} select ki
                </p>
                <p className="text-blue-200 text-xs">Signup ke baad queue mein add hongi</p>
              </div>
              <Button
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-sm px-4 h-10 rounded-xl shrink-0"
                onClick={handleAddSelected}
              >
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      

      {/* ── PAIN POINTS ── */}
      <section className="px-5 py-10 bg-white text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Kyu use karna chahiye? 😩</h2>
          <p className="text-gray-400 text-sm mb-4">Recognize this?</p>
          <div className="flex flex-col gap-2 text-left">
            {[
              'रोज़ manually YouTube पर video upload करना पड़ता है',
              'Title और description लिखने में बहुत time जाता है',
              'Drive में videos पड़ी हैं, upload होती ही नहीं',
              'सही time पर upload भूल जाते हो — views कम होते हैं',
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2.5">
                <span className="text-red-500 font-bold text-sm mt-0.5">✗</span>
                <span className="text-gray-700 text-sm">{pain}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-600 font-semibold mt-5 text-sm">यह सब GPMart AI Studio अपने आप करता है।</p>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-5 py-10 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">What You Get</h2>
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

      {/* ── DEMO VIDEO ── */}
      <section className="px-5 py-10 bg-white text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-1">देखो कैसे काम करता है</h2>
        <p className="text-gray-400 text-sm mb-6">Watch it in action — 60 seconds</p>
        <div className="max-w-sm mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-black aspect-video flex items-center justify-center relative">
          {/* Replace VIDEO_ID with your actual YouTube video ID */}
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1"
            title="GPMart AI Studio Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">Free mein try karo — koi commitment nahi</p>
      </section>

      {/* ── SCREENSHOTS ── */}
      <section className="px-5 py-10 bg-gray-50">
        <p className="text-center text-gray-400 text-sm mb-6">Simple, clean, easy to use</p>
        <div className="flex flex-col gap-6 max-w-sm mx-auto">
          {/* Screenshot 3 — AI Generation */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2">
              <Brain className="h-3 w-3 text-purple-500" />
              <span className="text-xs font-semibold text-gray-600">AI Title & Description</span>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Title</p>
                <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-gray-800">Top 10 Amazing Space Facts That Will Blow Your Mind 🚀</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</p>
                <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-600 leading-relaxed">क्या आप जानते हैं कि अंतरिक्ष में ऐसे रहस्य हैं जो वैज्ञानिक भी नहीं समझ पाए? इस video में हम आपको...</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {['space facts', 'universe', 'science hindi', 'amazing facts', 'viral'].map(tag => (
                    <span key={tag} className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="bg-purple-600 rounded-xl py-2 text-center flex items-center justify-center gap-2">
                <Zap className="h-3 w-3 text-white" />
                <p className="text-xs font-bold text-white">AI se generate hua — 1 click mein</p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <p className="text-[10px] text-center text-gray-400 font-medium">SEO-friendly title, description aur tags automatically</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-5 py-10 bg-white">
        <h2 className="text-xl font-bold text-center mb-1 text-gray-800">बस 4 Steps में शुरू करो</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Setup in under 5 minutes</p>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {[
            { step: '1', text: 'Free account बनाओ', sub: 'No credit card needed' },
            { step: '2', text: 'YouTube channel connect करो', sub: 'Google login से — 30 seconds' },
            { step: '3', text: 'Drive या device से videos add करो', sub: 'Bulk import supported' },
            { step: '4', text: 'Time set करो — हो गया ✅', sub: 'Tool बाकी सब खुद करेगा' },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-gray-700 font-semibold text-sm">{s.text}</p>
                <p className="text-gray-400 text-xs">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 max-w-sm mx-auto">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-5"
            onClick={handleCTA}
          >
            अभी Free में Try करो <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="px-5 py-10 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-2 text-gray-800">Simple Pricing</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Start free. Upgrade when you need more.</p>
        <div className="flex flex-col gap-4 max-w-sm mx-auto">

          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="font-bold text-gray-800 text-base mb-0.5">Free</p>
            <p className="text-2xl font-extrabold mb-3">₹0 <span className="text-sm font-normal text-gray-400">/ forever</span></p>
            <ul className="space-y-2">
              {['3 videos / month', 'Google Drive import', 'Video library access', 'All schedule types'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-4 rounded-xl font-semibold" onClick={handleCTA}>
              Get Started Free
            </Button>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
              Most Popular
            </span>
            <p className="font-bold text-gray-800 text-base mb-0.5">Pro</p>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-2xl font-extrabold">₹199 <span className="text-sm font-normal text-gray-400">/ month</span></p>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">₹499 / 3 months</span>
            </div>
            <ul className="space-y-2">
              {['30 videos / month', 'Google Drive import', 'Video library access', 'Unlimited AI titles & descriptions', 'All schedule types'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full mt-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCTA}>
              Start Free → Upgrade Anytime
            </Button>
          </div>

        </div>
      </section>

      

      {/* ── REVIEWS ── */}
      <section className="px-5 py-10 bg-white">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">What Creators Are Saying</h2>
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          {reviews.map((r, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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

      {/* ── FAQ ── */}
      <section className="px-5 py-10 bg-gray-50">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Frequently Asked</h2>
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {faqs.map((f, i) => <FAQ key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-5 py-12 bg-blue-600 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Start Now — It's Free</h2>
        <p className="text-blue-100 text-sm mb-6">
          Connect your channel today, uploads run automatically from tomorrow.
        </p>
        <Button
          size="lg"
          className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-base px-8 py-6 rounded-xl w-full max-w-xs mx-auto flex items-center justify-center gap-2 shadow-lg"
          onClick={handleCTA}
        >
          Create Free Account
          <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-blue-200 text-xs mt-3">No credit card • Setup in 5 minutes</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-5 py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-xs">
          © 2025 GPMart AI Studio •{' '}
          <a href="/privacy" className="hover:text-gray-300">Privacy</a>{' '}
          •{' '}
          <a href="/terms" className="hover:text-gray-300">Terms</a>
          {' '}•{' '}
          <a href="/refund-policy" className="hover:text-gray-300">Refund Policy</a>
          {' '}•{' '}
          <a href="/contact" className="hover:text-gray-300">Contact</a>
        </p>
      </footer>

      {/* ── VIDEO PLAYER MODAL ── */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden bg-black shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
              <p className="text-white text-sm font-medium truncate pr-3">
                {playingVideo.name.replace(/\.[^/.]+$/, '')}
              </p>
              <button
                onClick={() => setPlayingVideo(null)}
                className="text-gray-400 hover:text-white shrink-0 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <iframe
              src={`https://drive.google.com/file/d/${playingVideo.driveFileId}/preview`}
              className="w-full aspect-video"
              allow="autoplay"
            />
            <div className="bg-gray-900 px-4 py-3">
              <button
                onClick={() => { toggleVideoSelect(playingVideo.id); setPlayingVideo(null); }}
                className={`w-full text-sm font-bold py-2.5 rounded-xl transition-colors ${
                  selectedVideoIds.has(playingVideo.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-900 hover:bg-blue-50'
                }`}
              >
                {selectedVideoIds.has(playingVideo.id) ? '✓ Selected for Queue' : '+ Select for Queue'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
