
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'OmniFlow - AI-Powered Sales & Marketing Automation for SMEs | Replace 10+ Tools',
  description: 'All-in-one AI-powered CRM, email marketing, WhatsApp, SMS, and content automation for small businesses. Replace HubSpot, Mailchimp, and 8 more tools at 1/10th the cost. Save $30,000/year. Free 14-day trial.',
  metadataBase: new URL('https://app.omniflow.wmart.in'),
  applicationName: 'OmniFlow',
  keywords: [
    // Primary keywords
    'ai marketing automation', 'crm for small business', 'email marketing platform', 
    'whatsapp marketing', 'sms marketing tool', 'marketing automation software',
    // Feature keywords
    'ai content generation', 'ai email campaigns', 'multi-channel marketing', 
    'lead management software', 'sales automation', 'digital business cards',
    // Competitor comparison keywords
    'hubspot alternative', 'mailchimp alternative', 'activecampaign alternative',
    'gohighlevel alternative', 'affordable crm', 'cheap marketing automation',
    // Location-specific
    'marketing automation india', 'crm india', 'whatsapp business api india',
    // Long-tail keywords
    'all in one marketing platform', 'ai powered marketing tools', 
    'small business marketing software', 'startup marketing automation',
    'automated email campaigns', 'bulk whatsapp messaging', 'sms blast service'
  ],
  authors: [{ name: 'OmniFlow Team', url: 'https://app.omniflow.wmart.in' }],
  creator: 'OmniFlow',
  publisher: 'OmniFlow',
  category: 'Business & Marketing Software',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', sizes: 'any', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OmniFlow - AI Marketing',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.omniflow.wmart.in',
    title: 'OmniFlow - Replace 10+ Marketing Tools with One AI Platform | Save $30K/Year',
    description: 'All-in-one AI marketing automation: CRM, Email, WhatsApp, SMS, and content creation for SMEs. Replace HubSpot ($800/mo) + Mailchimp ($300/mo) + 8 tools with OmniFlow ($29-249/mo). 14-day free trial, no credit card required.',
    siteName: 'OmniFlow',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'OmniFlow - AI-Powered All-in-One Sales & Marketing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniFlow - AI Marketing Automation That Replaces 10+ Tools',
    description: 'Save $30,000/year with OmniFlow. All-in-one platform: CRM, Email, WhatsApp, SMS & AI content. Free 14-day trial.',
    images: ['/logo.png'],
    creator: '@omniflow',
  },
  alternates: {
    canonical: 'https://app.omniflow.wmart.in',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OmniFlow" />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                
                if (isProduction) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker
                      .register('/sw.js')
                      .then(function(registration) {
                        console.log('[OmniFlow SW] Service Worker registered successfully:', registration.scope);
                        
                        registration.addEventListener('updatefound', function() {
                          const newWorker = registration.installing;
                          if (newWorker) {
                            newWorker.addEventListener('statechange', function() {
                              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[OmniFlow SW] New version available! Refresh to update.');
                              }
                            });
                          }
                        });
                      })
                      .catch(function(error) {
                        console.error('[OmniFlow SW] Service Worker registration failed:', error);
                      });
                  });
                } else {
                  console.log('[OmniFlow SW] Service Worker not registered in development mode');
                }
              } else {
                console.log('[OmniFlow SW] Service Workers are not supported in this browser');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
