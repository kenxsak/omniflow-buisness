
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from "@/contexts/currency-context";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: 'OmniFlow | Pricing & Features',
  description: 'Explore OmniFlow plans. Automate your business with AI-powered CRM, email marketing, social content generation, and ad management. Find the perfect plan for your team.',
  metadataBase: new URL('https://omniflow.wmart.in'),
  keywords: ['SaaS pricing', 'CRM', 'AI marketing', 'business automation', 'lead management', 'email marketing', 'social media AI'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://omniflow.wmart.in',
    siteName: 'OmniFlow',
    title: 'OmniFlow | Pricing & Features',
    description: 'The All-in-One Business Automation Platform, powered by AI.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'OmniFlow Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniFlow | Pricing & Features',
    description: 'The All-in-One Business Automation Platform, powered by AI.',
    images: ['/logo.png'],
  },
};


export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Public pages still need access to providers for currency display and auth state.
    <AuthProvider>
      <CurrencyProvider>
          {children}
        <Toaster />
      </CurrencyProvider>
    </AuthProvider>
  );
}

    