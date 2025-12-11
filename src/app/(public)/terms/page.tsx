import Link from 'next/link';

export default function TermsPage() {
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
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground mb-6">Last updated: January 2025 | For complete terms, see <a href="https://wmart.in/policies.html" className="text-primary hover:underline">WMart.in Terms</a></p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using OmniFlow (a service of WMart Online Services), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2>2. Use License</h2>
            <p>
              WMart Online Services (OmniFlow) grants you a limited, non-exclusive, non-transferable license to use the platform for legitimate business purposes. You agree not to:
            </p>
            <ul>
              <li>Reproduce, duplicate, copy, or sell any part of the Service</li>
              <li>Attempt unauthorized access to the Service</li>
              <li>Use the Service for illegal purposes</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass or cause harm to others</li>
            </ul>

            <h2>3. Disclaimer</h2>
            <p>
              The materials on OmniFlow are provided on an 'as is' basis. OmniFlow makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h2>4. Limitations of Liability</h2>
            <p>
              In no event shall OmniFlow or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on OmniFlow.
            </p>

            <h2>5. Accuracy of Materials</h2>
            <p>
              The materials appearing on OmniFlow could include technical, typographical, or photographic errors. OmniFlow does not warrant that any of the materials on its website are accurate, complete, or current.
            </p>

            <h2>6. Modifications</h2>
            <p>
              OmniFlow may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>

            <h2>7. Governing Law</h2>
            <p>
              These terms and conditions are governed by the laws of India, and disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
            </p>

            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@worldmart.in or visit <a href="https://wmart.in/policies.html" className="text-primary hover:underline">our complete terms</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
