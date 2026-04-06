'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="print:hidden fixed top-8 right-4 z-50">
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Printer className="h-4 w-4" />
          Save as PDF
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 print:py-6 print:px-4">

        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-600">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">GPmart YouTube Automation</h1>
          <p className="text-gray-500 mt-1">How to use the app — Step by step guide</p>
        </div>

        {/* Step 1 */}
        <Step number="1" color="blue" title="Sign Up & Connect Your YouTube Channel">
          <MockScreen>
            <div className="flex gap-3 items-center p-3 bg-white rounded border">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </div>
              <div className="flex-1">
                <div className="h-2.5 bg-gray-800 rounded w-32 mb-1" />
                <div className="h-2 bg-gray-300 rounded w-20" />
              </div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected ✓</div>
            </div>
            <div className="mt-2 flex gap-2">
              <MockBtn color="blue">+ Connect Channel</MockBtn>
              <MockBtn color="gray">Manage</MockBtn>
            </div>
          </MockScreen>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal pl-4 mt-3">
            <li>Go to <strong>gpmart.in</strong> → Sign Up with email or Google account</li>
            <li>Click <strong>Connect YouTube Channel</strong> on dashboard</li>
            <li>Select your Google account → Grant permissions</li>
            <li>Your channel appears — click <strong>Manage</strong> to open it</li>
          </ol>
          <Note>Connect the Google account that <strong>owns</strong> the YouTube channel</Note>
        </Step>

        {/* Step 2 */}
        <Step number="2" color="green" title="Add Videos to Queue">
          <MockScreen>
            <div className="flex gap-1.5 mb-3 border-b pb-2">
              {['Queue','Upload','Settings','History'].map((t, i) => (
                <div key={t} className={`text-xs px-2 py-1 rounded font-medium ${i === 1 ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>{t}</div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <MockBtn color="gray">📁 Browse Drive</MockBtn>
              <MockBtn color="yellow">📚 Browse Library</MockBtn>
              <MockBtn color="blue">⬆ Upload Files</MockBtn>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[1,2,3].map(i => (
                <div key={i} className="aspect-video bg-gradient-to-br from-blue-400 to-purple-500 rounded relative">
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                </div>
              ))}
            </div>
          </MockScreen>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div className="flex gap-2"><span className="text-yellow-500 font-bold">A</span><span><strong>Browse Library</strong> — Pick from admin pre-loaded videos (easiest, AI titles auto-generated)</span></div>
            <div className="flex gap-2"><span className="text-green-500 font-bold">B</span><span><strong>Browse Drive</strong> — Paste any public Google Drive folder link</span></div>
            <div className="flex gap-2"><span className="text-blue-500 font-bold">C</span><span><strong>Upload Files</strong> — Upload videos directly from your device</span></div>
          </div>
          <Note>Click the <strong>circle button</strong> on each video to select it. Your plan limits how many you can add per month.</Note>
        </Step>

        {/* Step 3 */}
        <Step number="3" color="purple" title="AI Generates Titles Automatically">
          <MockScreen>
            <div className="space-y-2">
              {['भजन सुनकर दिल छू गया 🙏 #shorts', 'Amazing Bhajan Must Watch 🔥 #shorts', 'Incredible! Bhajan Share Now ❤️ #shorts'].map((title, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <div className="w-10 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-gray-800">{title}</p>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI ✨</span>
                </div>
              ))}
            </div>
          </MockScreen>
          <p className="text-sm text-gray-600 mt-3">
            When you add videos from the <strong>Video Library</strong>, titles and descriptions are automatically generated using AI — no extra steps needed. For manually uploaded videos, go to Queue → select videos → click <strong>Generate AI Titles</strong>.
          </p>
        </Step>

        {/* Step 4 */}
        <Step number="4" color="orange" title="Set Up Auto-Schedule">
          <MockScreen>
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Auto-Schedule</span>
                <div className="w-8 h-4 bg-green-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Schedule</span>
                <span className="text-xs font-medium text-gray-800">Daily</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Upload Time</span>
                <span className="text-xs font-medium text-gray-800">10:00 AM IST</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Videos per run</span>
                <span className="text-xs font-medium text-gray-800">1 video/day</span>
              </div>
              <div className="mt-1"><MockBtn color="blue">Save Settings</MockBtn></div>
            </div>
          </MockScreen>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal pl-4 mt-3">
            <li>Open channel → <strong>Settings</strong> tab</li>
            <li>Turn <strong>Auto-Schedule ON</strong></li>
            <li>Set <strong>Upload Time</strong> and your <strong>Timezone</strong></li>
            <li>Set <strong>Videos per run</strong> (how many per day)</li>
            <li>Click <strong>Save Settings</strong></li>
          </ol>
          <Note>Scheduler runs every 5 min. Keep the queue filled with videos so uploads never stop.</Note>
        </Step>

        {/* Step 5 */}
        <Step number="5" color="red" title="Track Uploads in Queue">
          <MockScreen>
            <div className="space-y-1.5">
              {[
                { title: 'भजन सुनकर दिल छू गया...', status: 'uploaded', color: 'bg-green-100 text-green-700' },
                { title: 'Amazing Bhajan Must Watch...', status: 'queued', color: 'bg-blue-100 text-blue-700' },
                { title: 'Incredible Bhajan Share...', status: 'queued', color: 'bg-blue-100 text-blue-700' },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <div className="w-10 h-6 bg-gradient-to-br from-pink-400 to-red-500 rounded flex-shrink-0" />
                  <p className="text-xs flex-1 truncate text-gray-700">{v.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${v.color}`}>{v.status}</span>
                </div>
              ))}
            </div>
          </MockScreen>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {[
              ['queued','bg-blue-100 text-blue-700','Waiting to upload'],
              ['uploading','bg-yellow-100 text-yellow-700','Upload in progress'],
              ['uploaded','bg-green-100 text-green-700','Live on YouTube ✓'],
              ['failed','bg-red-100 text-red-700','Upload failed'],
            ].map(([s, cls, desc]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>
                <span className="text-gray-500">{desc}</span>
              </div>
            ))}
          </div>
        </Step>

        {/* Plans */}
        <div className="mt-8 print:break-inside-avoid-page">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Plans</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { name: 'Free', price: '₹0', videos: '10/mo', channels: '1', ai: '10', color: 'border-gray-200' },
              { name: 'Pro', price: '₹499/mo', videos: '100/mo', channels: '3', ai: '100', color: 'border-blue-400 bg-blue-50' },
              { name: 'Premium', price: '₹1499/mo', videos: '1000/mo', channels: '10', ai: '1000', color: 'border-purple-400 bg-purple-50' },
            ].map(p => (
              <div key={p.name} className={`border-2 rounded-xl p-3 ${p.color}`}>
                <p className="font-bold text-gray-800">{p.name}</p>
                <p className="text-blue-600 font-semibold text-sm">{p.price}</p>
                <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                  <p>📹 {p.videos} videos</p>
                  <p>📺 {p.channels} channel{parseInt(p.channels) > 1 ? 's' : ''}</p>
                  <p>✨ {p.ai} AI credits</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Upgrade at gpmart.in/billing · Refund policy at gpmart.in/refund-policy</p>
        </div>

        {/* FAQ */}
        <div className="mt-8 print:break-inside-avoid-page">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Common Questions</h2>
          <div className="space-y-3">
            {[
              ['Videos not uploading automatically?', 'Check: (1) Auto-Schedule is ON in Settings (2) Queue has videos with "queued" status (3) Upload time & timezone are set correctly'],
              ['Google Drive folder not loading?', 'The folder must be shared as "Anyone with the link can view". Open Drive → Share → Change to Anyone with the link.'],
              ['Video limit error when selecting?', 'You\'ve reached your monthly video quota. Deselect some videos or upgrade your plan at gpmart.in/billing'],
            ].map(([q, a]) => (
              <div key={q} className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-800 text-sm">Q: {q}</p>
                <p className="text-gray-600 text-sm mt-0.5">A: {a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t text-center text-sm text-gray-400">
          <p className="font-medium text-gray-500">GPmart YouTube Automation · gpmart.in</p>
          <p className="text-xs mt-1">For support: support@gpmart.in</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Step({ number, color, title, children }: { number: string; color: string; title: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600', green: 'bg-green-600', purple: 'bg-purple-600', orange: 'bg-orange-500', red: 'bg-red-600'
  };
  return (
    <div className="mb-8 print:break-inside-avoid-page">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-8 h-8 rounded-full ${colors[color]} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{number}</span>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </div>
  );
}

function MockScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 rounded-xl p-3 border border-gray-200">
      <div className="flex gap-1 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      {children}
    </div>
  );
}

function MockBtn({ color, children }: { color: string; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-600 text-white', green: 'bg-green-600 text-white',
    gray: 'bg-gray-200 text-gray-700', yellow: 'bg-yellow-500 text-white'
  };
  return <span className={`inline-block text-xs px-2 py-1 rounded font-medium ${cls[color]}`}>{children}</span>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
      <span className="font-semibold">Note: </span>{children}
    </div>
  );
}
