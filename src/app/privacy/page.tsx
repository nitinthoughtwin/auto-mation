import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | YouTube Automation',
};

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-muted-foreground mb-4">
            We collect information you provide directly to us, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Account credentials (email and password)</li>
            <li>YouTube channel information (via OAuth authorization)</li>
            <li>Video files and metadata you upload</li>
            <li>Scheduling preferences and settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="text-muted-foreground mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Upload videos to your YouTube channels on your behalf</li>
            <li>Communicate with you about your account and services</li>
            <li>Monitor and analyze trends, usage, and activities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. YouTube API Services</h2>
          <p className="text-muted-foreground mb-4">
            This application uses YouTube API Services to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Connect and manage your YouTube channels</li>
            <li>Upload videos to your channels</li>
            <li>Retrieve channel information</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Your use of YouTube API Services is subject to Google's{' '}
            <a 
              href="https://www.youtube.com/t/terms" 
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a 
              href="https://policies.google.com/privacy" 
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
          <p className="text-muted-foreground mb-4">
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Your OAuth tokens are encrypted and stored securely</li>
            <li>Video files are temporarily stored and deleted after upload</li>
            <li>We do not share your data with third parties</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
          <p className="text-muted-foreground mb-4">
            We retain your information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
          <p className="text-muted-foreground mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Revoke YouTube API access at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy, please contact us through our application.
          </p>
        </section>
      </div>
    </div>
  );
}
