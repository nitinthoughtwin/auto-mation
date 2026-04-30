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
          <strong>Last updated:</strong> April 29, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground mb-4">
            By accessing and using this YouTube Automation application, you accept and agree to be bound by
            these Terms of Service and by the{' '}
            <a
              href="https://www.youtube.com/t/terms"
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube Terms of Service
            </a>. If you do not agree to these terms, please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground mb-4">
            This application provides automation services for YouTube video management, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Connecting and managing multiple YouTube channels</li>
            <li>Scheduling video uploads at specified times</li>
            <li>Bulk video upload capabilities with user-defined privacy settings</li>
            <li>Automatic thumbnail uploads</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            You are paying for access to our <strong>automation and scheduling service</strong>, not for
            YouTube API access itself. Our service acts on your behalf using your authorized YouTube account
            credentials. We do not sell, redistribute, or sublicense YouTube API Services or YouTube
            audiovisual content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. YouTube Terms of Service Compliance</h2>
          <p className="text-muted-foreground mb-4">
            This application uses YouTube API Services. By using this application, you agree to be bound by:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>
              <a
                href="https://www.youtube.com/t/terms"
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube API Services Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://policies.google.com/privacy"
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Privacy Policy
              </a>
            </li>
          </ul>
          <p className="text-muted-foreground mt-4">
            You can revoke this application&apos;s access to your YouTube account at any time through your{' '}
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
          <h2 className="text-xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="text-muted-foreground mb-4">
            You are responsible for:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All content uploaded through your account</li>
            <li>Ensuring uploaded content complies with the YouTube Terms of Service and Community Guidelines</li>
            <li>Obtaining all necessary rights, licenses, and permissions for any content you upload</li>
            <li>Setting appropriate privacy status (Public, Private, or Unlisted) for your videos</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Prohibited Uses</h2>
          <p className="text-muted-foreground mb-4">
            You may not use this service to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Upload content that violates YouTube&apos;s Community Guidelines</li>
            <li>Upload copyrighted content without proper authorization or license</li>
            <li>Spam or upload content at an abusive rate</li>
            <li>Attempt to circumvent YouTube&apos;s upload limits or policies</li>
            <li>Sell, purchase, lease, redistribute, or sublicense YouTube API Services or YouTube audiovisual content</li>
            <li>Use the service for any illegal purpose</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. No Redistribution of YouTube API Services</h2>
          <p className="text-muted-foreground mb-4">
            You agree that you will not, and will not encourage or enable others to, sell, purchase, lease,
            lend, convey, redistribute, or sublicense all or any portion of YouTube API Services or YouTube
            audiovisual content obtained through this application. Our service provides an automation layer
            for your own YouTube channels using your own authorized credentials only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
          <p className="text-muted-foreground mb-4">
            This application is provided &quot;as is&quot; without warranties of any kind. We are not responsible for:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Failed uploads due to YouTube API issues or quota limits</li>
            <li>Content removed by YouTube for policy violations</li>
            <li>Any loss of data or content</li>
            <li>Channel suspensions or terminations by YouTube</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Data Storage</h2>
          <p className="text-muted-foreground mb-4">
            Video files uploaded to this application are temporarily stored for the purpose of uploading to
            YouTube. Files are automatically deleted after successful upload or within 24 hours if the upload
            fails. We do not retain your video content beyond what is necessary to provide the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Termination</h2>
          <p className="text-muted-foreground mb-4">
            We reserve the right to terminate or suspend your account at any time for any reason, including
            violation of these terms or the YouTube Terms of Service. You may also terminate your account by
            disconnecting your YouTube channels and deleting your account from the settings page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may modify these terms at any time. We will notify you of any material changes by posting the
            new terms on this page. Your continued use of the service after changes constitutes acceptance of
            the updated terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about these Terms, please contact us through the application or visit our
            contact page.
          </p>
        </section>
      </div>
    </div>
  );
}
