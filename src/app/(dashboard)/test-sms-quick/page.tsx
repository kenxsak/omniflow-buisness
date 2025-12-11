'use client';

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { testQuickSMSFast2SMSAction } from '@/app/actions/test-quick-sms-actions';

interface TestResponse {
  success: boolean;
  requestId?: string;
  message?: string[];
  smsCount?: number;
  estimatedCost?: number;
  apiResponse?: any;
  error?: string;
}

export default function TestQuickSMSPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);

  const calculateSMSCount = (text: string) => {
    if (!text) return 0;
    // 160 chars = 1 SMS
    if (text.length <= 160) return 1;
    // 153 chars per SMS for concatenated messages
    return Math.ceil(text.length / 153);
  };

  const smsCount = calculateSMSCount(message);

  const handleSendTest = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const result = await testQuickSMSFast2SMSAction({
        idToken,
        phoneNumber,
        message,
      });

      setTestResponse(result);

      if (result.success) {
        toast({
          title: 'Success!',
          description: `SMS sent successfully. Request ID: ${result.requestId}`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send SMS',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setTestResponse({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Test Fast2SMS Quick SMS" subtitle="Test custom SMS message before bulk campaigns" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Quick SMS</CardTitle>
              <CardDescription>
                Test Fast2SMS Quick SMS route with custom message (no template required)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Alert */}
              <Alert className="border-green-200 bg-green-50">
                <Zap className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">Quick SMS - Custom Messages</AlertTitle>
                <AlertDescription className="text-green-800">
                  Quick SMS route allows you to send any custom text message without needing template approval.
                  Perfect for promotional offers, notifications, and personalized messages to your customers.
                </AlertDescription>
              </Alert>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g., 919876543210 or 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSending}
                  type="tel"
                />
                <p className="text-sm text-gray-500">
                  Enter 10-digit Indian mobile number (with or without +91)
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSending}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {message.length} characters
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      SMS Count: <Badge variant="outline">{smsCount}</Badge>
                    </p>
                    <p className="text-xs text-gray-500">
                      160 chars = 1 SMS, 153 chars for additional
                    </p>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendTest}
                disabled={isSending || !phoneNumber || !message}
                className="w-full"
                size="lg"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reference */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick SMS Route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">✓ Route</p>
                <Badge variant="outline" className="mt-1">Quick SMS</Badge>
                <p className="text-gray-600 text-xs mt-1">Custom message, no template</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">✓ Provider</p>
                <Badge variant="outline" className="mt-1">Fast2SMS</Badge>
                <p className="text-gray-600 text-xs mt-1">Lightning-fast delivery</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">✓ Cost</p>
                <Badge variant="outline" className="mt-1">Higher Cost</Badge>
                <p className="text-gray-600 text-xs mt-1">For exact pricing, check Fast2SMS dashboard</p>
              </div>

              <div className="pt-4 border-t space-y-3">
                <p className="font-semibold text-gray-900">Message Guidelines</p>
                <ul className="space-y-2 text-gray-600 text-xs">
                  <li>• <span className="font-semibold">Max 160 chars</span> = 1 SMS</li>
                  <li>• <span className="font-semibold">Keep concise</span> = Better delivery</li>
                  <li>• <span className="font-semibold">Any content</span> = No approval needed</li>
                  <li>• <span className="font-semibold">Immediate send</span> = Real-time</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="font-semibold text-gray-900 mb-2">Use Cases:</p>
                <ul className="space-y-1 text-gray-600 text-xs">
                  <li>✅ Promotional offers</li>
                  <li>✅ Flash sales alerts</li>
                  <li>✅ Reminders & updates</li>
                  <li>✅ Customer notifications</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Response */}
      {testResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResponse.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Test Successful</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">Test Failed</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResponse.success ? (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900">SMS Sent Successfully</AlertTitle>
                  <AlertDescription className="text-green-800">
                    Your message has been sent via Fast2SMS Quick SMS route. Check your phone for delivery.
                  </AlertDescription>
                </Alert>

                {testResponse.requestId && (
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <p className="text-gray-600 mb-1">Request ID:</p>
                    <p className="text-gray-900 break-all">{testResponse.requestId}</p>
                  </div>
                )}

                {testResponse.smsCount && testResponse.estimatedCost && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">SMS Count</p>
                      <p className="text-lg font-semibold">{testResponse.smsCount}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">Cost (Estimate)</p>
                      <p className="text-lg font-semibold">₹{testResponse.estimatedCost.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Sending SMS</AlertTitle>
                  <AlertDescription>{testResponse.error}</AlertDescription>
                </Alert>
              </>
            )}

            {testResponse.apiResponse && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer font-semibold text-sm">
                  Full API Response (Debug Info)
                </summary>
                <pre className="mt-3 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(testResponse.apiResponse, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
