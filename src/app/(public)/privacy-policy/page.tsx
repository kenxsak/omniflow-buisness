import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">OmniFlow</Link>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground mb-6">Last updated: January 2025 | For complete privacy details, see <a href="https://wmart.in/policies.html" className="text-primary hover:underline">WMart.in Privacy Policy</a></p>

            <h2>1. Introduction</h2>
            <p>
              WMart Online Services ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>

            <h2>2. Information We Collect</h2>
            <p>
              We collect information you voluntarily provide, such as:
            </p>
            <ul>
              <li>Account registration information (name, email, company)</li>
              <li>Profile and preferences</li>
              <li>Communications and support requests</li>
              <li>Payment information (processed securely)</li>
              <li>Usage data and analytics</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>
              We use collected information to:
            </p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions</li>
              <li>Send administrative information and updates</li>
              <li>Respond to inquiries and support requests</li>
              <li>Analyze usage patterns and trends</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>

            <h2>5. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability</li>
            </ul>

            <h2>6. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at support@worldmart.in or visit <a href="https://wmart.in/policies.html" className="text-primary hover:underline">our full privacy policy</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
