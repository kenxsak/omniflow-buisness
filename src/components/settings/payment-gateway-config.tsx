"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  DollarSign, 
  IndianRupee,
  ExternalLink,
  Copy,
  Loader2,
  AlertTriangle,
  Shield,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GatewayStatus {
  configured: boolean;
  publicKeyPresent: boolean;
  secretKeyPresent: boolean;
  webhookSecretPresent?: boolean;
}

export default function PaymentGatewayConfig() {
  const { toast } = useToast();
  const [stripeStatus, setStripeStatus] = useState<GatewayStatus>({ configured: false, publicKeyPresent: false, secretKeyPresent: false });
  const [razorpayStatus, setRazorpayStatus] = useState<GatewayStatus>({ configured: false, publicKeyPresent: false, secretKeyPresent: false });
  const [isLoading, setIsLoading] = useState(true);
  const [testingStripe, setTestingStripe] = useState(false);
  const [testingRazorpay, setTestingRazorpay] = useState(false);

  // Get current domain from window
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const stripeWebhookUrl = `${appUrl}/api/webhooks/stripe`;
  const razorpayWebhookUrl = `${appUrl}/api/webhooks/razorpay`;

  useEffect(() => {
    checkPaymentGatewayStatus();
  }, []);

  const checkPaymentGatewayStatus = async () => {
    setIsLoading(true);
    try {
      // Check Stripe configuration
      const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
      setStripeStatus({
        configured: !!stripePublicKey,
        publicKeyPresent: !!stripePublicKey,
        secretKeyPresent: true, // We can't check server-side secrets from client
        webhookSecretPresent: true
      });

      // Check Razorpay configuration
      const razorpayPublicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      setRazorpayStatus({
        configured: !!razorpayPublicKey,
        publicKeyPresent: !!razorpayPublicKey,
        secretKeyPresent: true,
        webhookSecretPresent: true
      });
    } catch (error) {
      console.error('Error checking payment gateway status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const testStripeConnection = async () => {
    setTestingStripe(true);
    try {
      // Simple check - if public key exists, Stripe is likely configured
      if (stripeStatus.publicKeyPresent) {
        toast({
          title: 'Stripe Configuration Detected',
          description: 'Stripe public key is present. Test a payment on the pricing page to verify full setup.',
        });
      } else {
        toast({
          title: 'Stripe Not Configured',
          description: 'Please add Stripe API keys to Replit Secrets',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not verify Stripe configuration',
        variant: 'destructive',
      });
    } finally {
      setTestingStripe(false);
    }
  };

  const testRazorpayConnection = async () => {
    setTestingRazorpay(true);
    try {
      // Simple check - if public key exists, Razorpay is likely configured
      if (razorpayStatus.publicKeyPresent) {
        toast({
          title: 'Razorpay Configuration Detected',
          description: 'Razorpay public key is present. Test a payment on the pricing page to verify full setup.',
        });
      } else {
        toast({
          title: 'Razorpay Not Configured',
          description: 'Please add Razorpay API keys to Replit Secrets',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not verify Razorpay configuration',
        variant: 'destructive',
      });
    } finally {
      setTestingRazorpay(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway Configuration</CardTitle>
          <CardDescription>Loading payment gateway status...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Payment Gateway Configuration
              </CardTitle>
              <CardDescription>Platform-wide payment gateway setup for Stripe and Razorpay</CardDescription>
            </div>
            <Button onClick={checkPaymentGatewayStatus} variant="outline" size="sm">
              <Loader2 className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stripe Status */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className={`p-3 rounded-full ${stripeStatus.configured ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <DollarSign className={`h-6 w-6 ${stripeStatus.configured ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Stripe</h3>
                  {stripeStatus.configured ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">International payments (USD, EUR, GBP, etc.)</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={testStripeConnection} 
                    size="sm" 
                    variant="outline"
                    disabled={testingStripe || !stripeStatus.configured}
                  >
                    {testingStripe ? (
                      <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Testing...</>
                    ) : (
                      <><CreditCard className="mr-1 h-3 w-3" /> Test Connection</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Razorpay Status */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className={`p-3 rounded-full ${razorpayStatus.configured ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <IndianRupee className={`h-6 w-6 ${razorpayStatus.configured ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Razorpay</h3>
                  {razorpayStatus.configured ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">India payments (INR)</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={testRazorpayConnection} 
                    size="sm" 
                    variant="outline"
                    disabled={testingRazorpay || !razorpayStatus.configured}
                  >
                    {testingRazorpay ? (
                      <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Testing...</>
                    ) : (
                      <><CreditCard className="mr-1 h-3 w-3" /> Test Connection</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {(!stripeStatus.configured || !razorpayStatus.configured) && (
            <Alert className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Setup Required:</strong> Payment gateways are not fully configured. 
                Add API keys to <strong>Replit Secrets</strong> (🔒 icon in left sidebar) to enable payments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stripe">
            <DollarSign className="mr-2 h-4 w-4" />
            Stripe Setup
          </TabsTrigger>
          <TabsTrigger value="razorpay">
            <IndianRupee className="mr-2 h-4 w-4" />
            Razorpay Setup
          </TabsTrigger>
        </TabsList>

        {/* Stripe Configuration */}
        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
              <CardDescription>Setup Stripe for international payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Required API Keys (Add to Replit Secrets)
                </h4>
                <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground">STRIPE_SECRET_KEY=</span>
                    <span className="text-primary">sk_test_... (or sk_live_...)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NEXT_PUBLIC_STRIPE_PUBLIC_KEY=</span>
                    <span className="text-primary">pk_test_... (or pk_live_...)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">STRIPE_WEBHOOK_SECRET=</span>
                    <span className="text-primary">whsec_...</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Webhook URL</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stripeWebhookUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(stripeWebhookUrl, 'Stripe Webhook URL')}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add this URL to your Stripe Dashboard → Webhooks
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Webhook Events to Enable</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    <li>checkout.session.completed</li>
                    <li>invoice.paid</li>
                    <li>invoice.payment_failed</li>
                    <li>customer.subscription.deleted</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quick Links</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Create Stripe Account
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Get API Keys
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Setup Webhooks
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Razorpay Configuration */}
        <TabsContent value="razorpay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Razorpay Configuration</CardTitle>
              <CardDescription>Setup Razorpay for Indian payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Required API Keys (Add to Replit Secrets)
                </h4>
                <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground">RAZORPAY_KEY_ID=</span>
                    <span className="text-primary">rzp_test_... (or rzp_live_...)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RAZORPAY_KEY_SECRET=</span>
                    <span className="text-primary">your_secret_key</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NEXT_PUBLIC_RAZORPAY_KEY_ID=</span>
                    <span className="text-primary">rzp_test_... (same as above)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RAZORPAY_WEBHOOK_SECRET=</span>
                    <span className="text-primary">your_webhook_secret</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Webhook URL</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={razorpayWebhookUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(razorpayWebhookUrl, 'Razorpay Webhook URL')}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add this URL to your Razorpay Dashboard → Webhooks
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Webhook Events to Enable</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    <li>payment.captured</li>
                    <li>payment.failed</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quick Links</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.razorpay.com/signup" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Create Razorpay Account
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Get API Keys
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.razorpay.com/app/webhooks" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Setup Webhooks
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Payments</CardTitle>
          <CardDescription>Test payment flows before going live</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Stripe Test Cards</h4>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Card Number</th>
                    <th className="text-left py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 font-mono">4242 4242 4242 4242</td>
                    <td className="py-2">✅ Success</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono">4000 0000 0000 0002</td>
                    <td className="py-2">❌ Decline</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono">4000 0025 0000 3155</td>
                    <td className="py-2">🔐 3D Secure</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Use any future expiry date and any 3-digit CVV
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Razorpay Test Cards</h4>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Card Number</th>
                    <th className="text-left py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 font-mono">5267 3181 8797 5449</td>
                    <td className="py-2">✅ Success</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono">4111 1111 1111 1111</td>
                    <td className="py-2">✅ Success</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono">Any 16 digits</td>
                    <td className="py-2">✅ Success (test mode)</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Use OTP: 123456 for test transactions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
