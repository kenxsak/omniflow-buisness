"use client";

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Send, CheckCircle, Loader2, Mail, Info } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendEmailAction, getEmailProviderConfigAction } from '@/app/actions/email-actions';
import { sendTransactionalEmail as sendSenderEmail } from '@/lib/sender-client';

type EmailProvider = 'brevo' | 'sender';

export default function TestEmailSendingPage() {
  const { appUser, isSuperAdmin, isAdmin, getIdToken } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>('brevo');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('Test Email from OmniFlow');
  const [htmlContent, setHtmlContent] = useState('<h1>Test Email</h1><p>This is a test email sent from OmniFlow CRM.</p>');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [senderApiKey, setSenderApiKey] = useState('');
  const [hasBrevo, setHasBrevo] = useState(false);
  const [hasSender, setHasSender] = useState(false);

  useEffect(() => {
    const loadApiKeys = async () => {
      if (!appUser?.companyId) return;
      
      try {
        const idToken = await getIdToken();
        if (!idToken) return;
        
        const result = await getEmailProviderConfigAction(idToken);
        if (result.success && result.config) {
          const { config } = result;
          if (config.brevo?.apiKey) {
            setBrevoApiKey(config.brevo.apiKey);
            setHasBrevo(true);
            if (config.brevo.defaultSenderEmail) setSenderEmail(config.brevo.defaultSenderEmail);
            if (config.brevo.defaultSenderName) setSenderName(config.brevo.defaultSenderName);
          }
          if (config.sender?.apiKey) {
            setSenderApiKey(config.sender.apiKey);
            setHasSender(true);
            if (config.sender.defaultSenderEmail) setSenderEmail(config.sender.defaultSenderEmail);
            if (config.sender.defaultSenderName) setSenderName(config.sender.defaultSenderName);
          }
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };
    
    loadApiKeys();
  }, [appUser?.companyId, getIdToken]);

  const handleSendTestEmail = async () => {
    if (!recipientEmail) {
      toast({ title: 'Error', description: 'Please enter a recipient email', variant: 'destructive' });
      return;
    }
    if (!senderEmail) {
      toast({ title: 'Error', description: 'Please enter a sender email', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let response;
      
      if (provider === 'brevo') {
        if (!brevoApiKey) {
          toast({ title: 'Error', description: 'Brevo API key not configured', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        
        response = await sendEmailAction({
          apiKey: brevoApiKey,
          senderEmail,
          senderName: senderName || 'OmniFlow',
          recipientEmail,
          recipientName: recipientName || recipientEmail,
          subject,
          htmlContent,
        });
      } else {
        if (!senderApiKey) {
          toast({ title: 'Error', description: 'Sender.net API key not configured', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        
        response = await sendSenderEmail(
          senderApiKey,
          senderEmail,
          senderName || 'OmniFlow',
          recipientEmail,
          recipientName || recipientEmail,
          subject,
          htmlContent
        );
      }

      if (response.success) {
        setResult({ success: true, message: `Email sent successfully via ${provider === 'brevo' ? 'Brevo' : 'Sender.net'}!` });
        toast({ title: 'Success', description: 'Test email sent successfully!' });
      } else {
        setResult({ success: false, message: response.error || 'Failed to send email' });
        toast({ title: 'Error', description: response.error || 'Failed to send email', variant: 'destructive' });
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'An error occurred' });
      toast({ title: 'Error', description: error.message || 'Failed to send email', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only administrators can access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle 
        title="Test Email Sending" 
        description="Send a test email using Brevo or Sender.net to verify your configuration" 
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Email Provider Testing</AlertTitle>
        <AlertDescription>
          Use this page to test your email provider configuration by sending a test email.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Test Email
            </CardTitle>
            <CardDescription>
              Configure and send a test email to verify your email provider setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as EmailProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brevo" disabled={!hasBrevo}>
                    Brevo {!hasBrevo && '(Not Configured)'}
                  </SelectItem>
                  <SelectItem value="sender" disabled={!hasSender}>
                    Sender.net {!hasSender && '(Not Configured)'}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-1">
                {provider === 'brevo' && hasBrevo && <Badge variant="outline" className="text-green-600">Brevo Configured</Badge>}
                {provider === 'sender' && hasSender && <Badge variant="outline" className="text-green-600">Sender.net Configured</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderEmail">Sender Email *</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
              <div>
                <Label htmlFor="senderName">Sender Name</Label>
                <Input
                  id="senderName"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your Company"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipientEmail">Recipient Email *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Test Email Subject"
              />
            </div>

            <div>
              <Label htmlFor="htmlContent">HTML Content</Label>
              <Textarea
                id="htmlContent"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Hello</h1><p>This is a test.</p>"
                rows={5}
              />
            </div>

            <Button
              onClick={handleSendTestEmail}
              disabled={isLoading || !recipientEmail || !senderEmail}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Status</CardTitle>
            <CardDescription>Your configured email providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span>Brevo</span>
              </div>
              {hasBrevo ? (
                <Badge className="bg-green-100 text-green-800">Configured</Badge>
              ) : (
                <Badge variant="secondary">Not Set Up</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span>Sender.net</span>
              </div>
              {hasSender ? (
                <Badge className="bg-green-100 text-green-800">Configured</Badge>
              ) : (
                <Badge variant="secondary">Not Set Up</Badge>
              )}
            </div>

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
