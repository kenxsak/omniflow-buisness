import Link from 'next/link';

export default function CookiePolicyPage() {
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
            <h1>Cookie Policy</h1>
            <p className="text-muted-foreground mb-6">Last updated: January 2025 | Service by WMart Online Services</p>

            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small files placed on your device when you visit our website. They help us recognize you, remember your preferences, and improve your experience.
            </p>

            <h2>2. Types of Cookies We Use</h2>
            <h3>Essential Cookies</h3>
            <p>
              Required for the website to function properly, including authentication and security.
            </p>
            
            <h3>Performance Cookies</h3>
            <p>
              Help us understand how users interact with our website to improve functionality and user experience.
            </p>
            
            <h3>Analytics Cookies</h3>
            <p>
              Allow us to track and analyze how visitors use our website, including traffic sources and user behavior.
            </p>

            <h2>3. Third-Party Cookies</h2>
            <p>
              We may allow third-party services (e.g., analytics providers) to set cookies on your device. These services have their own cookie policies.
            </p>

            <h2>4. Your Cookie Preferences</h2>
            <p>
              Most browsers allow you to control cookies through their settings. You can:
            </p>
            <ul>
              <li>Block all cookies</li>
              <li>Delete existing cookies</li>
              <li>Allow only certain types of cookies</li>
              <li>Receive alerts when new cookies are set</li>
            </ul>

            <h2>5. Impact of Disabling Cookies</h2>
            <p>
              Disabling cookies may affect the functionality of our website and your user experience. Some features may not work properly without cookies.
            </p>

            <h2>6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy periodically. Your continued use of OmniFlow following any changes constitutes your acceptance of the new Cookie Policy.
            </p>

            <h2>7. Contact Us</h2>
            <p>
              If you have questions about our Cookie Policy, please contact us at support@worldmart.in or visit <a href="https://wmart.in/policies.html" className="text-primary hover:underline">our full cookie policy</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
