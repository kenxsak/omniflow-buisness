
"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
import { generateTrackedEmailContentAction } from '@/app/actions/tracked-ai-content-actions';
import { sendEmailAction } from '@/app/actions/email-actions';
import { Loader2, Send, AlertTriangle, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { showAITaskCompleteToast } from '@/lib/ai-toast-helpers';

export default function SendEmailDialog({ lead, isOpen, onOpenChange, initialEmailPurpose = 'general' }: { lead: Lead | null, isOpen: boolean, onOpenChange: (open: boolean) => void, initialEmailPurpose?: 'welcome' | 'general' }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  
  const getSenderDetails = useCallback(() => {
    const defaultSenderEmail = company?.apiKeys?.brevo?.senderEmail || appUser?.email || "notifications@example.com";
    const defaultSenderName = appUser?.name || "Your Name";
    const profileBusinessName = company?.name || 'Your Company';

    setSenderEmail(defaultSenderEmail);
    setSenderName(defaultSenderName);

    return { defaultSenderName, defaultSenderEmail, profileBusinessName };
  }, [appUser, company]);

  useEffect(() => {
    if (isOpen && company?.apiKeys?.brevo) {
        const key = company.apiKeys.brevo.apiKey;
        setBrevoApiKey(key || '');
    }

    const { defaultSenderName, profileBusinessName } = getSenderDetails();

    if (isOpen && lead) {
      if (initialEmailPurpose === 'welcome') {
        setSubject(`Welcome to ${profileBusinessName}, ${lead.name.split(' ')[0] || 'there'}!`);
        setBody(
`Hi {{ contact.FIRSTNAME }},

Thanks for your interest in ${profileBusinessName}! We're excited to connect with you.

[Consider adding a brief welcome message, what they can expect, or a link to a valuable resource here.]

Best regards,
${defaultSenderName}
${profileBusinessName}`
        );
      } else {
        setSubject(`Following up with ${lead.name}`);
        setBody(
`Hi {{ contact.FIRSTNAME }},

Hope you're doing well.

[Your follow-up message content here]

Best regards,
${defaultSenderName}`
        );
      }
    } else if (!isOpen) {
      setSubject('');
      setBody('');
    }
  }, [lead, isOpen, initialEmailPurpose, company, getSenderDetails]);

  const handleGenerateContent = async () => {
    if (!lead || !appUser) return;
    setIsGenerating(true);
    try {
        const result = await generateTrackedEmailContentAction(appUser.companyId, appUser.uid, {
            campaignGoal: subject,
            targetAudience: `A lead named ${lead.name} interested in our services.`,
            keyPoints: body,
            tone: 'Friendly',
        });
        if (result.success && result.data) {
            setBody(result.data.htmlContent.replace(/<br\s*\/?>/gi, '\n')); // Convert <br> to newlines for textarea
            showAITaskCompleteToast(toast, "Email drafted", result.quotaInfo);
        } else {
            throw new Error(result.error || 'Failed to generate content');
        }
    } catch (e: any) {
        toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lead || !brevoApiKey || !appUser) return;
    setIsLoading(true);

    try {
      const result = await sendEmailAction({
        apiKey: brevoApiKey,
        senderEmail: senderEmail,
        senderName: senderName,
        recipientEmail: lead.email,
        recipientName: lead.name,
        subject: subject,
        htmlContent: body.replace(/\n/g, '<br>'),
      });

      if (result.success) {
        toast({ title: 'Email Sent (via Brevo)', description: `Email to ${lead.name} queued for sending. Message ID: ${result.messageId}` });
        onOpenChange(false);
      } else {
        toast({ title: 'Email Send Failed', description: result.error || 'An unknown error occurred with Brevo.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send email.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email to {lead.name}</DialogTitle>
          <DialogDescription>Compose and send an email via Brevo using your company's API key from Settings.</DialogDescription>
        </DialogHeader>
        {!brevoApiKey && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Brevo API Key Not Configured</AlertTitle>
                <AlertDescription>
                   Please add your Brevo API Key in the <Link href="/settings?tab=integrations" className="underline font-semibold">Settings</Link> page to send emails.
                </AlertDescription>
            </Alert>
        )}
        {brevoApiKey && (
            <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important: Verify Your Sender Email</AlertTitle>
                <AlertDescription>
                   Make sure the "From Email" address below is verified in your Brevo account (Settings → Senders & IP). Unverified sender emails will cause email sending to fail.
                </AlertDescription>
            </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="email-dialog-sender-name">From Name</Label>
            <Input id="email-dialog-sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </div>
           <div>
            <Label htmlFor="email-dialog-sender-email">From Email</Label>
            <Input id="email-dialog-sender-email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Ensure this sender email is validated in your Brevo account.</p>
          </div>
          <div>
            <Label htmlFor="email-dialog-subject">Subject</Label>
            <Input id="email-dialog-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="email-dialog-body">Body</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateContent} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                  Draft with AI
              </Button>
            </div>
            <Textarea id="email-dialog-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} required className="min-h-[200px]" />
             <p className="text-xs text-muted-foreground mt-1">Plain text will be converted to basic HTML. Use {`{{ contact.FIRSTNAME }}`} for personalization.</p>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !subject || !body || !brevoApiKey}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" /> Send Email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
