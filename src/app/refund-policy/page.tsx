import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | GPMart AI Studio',
};

export default function RefundPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Refund Policy</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-6">
          <strong>Last updated:</strong> April 2025
        </p>

        <p className="text-muted-foreground mb-8">
          At GPMart AI Studio, we want you to be completely satisfied with your subscription. Please read this refund policy carefully before purchasing any plan.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Subscription Plans</h2>
          <p className="text-muted-foreground mb-4">
            GPMart AI Studio offers monthly subscription plans (Starter, Basic, Pro, Premium). All plans are billed on a recurring monthly basis. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Refund Eligibility</h2>
          <p className="text-muted-foreground mb-4">
            We offer refunds under the following conditions:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>
              <strong>7-day refund window:</strong> If you are not satisfied with your subscription, you may request a full refund within 7 days of your initial purchase.
            </li>
            <li>
              <strong>Service unavailability:</strong> If our platform experiences downtime exceeding 48 consecutive hours due to technical issues on our end, you are eligible for a pro-rated refund for the affected period.
            </li>
            <li>
              <strong>Duplicate charges:</strong> If you were charged more than once for the same subscription period, we will refund the duplicate amount immediately.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Non-Refundable Situations</h2>
          <p className="text-muted-foreground mb-4">
            Refunds will <strong>not</strong> be issued in the following cases:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Requests made after 7 days from the date of purchase</li>
            <li>Renewal charges — we send a reminder email before each renewal; it is your responsibility to cancel before the renewal date if you do not wish to continue</li>
            <li>Partial month usage — if you cancel mid-cycle, you retain access until the end of the billing period but no partial refund is issued</li>
            <li>Violations of our Terms of Service that result in account suspension</li>
            <li>Issues caused by third-party services (YouTube API limits, Google OAuth, Cloudflare) beyond our control</li>
            <li>Change of mind after the 7-day window has passed</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. How to Request a Refund</h2>
          <p className="text-muted-foreground mb-4">
            To request a refund, please contact us within the eligible window:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>Email: <strong>support@gpmart.in</strong></li>
            <li>Subject line: <strong>Refund Request — [Your registered email]</strong></li>
            <li>Include: your registered email address, order/payment ID, reason for refund</li>
          </ul>
          <p className="text-muted-foreground mb-4">
            We will review your request and respond within <strong>2-3 business days</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Refund Processing</h2>
          <p className="text-muted-foreground mb-4">
            Approved refunds will be processed to the original payment method:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li><strong>UPI / Net Banking / Debit Card:</strong> 5-7 business days</li>
            <li><strong>Credit Card:</strong> 7-10 business days</li>
            <li><strong>Razorpay Wallet:</strong> Instant to 24 hours</li>
          </ul>
          <p className="text-muted-foreground mb-4">
            Refund timelines depend on your bank or payment provider and are outside our control once initiated.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Cancellation Policy</h2>
          <p className="text-muted-foreground mb-4">
            You may cancel your subscription at any time from your billing settings. Upon cancellation:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>You will retain access to your current plan until the end of the billing period</li>
            <li>You will not be charged for the next billing cycle</li>
            <li>Your data will be retained for 30 days after cancellation, after which it may be deleted</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Plan Upgrades & Downgrades</h2>
          <p className="text-muted-foreground mb-4">
            When upgrading your plan, the new plan takes effect immediately and you will be charged the new plan price at the next billing cycle. When downgrading, the change takes effect at the start of the next billing period. No refunds are issued for the difference when downgrading mid-cycle.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Free Plan</h2>
          <p className="text-muted-foreground mb-4">
            The Free plan is provided at no cost and is not eligible for any refund requests. We encourage you to test our platform on the Free plan before purchasing a paid subscription.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about this Refund Policy, please contact us:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Email: <strong>support@gpmart.in</strong></li>
            <li>Website: <strong>https://gpmart.in</strong></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
