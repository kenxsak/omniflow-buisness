
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardCopy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const MOCK_WEBHOOK_BASE_URL = "https://api.omniflow.example.com/automatic-updates";

interface WebhookEndpoint {
  id: string;
  name: string;
  description: string;
  url?: string;
  eventExamples: string[];
  setupSteps?: string[];
  category?: 'ecommerce' | 'calendar' | 'contact';
  icon?: string;
}

const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'shopify',
    name: '🛍️ Shopify',
    description: 'Automatically capture customers and orders from your Shopify store as new contacts in OmniFlow.',
    eventExamples: ['New order placed', 'New customer registered', 'Order status updated'],
    category: 'ecommerce',
    setupSteps: [
      '1. Go to Shopify Admin → Settings → Webhooks',
      '2. Click "Create webhook"',
      '3. Event: Select "Order created" or "Customer created"',
      '4. Paste the webhook URL below',
      '5. Save and test the webhook'
    ]
  },
  {
    id: 'woocommerce',
    name: '🏪 WooCommerce',
    description: 'Sync your WordPress WooCommerce orders and customers directly to OmniFlow contacts.',
    eventExamples: ['Order completed', 'New customer registration', 'Customer data updated'],
    category: 'ecommerce',
    setupSteps: [
      '1. Go to WooCommerce → Settings → Webhooks',
      '2. Click "Create webhook"',
      '3. Event: Select "Order created" or "Customer created"',
      '4. Paste the webhook URL below',
      '5. Save and test'
    ]
  },
  {
    id: 'wordpress',
    name: '📝 WordPress (Custom)',
    description: 'Connect custom WordPress plugins or forms to automatically send contact data to OmniFlow.',
    eventExamples: ['Form submission', 'User registration', 'Custom event trigger'],
    category: 'ecommerce',
    setupSteps: [
      '1. Configure your WordPress plugin to send data to OmniFlow',
      '2. Send POST requests with name, email, phone, and action',
      '3. Format: {"name": "...", "email": "...", "phone": "...", "action": "..."}',
      '4. OmniFlow will automatically create/update contacts'
    ]
  },
  {
    id: 'calendar-booking',
    name: '📅 Cal.com Bookings',
    description: 'Turn your Cal.com appointment bookings into automatic contacts in OmniFlow.',
    eventExamples: ['New booking created', 'Appointment scheduled', 'Meeting confirmed'],
    category: 'calendar',
    setupSteps: [
      '1. Go to Cal.com → Settings → Webhooks/Integrations',
      '2. Click "Add New Webhook"',
      '3. Event: Select "Booking Created"',
      '4. Paste the webhook URL below',
      '5. Click "Ping test" to verify (should return 200 OK)'
    ]
  },
  {
    id: 'new-contact',
    name: 'Voice Chat AI',
    description: 'Automatically capture customer information from Voice Chat AI voice calls.',
    eventExamples: ['New voice call completed', 'Customer information recorded', 'AI transcription saved'],
    category: 'contact',
    setupSteps: [
      '1. Go to Voice Chat AI settings',
      '2. Find "Webhook" or "Automatic Updates" section',
      '3. Paste the webhook URL below',
      '4. Save configuration'
    ]
  },
  {
    id: 'email-unsubscribe',
    name: 'Email Unsubscribe',
    description: 'When a contact unsubscribes from your email platform, automatically update their preferences in OmniFlow.',
    eventExamples: ['Someone clicks "unsubscribe" in Brevo', 'Person opts out of emails in Mailchimp'],
    category: 'contact',
  },
  {
    id: 'payment-received',
    name: 'Payment Received',
    description: 'When a payment is successfully received, automatically update the contact status or trigger next steps.',
    eventExamples: ['Successful payment via Stripe', 'Completed PayPal transaction'],
    category: 'contact',
  }
];

export default function WebhookInfo() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [generatedEndpoints, setGeneratedEndpoints] = useState<WebhookEndpoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/automatic-updates` : MOCK_WEBHOOK_BASE_URL;
    let accountId = appUser?.companyId || "your-account-id";

    setGeneratedEndpoints(
      webhookEndpoints.map(endpoint => ({
        ...endpoint,
        url: `${baseUrl}/${endpoint.id}?account=${accountId}`
      }))
    );
  }, [appUser?.companyId]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied!', description: 'Connection link copied to clipboard.' });
    }).catch(err => {
      toast({ title: 'Copy Failed', description: 'Could not copy link to clipboard.', variant: 'destructive' });
      console.error('Failed to copy text: ', err);
    });
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatic Updates</CardTitle>
           <CardDescription>Information about connecting other apps to send data to OmniFlow automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading connection information...</p>
        </CardContent>
      </Card>
    );
  }

  const ecommerceEndpoints = generatedEndpoints.filter(e => e.category === 'ecommerce');
  const calendarEndpoints = generatedEndpoints.filter(e => e.category === 'calendar');
  const contactEndpoints = generatedEndpoints.filter(e => e.category === 'contact').filter(e => ['new-contact', 'email-unsubscribe', 'payment-received'].includes(e.id));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Integrations</CardTitle>
          <CardDescription>
            Connect your business tools to automatically send customer and order data to OmniFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How Webhooks Work</AlertTitle>
            <AlertDescription>
              When something happens in your store or app (new order, customer signup, booking), that app sends the information to OmniFlow. Your contacts are automatically created and updated in real-time.
            </AlertDescription>
          </Alert>

          {/* Secret Token Section */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-base">Your Webhook Secret Token</CardTitle>
              <CardDescription>Use this token in your store's webhook settings for authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <code className="text-sm bg-white dark:bg-slate-900 p-3 rounded flex-1 overflow-auto border border-blue-200 dark:border-blue-800 text-foreground font-mono break-all">
                  omniflow_webhook_secure_token
                </code>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => handleCopyToClipboard('omniflow_webhook_secure_token')}
                  className="h-auto"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Keep this token secret. When setting up webhooks in your store settings, you may be asked for a "Secret", "Token", or "Authorization Header". Paste this value there.
              </p>
            </CardContent>
          </Card>

          {/* All Webhooks in Accordion */}
          <Accordion type="single" collapsible className="space-y-2">
            {/* E-Commerce Webhooks */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">E-Commerce Integrations</h3>
              {ecommerceEndpoints.map(endpoint => (
                <AccordionItem key={endpoint.id} value={endpoint.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent">
                    <span className="font-semibold text-left">{endpoint.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Events Captured:</p>
                      <ul className="list-disc list-inside pl-1 text-xs text-muted-foreground space-y-1">
                        {endpoint.eventExamples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                      </ul>
                    </div>

                    {endpoint.setupSteps && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Setup Steps:</p>
                        <ol className="text-xs text-muted-foreground space-y-1">
                          {endpoint.setupSteps.map((step, idx) => <li key={idx}>{step}</li>)}
                        </ol>
                      </div>
                    )}

                    <div className="pt-2 space-y-2 bg-slate-50 dark:bg-slate-900/30 p-3 rounded">
                      <p className="text-xs font-medium text-muted-foreground">Webhook URL:</p>
                      <div className="flex gap-2">
                        <code className="text-xs bg-slate-200 dark:bg-slate-800 p-2 rounded flex-1 overflow-auto text-foreground break-all">
                          {endpoint.url}
                        </code>
                        <Button 
                          size="sm"
                          variant="outline" 
                          onClick={() => endpoint.url && handleCopyToClipboard(endpoint.url)}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>

            {/* Calendar Webhooks */}
            <div className="space-y-3 pt-4">
              <h3 className="text-lg font-semibold">Calendar & Scheduling</h3>
              {calendarEndpoints.map(endpoint => (
                <AccordionItem key={endpoint.id} value={endpoint.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent">
                    <span className="font-semibold text-left">{endpoint.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Events Captured:</p>
                      <ul className="list-disc list-inside pl-1 text-xs text-muted-foreground space-y-1">
                        {endpoint.eventExamples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                      </ul>
                    </div>

                    {endpoint.setupSteps && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Setup Steps:</p>
                        <ol className="text-xs text-muted-foreground space-y-1">
                          {endpoint.setupSteps.map((step, idx) => <li key={idx}>{step}</li>)}
                        </ol>
                      </div>
                    )}

                    <div className="pt-2 space-y-2 bg-slate-50 dark:bg-slate-900/30 p-3 rounded">
                      <p className="text-xs font-medium text-muted-foreground">Webhook URL:</p>
                      <div className="flex gap-2">
                        <code className="text-xs bg-slate-200 dark:bg-slate-800 p-2 rounded flex-1 overflow-auto text-foreground break-all">
                          {endpoint.url}
                        </code>
                        <Button 
                          size="sm"
                          variant="outline" 
                          onClick={() => endpoint.url && handleCopyToClipboard(endpoint.url)}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>

            {/* Voice & Communication Webhooks */}
            {contactEndpoints.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold">Voice & Communication</h3>
                {contactEndpoints.map(endpoint => (
                  <AccordionItem key={endpoint.id} value={endpoint.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent">
                      <span className="font-semibold text-left">{endpoint.name}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Events Captured:</p>
                        <ul className="list-disc list-inside pl-1 text-xs text-muted-foreground space-y-1">
                          {endpoint.eventExamples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                        </ul>
                      </div>

                      <div className="pt-2 space-y-2 bg-slate-50 dark:bg-slate-900/30 p-3 rounded">
                        <p className="text-xs font-medium text-muted-foreground">Webhook URL:</p>
                        <div className="flex gap-2">
                          <code className="text-xs bg-slate-200 dark:bg-slate-800 p-2 rounded flex-1 overflow-auto text-foreground break-all">
                            {endpoint.url}
                          </code>
                          <Button 
                            size="sm"
                            variant="outline" 
                            onClick={() => endpoint.url && handleCopyToClipboard(endpoint.url)}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </div>
            )}
          </Accordion>

          <Alert className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700">
            <Info className="h-4 w-4 !text-green-600 dark:!text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">✅ Ready to Connect</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              All webhooks are active and ready to receive data from your stores and applications. Follow the setup steps above for each platform you want to connect.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
