'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print Button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Printer className="h-4 w-4" />
          Save as PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12 print:py-6 print:px-6">

        {/* Cover */}
        <div className="text-center mb-16 print:mb-10 border-b pb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-red-600 fill-current">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">GPmart YouTube Automation</h1>
          <p className="text-xl text-gray-500 mb-1">User Guide</p>
          <p className="text-sm text-gray-400">Schedule, upload, and grow your YouTube channels automatically</p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 print:mb-8 bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Contents</h2>
          <ol className="space-y-1.5 text-sm text-gray-600">
            {[
              ['1', 'Getting Started — Sign Up & Connect Channel'],
              ['2', 'Dashboard Overview'],
              ['3', 'Upload Videos — Manual & Bulk'],
              ['4', 'Browse & Add from Google Drive'],
              ['5', 'Video Library — Admin Pre-loaded Videos'],
              ['6', 'Scheduling — Auto-upload on Autopilot'],
              ['7', 'AI-Generated Titles & Descriptions'],
              ['8', 'Queue — Track All Your Videos'],
              ['9', 'Plans & Billing'],
              ['10', 'Tips & FAQs'],
            ].map(([num, label]) => (
              <li key={num} className="flex gap-2">
                <span className="font-semibold text-blue-600 w-6 flex-shrink-0">{num}.</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Section 1 ── */}
        <Section number="1" title="Getting Started — Sign Up & Connect Channel">
          <Steps>
            <Step n={1} title="Create an account">
              Go to <strong>gpmart.in</strong> and click <strong>Sign Up</strong>. Register with your email &amp; password or use <strong>Continue with Google</strong>.
            </Step>
            <Step n={2} title="Verify your email">
              Check your inbox for a verification link and click it to activate your account.
            </Step>
            <Step n={3} title="Connect a YouTube Channel">
              After logging in, click <strong>Connect YouTube Channel</strong> on the dashboard. You will be redirected to Google — select the Google account that owns the YouTube channel you want to manage and grant the requested permissions.
            </Step>
            <Step n={4} title="Done!">
              Your channel appears in the sidebar. You can connect more channels based on your plan (1 channel on Free, 3 on Pro, 10 on Premium).
            </Step>
          </Steps>
          <Note>
            Make sure the Google account you connect is the <strong>owner</strong> of the YouTube channel. Permissions include: upload videos, manage videos, and read channel info.
          </Note>
        </Section>

        {/* ── Section 2 ── */}
        <Section number="2" title="Dashboard Overview">
          <p className="text-sm text-gray-600 mb-4">
            After connecting a channel, the <strong>Manage</strong> button opens the channel dashboard. It has four tabs:
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Queue', 'All videos waiting to be uploaded — see status, title, scheduled time.'],
              ['Upload', 'Upload new videos manually or in bulk.'],
              ['Settings', 'Configure your auto-scheduling preferences for this channel.'],
              ['History', 'Completed uploads and their YouTube links.'],
            ].map(([tab, desc]) => (
              <div key={tab} className="border rounded-lg p-3">
                <p className="font-semibold text-gray-800 mb-1">{tab}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Section 3 ── */}
        <Section number="3" title="Upload Videos — Manual & Bulk">
          <Steps>
            <Step n={1} title="Go to the Upload tab">
              Inside the channel dashboard, click the <strong>Upload</strong> tab.
            </Step>
            <Step n={2} title="Add videos">
              <ul className="list-disc pl-5 space-y-1 mt-1 text-sm">
                <li><strong>Drag &amp; drop</strong> video files onto the upload area, or</li>
                <li>Click <strong>Browse Files</strong> to pick files from your device.</li>
                <li>For bulk upload, select multiple files at once (up to your plan&rsquo;s limit).</li>
              </ul>
            </Step>
            <Step n={3} title="Fill in details (optional)">
              You can add a title, description, and tags for each video. Or leave them blank — you can use AI to generate them later (see Section 7).
            </Step>
            <Step n={4} title="Add to Queue">
              Click <strong>Add to Queue</strong>. The videos are now saved and will be uploaded to YouTube automatically per your schedule.
            </Step>
          </Steps>
          <Note>
            Supported formats: MP4, MOV, AVI, MKV, WebM. Max file size depends on your plan (100 MB on Free, 500 MB on Pro, 2 GB on Premium).
          </Note>
        </Section>

        {/* ── Section 4 ── */}
        <Section number="4" title="Browse & Add from Google Drive">
          <p className="text-sm text-gray-600 mb-3">
            If your videos are stored in Google Drive, you can add them directly without re-uploading.
          </p>
          <Steps>
            <Step n={1} title="Click 'Browse Drive'">
              In the Upload tab, click <strong>Browse Drive</strong> (or the Google Drive icon button).
            </Step>
            <Step n={2} title="Paste folder link">
              Paste a public Google Drive folder link. Make sure the folder sharing is set to <em>&ldquo;Anyone with the link can view&rdquo;</em>.
            </Step>
            <Step n={3} title="Select videos">
              Videos in the folder appear as thumbnails. Click the <strong>circle button</strong> (top-left of each thumbnail) to select videos, or click the thumbnail to preview first.
            </Step>
            <Step n={4} title="Add to Queue">
              Select your channel and click <strong>Add to Queue</strong>. The Drive file links are saved — no re-upload needed.
            </Step>
          </Steps>
        </Section>

        {/* ── Section 5 ── */}
        <Section number="5" title="Video Library — Admin Pre-loaded Videos">
          <p className="text-sm text-gray-600 mb-3">
            The Video Library is a collection of ready-to-use videos pre-loaded by the admin (e.g., devotional shorts, trending content). You can pick from these and add them to your queue with one click.
          </p>
          <Steps>
            <Step n={1} title="Click 'Browse Library'">
              In the Upload tab or Queue tab, click the <strong>Browse Library</strong> button.
            </Step>
            <Step n={2} title="Choose a Category">
              Categories like <em>Bhajan</em>, <em>Motivation</em>, etc. are shown. Click a category to see videos inside.
            </Step>
            <Step n={3} title="Select videos">
              Use the circle button on each video to select. Use <strong>Select All</strong> to pick everything in the category.
            </Step>
            <Step n={4} title="Add to Queue">
              Pick your channel and click <strong>Add to Queue</strong>. Titles are automatically generated using AI based on the category name — no manual work needed.
            </Step>
          </Steps>
          <Note>
            Videos marked <strong className="text-green-600">Added</strong> are already in your queue. You can still re-add them for a different channel.
          </Note>
        </Section>

        {/* ── Section 6 ── */}
        <Section number="6" title="Scheduling — Auto-upload on Autopilot">
          <p className="text-sm text-gray-600 mb-3">
            Once videos are in your queue, the scheduler uploads them to YouTube automatically. Configure it in <strong>Settings</strong> tab of your channel.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200 font-semibold">Setting</th>
                  <th className="text-left p-2 border border-gray-200 font-semibold">What it does</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ['Schedule Type', 'Daily, Every N days, or Weekly (pick specific days).'],
                  ['Upload Time', 'Time of day to upload (uses your selected timezone).'],
                  ['Timezone', 'Your local timezone — important to set correctly.'],
                  ['Videos per run', 'How many videos to upload each time the scheduler runs (1–10).'],
                  ['Random Delay', 'Adds a random delay (0–N minutes) before each upload to appear more natural.'],
                  ['Auto-Schedule', 'Toggle to enable or pause automatic uploads.'],
                ].map(([setting, desc]) => (
                  <tr key={setting} className="border-b border-gray-100">
                    <td className="p-2 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">{setting}</td>
                    <td className="p-2 border border-gray-200">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            The scheduler runs every 5 minutes. If your scheduled time is 10:00 AM, the upload will happen between 10:00–10:05 AM. Make sure <strong>Auto-Schedule is ON</strong> and the queue has videos.
          </Note>
        </Section>

        {/* ── Section 7 ── */}
        <Section number="7" title="AI-Generated Titles & Descriptions">
          <p className="text-sm text-gray-600 mb-3">
            Save time — let AI write SEO-optimized titles, descriptions, and tags for your videos.
          </p>
          <Steps>
            <Step n={1} title="Automatic (Library Videos)">
              When you add videos from the <strong>Video Library</strong>, titles are generated automatically using the category name as the topic. No action needed.
            </Step>
            <Step n={2} title="Manual generation from Queue">
              Open the <strong>Queue</strong> tab → select videos → click <strong>Generate AI Titles</strong> → enter a topic (e.g., &ldquo;Bhajan&rdquo;, &ldquo;Motivation&rdquo;) → click Generate.
            </Step>
            <Step n={3} title="Edit after generation">
              Click any video in the Queue to edit its title, description, or tags manually after AI generates them.
            </Step>
          </Steps>
          <Note>
            AI credits are limited per plan: 10/month (Free), 100/month (Pro), 1000/month (Premium). Each video generated = 1 credit.
          </Note>
        </Section>

        {/* ── Section 8 ── */}
        <Section number="8" title="Queue — Track All Your Videos">
          <p className="text-sm text-gray-600 mb-3">
            The <strong>Queue</strong> tab shows all videos for a channel and their current status.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
            {[
              ['queued', 'bg-blue-100 text-blue-700', 'Waiting to be uploaded'],
              ['uploading', 'bg-yellow-100 text-yellow-700', 'Upload in progress'],
              ['uploaded', 'bg-green-100 text-green-700', 'Successfully uploaded to YouTube'],
              ['failed', 'bg-red-100 text-red-700', 'Upload failed — check details'],
              ['scheduled', 'bg-purple-100 text-purple-700', 'Scheduled for a future time'],
            ].map(([status, cls, desc]) => (
              <div key={status} className="border rounded p-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls} mb-1`}>{status}</span>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            You can <strong>delete</strong> queued videos before they are uploaded. Uploaded videos show a link to view them on YouTube.
          </p>
        </Section>

        {/* ── Section 9 ── */}
        <Section number="9" title="Plans & Billing">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200 font-semibold">Feature</th>
                  <th className="text-center p-2 border border-gray-200 font-semibold">Free</th>
                  <th className="text-center p-2 border border-gray-200 font-semibold">Pro ₹499/mo</th>
                  <th className="text-center p-2 border border-gray-200 font-semibold">Premium ₹1499/mo</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ['Videos / month', '10', '100', '1,000'],
                  ['YouTube channels', '1', '3', '10'],
                  ['Storage', '500 MB', '5 GB', '50 GB'],
                  ['AI credits / month', '10', '100', '1,000'],
                  ['Max video size', '100 MB', '500 MB', '2 GB'],
                  ['Random delay', '—', '✓', '✓'],
                  ['Priority support', '—', '✓', '✓'],
                ].map(([feature, free, pro, premium]) => (
                  <tr key={feature} className="border-b border-gray-100">
                    <td className="p-2 border border-gray-200 font-medium text-gray-700">{feature}</td>
                    <td className="p-2 border border-gray-200 text-center">{free}</td>
                    <td className="p-2 border border-gray-200 text-center">{pro}</td>
                    <td className="p-2 border border-gray-200 text-center">{premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            To upgrade: go to <strong>Billing</strong> (top menu) → choose a plan → pay via UPI, card, or net banking. Yearly plans save 20–25%.
          </p>
          <Note>
            Refunds are available within 7 days of purchase if you have uploaded fewer than 5 videos. See our Refund Policy at gpmart.in/refund-policy.
          </Note>
        </Section>

        {/* ── Section 10 ── */}
        <Section number="10" title="Tips & FAQs">
          <div className="space-y-4">
            {[
              {
                q: 'My videos are not uploading automatically. What should I do?',
                a: 'Check: (1) Auto-Schedule is ON in Settings tab. (2) Queue has videos with "queued" status. (3) Upload time and timezone are set correctly. (4) Your YouTube channel is still connected — try disconnecting and reconnecting if needed.',
              },
              {
                q: 'Can I upload the same video to multiple channels?',
                a: 'Yes. Add the video to the queue for each channel separately. Each channel has its own queue.',
              },
              {
                q: 'Why is my Google Drive folder not loading?',
                a: 'The folder must be shared as "Anyone with the link can view". Open the folder in Google Drive → Share → Change to "Anyone with the link".',
              },
              {
                q: 'How many videos can I schedule per day?',
                a: 'Set "Videos per run" in Settings. If the scheduler runs once a day, that is how many upload per day. For multiple uploads per day, you can configure the schedule to run more frequently.',
              },
              {
                q: 'What languages does AI title generation support?',
                a: 'English and Hindi are fully supported. Titles are generated based on the topic/category name you provide.',
              },
              {
                q: 'Can I edit a video title after it is uploaded to YouTube?',
                a: 'Not from this app — once uploaded, go directly to YouTube Studio to edit the video details.',
              },
              {
                q: 'How do I cancel my subscription?',
                a: 'Go to Billing → Cancel Subscription. Your access continues until the end of the current billing period.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-l-4 border-blue-200 pl-4">
                <p className="font-semibold text-gray-800 text-sm mb-1">Q: {q}</p>
                <p className="text-gray-600 text-sm">A: {a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center text-sm text-gray-400 print:mt-10">
          <p className="font-medium text-gray-500 mb-1">GPmart YouTube Automation</p>
          <p>gpmart.in &nbsp;·&nbsp; support@gpmart.in &nbsp;·&nbsp; gpmart.in/refund-policy</p>
          <p className="mt-2 text-xs">For help, email us or visit our website. We typically respond within 24 hours.</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 1.2cm; size: A4; }
          body { font-size: 12px !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Helper components ── */

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 print:mb-8 print:break-inside-avoid-page">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
          {number}
        </span>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-3 mb-4">{children}</ol>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-blue-300 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <span className="font-semibold text-gray-800">{title} — </span>
        <span className="text-gray-600">{children}</span>
      </div>
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mt-3">
      <span className="font-semibold">Note: </span>{children}
    </div>
  );
}
