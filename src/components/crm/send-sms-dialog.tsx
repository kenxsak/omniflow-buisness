
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
import { sendTwilioSms, type SendTwilioSmsInput } from '@/ai/flows/send-twilio-sms-flow';
import { generateTrackedSmsContentAction } from '@/app/actions/tracked-ai-content-actions';
import { Loader2, MessageSquare, Wand2, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { useAuth } from '@/hooks/use-auth';
import TemplateBrowser from '@/components/templates/template-browser';
import { showAITaskCompleteToast } from '@/lib/ai-toast-helpers';

interface SendSmsDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendSmsDialog({ lead, isOpen, onOpenChange }: SendSmsDialogProps) {
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const { toast } = useToast();
  const { apiKeys, isLoading: isLoadingKeys, companyName } = useCompanyApiKeys();
  const { appUser } = useAuth();

  const twilioFromPhoneNumber = apiKeys?.twilio?.phoneNumber || '';
  const twilioAccountSid = apiKeys?.twilio?.accountSid || '';
  const twilioAuthToken = apiKeys?.twilio?.authToken || '';

  useEffect(() => {
    if (lead) {
      setMessageBody(`Hi ${lead.name.split(' ')[0] || 'there'}, regarding your recent inquiry... `);
    } else {
      setMessageBody('');
    }
  }, [lead]);

  const handleGenerateContent = async () => {
    if (!lead || !appUser) return;
    setIsGenerating(true);
    try {
        const result = await generateTrackedSmsContentAction(appUser.companyId, appUser.uid, {
            recipientName: lead.name,
            messageContext: "Follow up with a contact",
            desiredOutcome: "Encourage a reply or a call back",
            businessName: companyName || "Your Company"
        });
        if (result.success && result.data) {
            setMessageBody(result.data.suggestedSmsBody);
            showAITaskCompleteToast(toast, "SMS drafted", result.quotaInfo);
        } else {
            throw new Error(result.error || 'Failed to generate content');
        }
    } catch (e: any) {
        toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleApplyTemplate = (subject: string | undefined, content: string) => {
    setMessageBody(content);
    setIsTemplateBrowserOpen(false);
    toast({
      title: 'Template Applied!',
      description: 'The SMS template has been filled in.',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lead || !lead.phone) {
      toast({ title: 'Error', description: 'Contact phone number is missing.', variant: 'destructive' });
      return;
    }
     if (!twilioAccountSid || !twilioAuthToken || !twilioFromPhoneNumber) {
        toast({ title: 'Twilio Not Configured', description: 'Please set your Twilio Account SID, Auth Token, and From Phone Number in Settings.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);

    const smsInput: SendTwilioSmsInput = {
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      toPhoneNumber: lead.phone,
      messageBody: messageBody,
      fromPhoneNumber: twilioFromPhoneNumber,
    };

    try {
      const result = await sendTwilioSms(smsInput);
      if (result.success) {
        toast({ title: 'SMS Sent', description: `SMS to ${lead.name} queued. SID: ${result.sid || 'N/A'}` });
        onOpenChange(false);
        setMessageBody('');
      } else {
        toast({ title: 'SMS Send Failed', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send SMS.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS to {lead.name}</DialogTitle>
          <DialogDescription>
            Compose and send an SMS via Twilio using your credentials from Settings.
          </DialogDescription>
        </DialogHeader>
        {(!twilioAccountSid || !twilioAuthToken || !twilioFromPhoneNumber) && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Twilio Not Configured</AlertTitle>
                <AlertDescription>
                    Please set your Twilio Account SID, Auth Token, and a "From" Phone Number in the <Link href="/settings?tab=integrations" className="underline font-semibold">Settings</Link> page to send SMS.
                </AlertDescription>
            </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="sms-dialog-to">To Phone Number</Label>
            <Input id="sms-dialog-to" value={lead.phone || ''} readOnly disabled />
          </div>
          <div>
            <Label htmlFor="sms-dialog-from">From Twilio Number</Label>
            <Input 
              id="sms-dialog-from" 
              value={twilioFromPhoneNumber} 
              readOnly 
              disabled
              placeholder="Configure in Settings -> API Keys -> Twilio"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor="sms-body">Message</Label>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTemplateBrowserOpen(true)}
                    >
                        <FileText className="mr-2 h-4 w-4"/>
                        Templates
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateContent} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                        Draft with AI
                    </Button>
                </div>
            </div>
            <Textarea
              id="sms-body"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
              maxLength={160} 
              required
              className="min-h-[100px]"
              placeholder="Type your SMS message here..."
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{messageBody.length}/160 characters</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isLoadingKeys || !lead.phone || !messageBody || !twilioAccountSid || !twilioAuthToken || !twilioFromPhoneNumber}>
              {(isLoading || isLoadingKeys) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <MessageSquare className="mr-2 h-4 w-4" /> Send SMS
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={isTemplateBrowserOpen} onOpenChange={setIsTemplateBrowserOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SMS Templates</DialogTitle>
            <DialogDescription>
              Choose a pre-built SMS template for {lead?.name}
            </DialogDescription>
          </DialogHeader>
          <TemplateBrowser
            filterType="sms"
            onApply={handleApplyTemplate}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
