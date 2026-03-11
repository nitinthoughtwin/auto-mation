import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | YouTube Automation',
};

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground mb-4">
            By accessing and using this YouTube Automation application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground mb-4">
            This application provides automation services for YouTube video uploads, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Connecting and managing multiple YouTube channels</li>
            <li>Scheduling video uploads at specified times</li>
            <li>Bulk video upload capabilities</li>
            <li>Automatic thumbnail uploads</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. User Responsibilities</h2>
          <p className="text-muted-foreground mb-4">
            You are responsible for:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All content uploaded through your account</li>
            <li>Ensuring uploaded content complies with YouTube's Terms of Service</li>
            <li>Obtaining necessary rights and permissions for uploaded content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. YouTube API Compliance</h2>
          <p className="text-muted-foreground mb-4">
            This application uses YouTube API Services. By using this application, you agree to comply with:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>YouTube's Terms of Service</li>
            <li>Google's Privacy Policy</li>
            <li>YouTube API Services Terms of Service</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            You can revoke this application's access to your YouTube account at any time through your{' '}
            <a 
              href="https://myaccount.google.com/permissions" 
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account Settings
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Prohibited Uses</h2>
          <p className="text-muted-foreground mb-4">
            You may not use this service to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Upload content that violates YouTube's Community Guidelines</li>
            <li>Upload copyrighted content without authorization</li>
            <li>Spam or upload content at an abusive rate</li>
            <li>Attempt to circumvent YouTube's upload limits</li>
            <li>Use the service for any illegal purpose</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Limitation of Liability</h2>
          <p className="text-muted-foreground mb-4">
            This application is provided "as is" without warranties of any kind. We are not responsible for:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Failed uploads due to YouTube API issues</li>
            <li>Content removed by YouTube for policy violations</li>
            <li>Any loss of data or content</li>
            <li>Channel suspensions or terminations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Data Storage</h2>
          <p className="text-muted-foreground mb-4">
            Video files uploaded to this application are temporarily stored for the purpose of uploading to YouTube. Files are automatically deleted after successful upload or after a reasonable period if upload fails.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
          <p className="text-muted-foreground mb-4">
            We reserve the right to terminate or suspend your account at any time for any reason, including violation of these terms. You may also terminate your account by disconnecting your YouTube channels and deleting your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may modify these terms at any time. We will notify you of any changes by posting the new terms on this page. Your continued use of the service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about these Terms, please contact us through the application.
          </p>
        </section>
      </div>
    </div>
  );
}