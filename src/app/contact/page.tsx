import { Metadata } from 'next';
import { Mail, MessageCircle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | GPMart AI Studio',
  description: 'Get in touch with the GPMart AI Studio support team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <a href="/lp" className="font-extrabold text-gray-900 text-base tracking-tight">
          GPMart AI Studio
        </a>
        <a
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5"
        >
          Login
        </a>
      </nav>

      <div className="max-w-lg mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
            <MessageCircle className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-gray-500 text-sm">
            Have a question or need help? We're here for you.
          </p>
        </div>

        <div className="flex flex-col gap-4">

          {/* Email card */}
          <a
            href="mailto:support@gpmart.in"
            className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 hover:bg-blue-100 transition-colors group"
          >
            <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Email Support</p>
              <p className="text-blue-600 text-sm font-medium group-hover:underline">
                support@gpmart.in
              </p>
            </div>
          </a>

          {/* Response time */}
          <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
            <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Response Time</p>
              <p className="text-gray-500 text-sm">We usually reply within 24 hours</p>
            </div>
          </div>

          {/* Common topics */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 mt-2">
            <p className="font-semibold text-gray-800 text-sm mb-3">Common topics we can help with</p>
            <ul className="space-y-2">
              {[
                'Billing and subscription questions',
                'Uploading or scheduling issues',
                'YouTube channel connection problems',
                'Google Drive import help',
                'Refund requests',
              ].map((topic) => (
                <li key={topic} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  {topic}
                </li>
              ))}
            </ul>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          For billing-specific issues, you can also visit the{' '}
          <a href="/billing" className="text-blue-500 hover:underline">
            Billing page
          </a>
          .
        </p>
      </div>

      {/* Footer */}
      <footer className="px-5 py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-xs">
          © 2025 GPMart AI Studio •{' '}
          <a href="/privacy" className="hover:text-gray-300">Privacy</a>{' '}
          •{' '}
          <a href="/terms" className="hover:text-gray-300">Terms</a>
          {' '}•{' '}
          <a href="/refund-policy" className="hover:text-gray-300">Refund Policy</a>
        </p>
      </footer>

    </div>
  );
}
