'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Code2, Calendar, MessageSquare, Bot, Layers, ExternalLink, Info, AlertCircle } from 'lucide-react';

interface WebsiteEmbedCodesProps {
  cardUsername: string;
  calcomUsername?: string;
  calcomEventSlug?: string;
  voiceChatEnabled?: boolean;
  contactFormEnabled?: boolean;
  calendarBookingEnabled?: boolean;
  primaryColor?: string;
  businessName?: string;
}

export default function WebsiteEmbedCodes({
  cardUsername,
  calcomUsername,
  calcomEventSlug,
  voiceChatEnabled,
  contactFormEnabled,
  calendarBookingEnabled,
  primaryColor = '#3B82F6',
  businessName = 'My Business'
}: WebsiteEmbedCodesProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}` 
    : 'https://app.omniflow.wmart.in';
  
  const digitalCardUrl = `${baseUrl}/card/${cardUsername}`;
  const calcomUrl = calcomEventSlug 
    ? `https://cal.com/${calcomUsername}/${calcomEventSlug}`
    : `https://cal.com/${calcomUsername}`;

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const digitalCardEmbedCode = `<!-- OmniFlow Digital Card Embed -->
<iframe 
  src="${digitalCardUrl}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 450px;">
</iframe>`;

  const digitalCardButtonCode = `<!-- Link to Digital Card -->
<a href="${digitalCardUrl}" 
   target="_blank"
   style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: Arial, sans-serif; font-weight: 500;">
  💬 Contact ${businessName}
</a>`;

  const calcomInlineCode = calcomUsername ? `<!-- Cal.com Inline Booking Calendar (Responsive) -->
<div style="position: relative; width: 100%; max-width: 100%; overflow: hidden;">
  <iframe 
    src="${calcomUrl}?embed=true&theme=light" 
    width="100%" 
    height="600" 
    frameborder="0"
    style="border-radius: 8px; min-width: 280px; max-width: 100%; border: none;"
    loading="lazy">
  </iframe>
</div>
<style>
  @media (max-width: 480px) {
    iframe[src*="cal.com"] { height: 500px !important; }
  }
  @media (max-width: 360px) {
    iframe[src*="cal.com"] { height: 450px !important; min-width: 100% !important; }
  }
</style>` : '';

  const calcomPopupCode = calcomUsername ? `<!-- Cal.com Popup Booking Button -->
<script src="https://app.cal.com/embed/embed.js" async></script>
<button 
  data-cal-link="${calcomUsername}${calcomEventSlug ? '/' + calcomEventSlug : ''}" 
  style="background: ${primaryColor}; color: white; padding: 14px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-family: Arial, sans-serif; font-weight: 500;">
  📅 Book Appointment
</button>` : '';

  const calcomFloatingCode = calcomUsername ? `<!-- Cal.com Floating Button (Bottom Corner) -->
<script src="https://app.cal.com/embed/embed.js" async></script>
<script>
  Cal("floatingButton", {
    calLink: "${calcomUsername}${calcomEventSlug ? '/' + calcomEventSlug : ''}",
    buttonText: "Book Now",
    buttonColor: "${primaryColor}",
    buttonTextColor: "#ffffff"
  });
</script>` : '';

  const combinedCode = `<!-- Complete Lead Capture Section -->
<section style="max-width: 600px; margin: 40px auto; padding: 20px; font-family: Arial, sans-serif; text-align: center;">
  <h2 style="margin-bottom: 24px; color: #1f2937;">Get in Touch with ${businessName}</h2>
  
  <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
    ${calcomUsername ? `
    <!-- Book Appointment -->
    <button 
      data-cal-link="${calcomUsername}${calcomEventSlug ? '/' + calcomEventSlug : ''}" 
      style="background: ${primaryColor}; color: white; padding: 14px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 500;">
      📅 Book Appointment
    </button>` : ''}
    
    <!-- Contact Form -->
    <a href="${digitalCardUrl}" 
       target="_blank"
       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
      💬 Send Message
    </a>
  </div>
  
  <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
    We typically respond within 24 hours
  </p>
</section>

${calcomUsername ? '<!-- Cal.com Script (required for booking button) -->\n<script src="https://app.cal.com/embed/embed.js" async></script>' : ''}`;

  const directLinksCode = `<!-- Direct Links (No Code Required) -->

📍 Your Digital Card URL:
${digitalCardUrl}

${calcomUsername ? `📅 Your Booking URL:
${calcomUrl}

📅 Embeddable Booking URL:
${calcomUrl}?embed=true` : ''}

Share these links anywhere:
• Email signatures
• Social media bios (Instagram, LinkedIn, Twitter)
• WhatsApp/SMS messages
• QR codes
• Business cards`;

  const voiceChatInstructions = `Voice Chat AI is configured company-wide in Settings.

To add Voice AI to any external website:

1️⃣ Go to Settings → API Integrations
2️⃣ Scroll to "Voice Chat AI" section
3️⃣ Copy your widget embed code (already configured with your settings)
4️⃣ Paste it into your website's HTML (before </body> tag)

The widget provides:
✓ Live voice chat in 109+ languages
✓ AI-powered conversations 24/7
✓ Automatic lead capture
✓ Direct CRM integration

💡 Your widget code is personalized with your business info and API key.
   Always copy from Settings to ensure it's correctly configured.`;

  const CodeBlock = ({ 
    code, 
    type, 
    title, 
    description 
  }: { 
    code: string; 
    type: string; 
    title: string; 
    description: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(code, type)}
          className="gap-2"
        >
          {copiedCode === type ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <Textarea
        value={code}
        readOnly
        rows={Math.min(code.split('\n').length + 1, 12)}
        className="font-mono text-xs bg-slate-50 dark:bg-slate-900"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Website Embed Codes
        </CardTitle>
        <CardDescription>
          Copy these codes to add booking and lead capture to any website
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!cardUsername && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please set a username in the <strong>Basic Info</strong> tab first to generate embed codes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="links" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="links" className="text-xs sm:text-sm">
              <ExternalLink className="h-4 w-4 mr-1 hidden sm:inline" />
              Links
            </TabsTrigger>
            <TabsTrigger value="calcom" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="card" className="text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="voicechat" className="text-xs sm:text-sm">
              <Bot className="h-4 w-4 mr-1 hidden sm:inline" />
              Voice AI
            </TabsTrigger>
            <TabsTrigger value="combined" className="text-xs sm:text-sm">
              <Layers className="h-4 w-4 mr-1 hidden sm:inline" />
              Combined
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>No coding required!</strong> Share these URLs directly via email, social media, or QR codes.
              </AlertDescription>
            </Alert>
            <CodeBlock
              code={directLinksCode}
              type="links"
              title="Direct URLs"
              description="Share these links anywhere without any code"
            />
          </TabsContent>

          <TabsContent value="calcom" className="space-y-4">
            {calcomUsername ? (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    Cal.com is configured! Bookings will sync to OmniFlow CRM automatically.
                  </AlertDescription>
                </Alert>
                <CodeBlock
                  code={calcomPopupCode}
                  type="calcom-popup"
                  title="Popup Button (Recommended)"
                  description="Opens calendar in a modal when clicked"
                />
                <CodeBlock
                  code={calcomInlineCode}
                  type="calcom-inline"
                  title="Inline Calendar"
                  description="Shows the full calendar directly on your page"
                />
                <CodeBlock
                  code={calcomFloatingCode}
                  type="calcom-floating"
                  title="Floating Button"
                  description="Fixed button in bottom corner of page"
                />
              </>
            ) : (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-300">
                <AlertDescription className="text-sm text-yellow-800">
                  ⚠️ Cal.com is not configured. Enable Calendar Booking in the <strong>Lead Capture</strong> tab and enter your Cal.com username to get booking embed codes.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="card" className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-800">
                Leads submitted through your Digital Card go directly to your OmniFlow CRM.
              </AlertDescription>
            </Alert>
            <CodeBlock
              code={digitalCardButtonCode}
              type="card-button"
              title="Contact Button (Recommended)"
              description="Opens your Digital Card in a new tab"
            />
            <CodeBlock
              code={digitalCardEmbedCode}
              type="card-embed"
              title="Embedded Card"
              description="Shows your full Digital Card on your website"
            />
          </TabsContent>

          <TabsContent value="voicechat" className="space-y-4">
            {voiceChatEnabled ? (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <Bot className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    Voice Chat AI is enabled on this card! To add it to other websites, get your widget code from Settings.
                  </AlertDescription>
                </Alert>
                <CodeBlock
                  code={voiceChatInstructions}
                  type="voicechat-instructions"
                  title="How to Add Voice AI to Any Website"
                  description="Your personalized embed code is available in Settings → API Integrations"
                />
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    <strong>Quick Access:</strong> Go to Settings → API Integrations → Voice Chat AI to copy your ready-to-use embed code.
                  </p>
                  <a 
                    href="/settings/integrations" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                  >
                    Open API Integrations →
                  </a>
                </div>
              </>
            ) : (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-300">
                <AlertDescription className="text-sm text-yellow-800">
                  ⚠️ Voice Chat AI is not enabled on this card. Enable it in the <strong>Lead Capture</strong> tab to use Voice AI for lead capture. Configure it company-wide in <strong>Settings → API Integrations</strong>.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="combined" className="space-y-4">
            <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <Layers className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Complete solution!</strong> This code adds both booking and contact options in one section.
              </AlertDescription>
            </Alert>
            <CodeBlock
              code={combinedCode}
              type="combined"
              title="Complete Lead Capture Section"
              description="Ready-to-use section with booking + contact buttons"
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How Leads Flow to OmniFlow:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>📅 <strong>Cal.com Bookings</strong> → Sync in CRM → Appointments (click Sync button)</li>
            <li>💬 <strong>Digital Card Form</strong> → Directly added to CRM → Leads</li>
            <li>🤖 <strong>Voice Chat AI</strong> → Captures contact info → Creates leads automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
