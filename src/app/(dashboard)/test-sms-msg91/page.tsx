'use client';

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { testMSG91SMSAction } from '@/app/actions/test-msg91-actions';

interface TestResponse {
  success: boolean;
  requestId?: string;
  messageId?: string;
  smsCount?: number;
  apiResponse?: any;
  error?: string;
}

export default function TestMSG91SMSPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageType, setMessageType] = useState<'transactional' | 'promotional'>('transactional');
  const [message, setMessage] = useState('');
  const [dltTemplateId, setDltTemplateId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);

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

    if (messageType === 'promotional' && !dltTemplateId.trim()) {
      toast({
        title: 'Error',
        description: 'Template ID is required for promotional messages',
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

      const result = await testMSG91SMSAction({
        idToken,
        phoneNumber,
        message,
        messageType,
        dltTemplateId,
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
      <PageTitle title="Test MSG91 SMS" subtitle="Test transactional and promotional SMS templates" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send Test MSG91 SMS</CardTitle>
              <CardDescription>
                Test MSG91 transactional and promotional SMS routes before bulk campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Alert */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">MSG91 SMS Routes</AlertTitle>
                <AlertDescription className="text-blue-800">
                  Test both transactional SMS (OTP, confirmations) and promotional SMS (marketing offers) before
                  sending bulk campaigns.
                </AlertDescription>
              </Alert>

              {/* Message Type */}
              <div className="space-y-2">
                <Label htmlFor="messageType">Message Type *</Label>
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)} disabled={isSending}>
                  <SelectTrigger id="messageType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional (OTP, Confirmations)</SelectItem>
                    <SelectItem value="promotional">Promotional (Marketing, Offers)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {messageType === 'transactional'
                    ? 'Use for OTP, confirmations, and transactional messages'
                    : 'Use for promotional offers and marketing (requires DLT template)'}
                </p>
              </div>

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
                  placeholder="Enter your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSending}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  {message.length} characters
                </p>
              </div>

              {/* DLT Template ID - Show only for promotional */}
              {messageType === 'promotional' && (
                <div className="space-y-2">
                  <Label htmlFor="templateId">DLT Template ID *</Label>
                  <Input
                    id="templateId"
                    placeholder="e.g., your-approved-template-id"
                    value={dltTemplateId}
                    onChange={(e) => setDltTemplateId(e.target.value)}
                    disabled={isSending}
                  />
                  <p className="text-sm text-gray-500">
                    Your approved DLT template ID from MSG91 dashboard (required for promotional SMS)
                  </p>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSendTest}
                disabled={
                  isSending ||
                  !phoneNumber ||
                  !message ||
                  (messageType === 'promotional' && !dltTemplateId)
                }
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
              <CardTitle className="text-base">MSG91 Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">✓ Provider</p>
                <Badge variant="outline" className="mt-1">MSG91</Badge>
                <p className="text-gray-600 text-xs mt-1">Reliable bulk SMS for India & Global</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">✓ Message Types</p>
                <div className="space-y-1 mt-1">
                  <Badge variant="outline" className="mr-1">Transactional</Badge>
                  <Badge variant="outline">Promotional</Badge>
                </div>
                <p className="text-gray-600 text-xs mt-1">Both routes supported</p>
              </div>

              <div className="pt-4 border-t space-y-3">
                <p className="font-semibold text-gray-900">Route Details</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Transactional</p>
                    <p className="text-xs text-gray-600">
                      Route: 4 • No template required • For OTP, confirmations, alerts
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Promotional</p>
                    <p className="text-xs text-gray-600">
                      Route: 1 • Requires DLT template ID • For marketing campaigns
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="font-semibold text-gray-900 mb-2">Next Steps:</p>
                <ol className="space-y-1 text-gray-600 text-xs">
                  <li>1️⃣ Test transactional/promotional SMS</li>
                  <li>2️⃣ Verify delivery on your phone</li>
                  <li>3️⃣ Create bulk campaigns</li>
                  <li>4️⃣ Monitor delivery status</li>
                </ol>
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
                    Your message has been sent via MSG91. Check your phone for delivery confirmation.
                  </AlertDescription>
                </Alert>

                {testResponse.requestId && (
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <p className="text-gray-600 mb-1">Request ID:</p>
                    <p className="text-gray-900 break-all">{testResponse.requestId}</p>
                  </div>
                )}

                {testResponse.messageId && (
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <p className="text-gray-600 mb-1">Message ID:</p>
                    <p className="text-gray-900 break-all">{testResponse.messageId}</p>
                  </div>
                )}

                {testResponse.smsCount && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">SMS Count</p>
                    <p className="text-lg font-semibold">{testResponse.smsCount}</p>
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
