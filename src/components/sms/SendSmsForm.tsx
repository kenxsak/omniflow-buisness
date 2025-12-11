
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendSingleSmsQuickAction } from '@/app/actions/send-single-sms-quick-action';
import { generateTrackedSmsContentAction } from '@/app/actions/tracked-ai-content-actions';
import type { GenerateSmsContentInput } from '@/ai/flows/generate-sms-content-flow';
import { Loader2, Send, Wand2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import TemplateBrowser from '@/components/templates/template-browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getFriendlyLabel } from '@/lib/friendly-labels';
import { getFriendlyError, getFriendlySuccess } from '@/lib/friendly-messages';

export default function SendSmsForm() {
  const [toPhoneNumber, setToPhoneNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftingWithAi, setIsDraftingWithAi] = useState(false);
  
  const [fast2smsConfigured, setFast2smsConfigured] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);

  const { toast } = useToast();
  const { appUser, company } = useAuth();

  const [aiRecipientName, setAiRecipientName] = useState('');
  const [aiMessageContext, setAiMessageContext] = useState('');
  const [aiDesiredOutcome, setAiDesiredOutcome] = useState('');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (company) {
        const fast2smsKeys = company.apiKeys?.fast2sms;
        if (fast2smsKeys?.apiKey) {
            setFast2smsConfigured(true);
        }
        setBusinessName(company.name || 'Your Company');
    }
  }, [company]);

  const handleAiDraftSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!aiMessageContext || !aiDesiredOutcome) {
        toast({ title: 'Missing Info', description: "Please tell us what the message is about and what you'd like to happen.", variant: "destructive" });
        return;
    }
    if (!appUser) {
        toast({ title: 'Login Required', description: 'Please log in to use AI features.', variant: "destructive" });
        return;
    }
    setIsDraftingWithAi(true);
    try {
        const result = await generateTrackedSmsContentAction(appUser.companyId, appUser.uid, {
            recipientName: aiRecipientName,
            messageContext: aiMessageContext,
            desiredOutcome: aiDesiredOutcome,
            businessName: businessName,
        });
        if (result.success && result.data) {
            setMessageBody(result.data.suggestedSmsBody);
            // Show clear AI credit usage toast
            toast({ 
                title: `✨ AI Message Generated (${result.quotaInfo?.consumed || 1} credit used)`, 
                description: `Message ready! Credits remaining: ${result.quotaInfo?.remaining || 'unlimited'}`,
                variant: "default"
            });
        } else {
            throw new Error(result.error || 'Failed to generate SMS draft.');
        }
    } catch (error: any) {
        toast({ title: 'AI Generation Failed', description: error.message || "We had trouble creating your message. Please try again.", variant: "destructive"});
    } finally {
        setIsDraftingWithAi(false);
    }
  };

  const handleApplyTemplate = (subject: string | undefined, content: string) => {
    setMessageBody(content);
    setIsTemplateBrowserOpen(false);
    toast({
      title: '✅ Template Applied',
      description: 'Ready to send!',
    });
  };

  const handleSendSmsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!toPhoneNumber || !messageBody) {
      toast({ title: 'Missing Info', description: 'Please add a phone number and message before sending.', variant: 'destructive' });
      return;
    }
    if (!fast2smsConfigured || !appUser?.idToken) {
        toast({ title: 'Not Configured', description: 'Fast2SMS not configured. Please add your Fast2SMS API key in Settings.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);

    try {
      const result = await sendSingleSmsQuickAction({
        idToken: appUser.idToken,
        toPhoneNumber: toPhoneNumber,
        message: messageBody,
      });
      if (result.success) {
        toast({ title: '✅ SMS Sent', description: `Message to ${toPhoneNumber} sent via ${result.platform}!` });
        setToPhoneNumber('');
        setMessageBody('');
      } else {
        toast({ title: 'Send Failed', description: result.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <Alert className="bg-orange-50 border-orange-300">
            <AlertTitle className="text-orange-900">⚠️ Quick SMS - Premium Speed, Higher Cost</AlertTitle>
            <AlertDescription className="text-orange-800">
                <strong>For India:</strong> Fast2SMS Quick SMS sends ANY message immediately - perfect for testing, AI-generated messages, and free-form content. No template approval needed.
                <br/>
                <strong>⚠️ WARNING:</strong> Quick SMS is <strong>significantly more expensive</strong> than DLT template-based SMS. For exact pricing, check your Fast2SMS dashboard or account.
                <br/>
                <strong>💰 Cost-effective alternative:</strong> Use <Link href="/campaigns/messages" className="underline font-semibold">Campaigns → Bulk SMS Marketing</Link> with approved DLT templates for better rates.
            </AlertDescription>
        </Alert>

        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">📋 Ready-Made Templates</TabsTrigger>
            <TabsTrigger value="ai">✨ AI Draft</TabsTrigger>
            <TabsTrigger value="manual">✍️ Manual Message</TabsTrigger>
          </TabsList>

          {/* Ready-Made Templates Tab */}
          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />Templates Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTemplateBrowserOpen(true)}
                  className="w-full"
                >
                  Browse Templates
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Draft Tab */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="mr-2 h-5 w-5 text-primary"/>AI SMS Drafter
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleAiDraftSubmit}>
                <CardContent className="space-y-3">
                    <div>
                        <Label htmlFor="ai-recipient-name">Recipient Name (Optional)</Label>
                        <Input id="ai-recipient-name" value={aiRecipientName} onChange={e => setAiRecipientName(e.target.value)} placeholder="e.g., Jane Doe"/>
                    </div>
                    <div>
                        <Label htmlFor="ai-message-context">Message Context/Purpose *</Label>
                        <Input id="ai-message-context" value={aiMessageContext} onChange={e => setAiMessageContext(e.target.value)} placeholder="e.g., Appointment reminder, Special offer" required/>
                    </div>
                    <div>
                        <Label htmlFor="ai-desired-outcome">Desired Outcome *</Label>
                        <Input id="ai-desired-outcome" value={aiDesiredOutcome} onChange={e => setAiDesiredOutcome(e.target.value)} placeholder="e.g., Confirm appointment, Visit link" required/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" variant="outline" disabled={isDraftingWithAi || !aiMessageContext || !aiDesiredOutcome}>
                        {isDraftingWithAi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Draft with AI (1 credit)
                    </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Manual Message Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Type Your Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={messageBody} 
                  onChange={(e) => setMessageBody(e.target.value)} 
                  placeholder="Type your SMS message here..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{messageBody.length}/160 characters</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {!fast2smsConfigured && (
            <Alert variant="destructive">
                <AlertTitle>Fast2SMS Not Configured</AlertTitle>
                <AlertDescription>
                    Add your Fast2SMS API key in <Link href="/settings?tab=integrations" className="underline font-semibold">Settings → API Integrations</Link>.
                </AlertDescription>
            </Alert>
        )}
        
        {fast2smsConfigured && (
            <Alert className="bg-green-50 border-green-200">
                <AlertTitle className="text-green-900">✅ Fast2SMS Ready</AlertTitle>
                <AlertDescription className="text-green-800">
                    Messages will be sent via <strong>Fast2SMS Quick SMS</strong> - instant delivery with any message content.
                </AlertDescription>
            </Alert>
        )}

        {messageBody && (
          <form onSubmit={handleSendSmsSubmit} className="space-y-4 pt-6 border-t">
              <h3 className="text-md font-semibold">Send Your SMS:</h3>
              <div>
                  <Label htmlFor="sms-to">{getFriendlyLabel('phone_number').label} *</Label>
                  <Input 
                  id="sms-to" 
                  value={toPhoneNumber} 
                  onChange={(e) => setToPhoneNumber(e.target.value)} 
                  placeholder={getFriendlyLabel('phone_number').placeholder}
                  required 
                  type="tel"
                  />
              </div>
              <div className="bg-gray-100 p-3 rounded">
                <p className="text-sm"><strong>Message Preview:</strong></p>
                <p className="text-sm text-gray-700 mt-2">{messageBody}</p>
              </div>
              <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading || !toPhoneNumber || !messageBody || !fast2smsConfigured}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" /> Send via Fast2SMS Quick SMS
                  </Button>
              </div>
          </form>
        )}

        <Dialog open={isTemplateBrowserOpen} onOpenChange={setIsTemplateBrowserOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select an SMS Template</DialogTitle>
                </DialogHeader>
                <TemplateBrowser filterType="sms" onApply={handleApplyTemplate} />
            </DialogContent>
        </Dialog>
    </div>
  );
}
