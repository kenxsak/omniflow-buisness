'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Send, Loader2, ArrowLeft, Eye, Code, FileText, Copy, Check, 
  AlertTriangle, Info, Mail, Users, Save, Sparkles, BookmarkPlus
} from 'lucide-react';
import Link from 'next/link';
import PageTitle from '@/components/ui/page-title';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction, createSenderCampaignAction, sendSenderCampaignAction } from '@/app/actions/sender-actions';
import { createAndSendBrevoCampaignAction } from '@/actions/brevo-campaigns';
import { createSavedEmailTemplateAction } from '@/app/actions/saved-email-template-actions';
import { addStoredEmailCampaign } from '@/lib/mock-data';

interface BrevoList {
  id: number;
  name: string;
  totalSubscribers: number;
}

interface SenderList {
  id: string;
  name: string;
  total: number;
}

type DeliveryProvider = 'brevo' | 'sender';

const MARKETING_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'onboarding',
    subject: 'Welcome to [Your Company]! Get Started Here',
    body: `<h1>Welcome, {{ contact.FIRSTNAME }}!</h1>

<p>We're thrilled to have you join our community. Here's what you can expect:</p>

<ul>
  <li>Exclusive updates and offers</li>
  <li>Helpful tips and resources</li>
  <li>Priority access to new features</li>
</ul>

<p>If you have any questions, just reply to this email - we're always happy to help!</p>

<p>Best regards,<br>[Your Company Name]</p>`
  },
  {
    id: 'promo',
    name: 'Promotional Offer',
    category: 'marketing',
    subject: 'Limited Time: [X]% OFF Everything!',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>For a limited time only, enjoy <strong>[X]% OFF</strong> on all our products!</p>

<p>Use code: <strong>SAVE[X]</strong> at checkout</p>

<p><a href="[YOUR_LINK]" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Shop Now</a></p>

<p>This offer expires on [DATE]. Don't miss out!</p>

<p>Happy shopping,<br>[Your Company Name]</p>`
  },
  {
    id: 'newsletter',
    name: 'Newsletter Update',
    category: 'engagement',
    subject: '[Month] Newsletter: What\'s New',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>Here's what's happening this month:</p>

<h3>Featured Story</h3>
<p>[Brief description of your main story or update]</p>

<h3>Quick Updates</h3>
<ul>
  <li>[Update 1]</li>
  <li>[Update 2]</li>
  <li>[Update 3]</li>
</ul>

<h3>Coming Soon</h3>
<p>[Preview of what's coming next]</p>

<p>Thanks for being part of our community!</p>

<p>Best,<br>[Your Company Name]</p>`
  },
  {
    id: 'followup',
    name: 'Follow-up Email',
    category: 'sales',
    subject: 'Quick Follow-up: [Topic]',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>I wanted to follow up on our recent conversation about [TOPIC].</p>

<p>I understand you were interested in [SPECIFIC INTEREST]. I'd love to help you with:</p>

<ul>
  <li>[Point 1]</li>
  <li>[Point 2]</li>
  <li>[Point 3]</li>
</ul>

<p>Would you be available for a quick call this week to discuss further?</p>

<p>Looking forward to hearing from you!</p>

<p>Best regards,<br>[Your Name]<br>[Your Company]</p>`
  },
  {
    id: 'event',
    name: 'Event Invitation',
    category: 'events',
    subject: 'You\'re Invited: [Event Name]',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>You're invited to an exclusive event!</p>

<h2>[Event Name]</h2>

<p><strong>Date:</strong> [DATE]<br>
<strong>Time:</strong> [TIME]<br>
<strong>Location:</strong> [LOCATION/ONLINE LINK]</p>

<p>What you'll learn:</p>
<ul>
  <li>[Topic 1]</li>
  <li>[Topic 2]</li>
  <li>[Topic 3]</li>
</ul>

<p><a href="[REGISTRATION_LINK]" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Register Now</a></p>

<p>Spots are limited - reserve yours today!</p>

<p>See you there,<br>[Your Company Name]</p>`
  },
  {
    id: 'feedback',
    name: 'Feedback Request',
    category: 'engagement',
    subject: 'We\'d Love Your Feedback!',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>Your opinion matters to us! We'd love to hear about your experience with [PRODUCT/SERVICE].</p>

<p>It only takes 2 minutes to share your thoughts:</p>

<p><a href="[SURVEY_LINK]" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Share Feedback</a></p>

<p>As a thank you, you'll receive [INCENTIVE] for completing the survey.</p>

<p>Thank you for helping us improve!</p>

<p>Best regards,<br>[Your Company Name]</p>`
  },
  {
    id: 'announcement',
    name: 'Product Announcement',
    category: 'marketing',
    subject: 'Introducing [Product Name] - Now Available!',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>We're excited to announce something special!</p>

<h2>Introducing [Product Name]</h2>

<p>[Brief description of what it is and why it matters]</p>

<h3>Key Features:</h3>
<ul>
  <li>[Feature 1]</li>
  <li>[Feature 2]</li>
  <li>[Feature 3]</li>
</ul>

<p><a href="[PRODUCT_LINK]" style="background-color: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Learn More</a></p>

<p>Be among the first to try it!</p>

<p>Best,<br>[Your Company Name]</p>`
  },
  {
    id: 'reminder',
    name: 'Appointment Reminder',
    category: 'transactional',
    subject: 'Reminder: Your Appointment on [Date]',
    body: `<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>This is a friendly reminder about your upcoming appointment:</p>

<p><strong>Date:</strong> [DATE]<br>
<strong>Time:</strong> [TIME]<br>
<strong>Location:</strong> [LOCATION]</p>

<p>Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.</p>

<p>Need to make changes? <a href="[RESCHEDULE_LINK]">Click here to reschedule</a></p>

<p>We look forward to seeing you!</p>

<p>Best regards,<br>[Your Company Name]</p>`
  }
];

export default function ComposeEmailPage() {
  const { appUser, company } = useAuth();
  const { toast } = useToast();
  const { apiKeys } = useCompanyApiKeys();
  
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState(`<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>Write your email content here...</p>

<p>Best regards,<br>${company?.name || '[Your Company Name]'}</p>`);
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider | null>(null);
  const [brevoLists, setBrevoLists] = useState<BrevoList[]>([]);
  const [senderLists, setSenderLists] = useState<SenderList[]>([]);
  const [selectedBrevoListId, setSelectedBrevoListId] = useState('');
  const [selectedSenderListId, setSelectedSenderListId] = useState('');
  
  const [isLoadingBrevoLists, setIsLoadingBrevoLists] = useState(false);
  const [isLoadingSenderLists, setIsLoadingSenderLists] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const hasBrevoConfigured = Boolean(apiKeys?.brevo?.apiKey);
  const hasSenderConfigured = Boolean(apiKeys?.sender?.apiKey);
  const hasAnyProvider = hasBrevoConfigured || hasSenderConfigured;

  const fetchBrevoLists = useCallback(async () => {
    if (!apiKeys?.brevo?.apiKey) return;
    
    setIsLoadingBrevoLists(true);
    try {
      const result = await fetchBrevoListsAction(apiKeys.brevo.apiKey);
      if (result.success && result.lists) {
        setBrevoLists(result.lists);
        if (result.lists.length > 0 && !selectedBrevoListId) {
          setSelectedBrevoListId(result.lists[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching Brevo lists:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load Brevo contact lists',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingBrevoLists(false);
    }
  }, [apiKeys?.brevo?.apiKey, selectedBrevoListId, toast]);

  const fetchSenderLists = useCallback(async () => {
    if (!apiKeys?.sender?.apiKey) return;
    
    setIsLoadingSenderLists(true);
    try {
      const result = await fetchSenderListsAction(apiKeys.sender.apiKey);
      if (result.success && result.lists) {
        setSenderLists(result.lists.map(l => ({
          id: l.id,
          name: l.title,
          total: l.total || 0
        })));
        if (result.lists.length > 0 && !selectedSenderListId) {
          setSelectedSenderListId(result.lists[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching Sender lists:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load Sender.net contact lists',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSenderLists(false);
    }
  }, [apiKeys?.sender?.apiKey, selectedSenderListId, toast]);

  useEffect(() => {
    if (deliveryProvider === 'brevo') {
      fetchBrevoLists();
    } else if (deliveryProvider === 'sender') {
      fetchSenderLists();
    }
  }, [deliveryProvider, fetchBrevoLists, fetchSenderLists]);

  const selectedBrevoList = brevoLists.find(l => l.id.toString() === selectedBrevoListId);
  const selectedSenderList = senderLists.find(l => l.id === selectedSenderListId);

  const handleUseTemplate = (template: typeof MARKETING_TEMPLATES[0]) => {
    setSubject(template.subject);
    setHtmlContent(template.body);
    setTemplateDialogOpen(false);
    toast({
      title: 'Template Applied',
      description: `"${template.name}" loaded. Customize the bracketed text with your details.`,
    });
  };

  const handleCopyTemplate = (template: typeof MARKETING_TEMPLATES[0]) => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body.replace(/<[^>]*>/g, '')}`);
    setCopied(template.id);
    toast({ title: 'Copied!', description: 'Template copied to clipboard' });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveAsTemplate = async () => {
    if (!appUser?.idToken || !subject || !htmlContent) return;
    
    if (!templateName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your template',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingTemplate(true);
    try {
      const result = await createSavedEmailTemplateAction({
        idToken: appUser.idToken,
        template: {
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          subject: subject,
          htmlContent: htmlContent,
          originalPrompt: 'Custom composed email',
        },
      });

      if (result.success) {
        toast({
          title: 'Template Saved!',
          description: 'You can reuse this email anytime from Saved Templates.',
        });
        setSaveTemplateDialogOpen(false);
        setTemplateName('');
        setTemplateDescription('');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSendEmail = async () => {
    if (!subject.trim()) {
      toast({
        title: 'Subject Required',
        description: 'Please enter an email subject line',
        variant: 'destructive',
      });
      return;
    }

    if (!htmlContent.trim() || htmlContent.length < 20) {
      toast({
        title: 'Content Required',
        description: 'Please write your email content (at least 20 characters)',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryProvider) {
      toast({
        title: 'Provider Required',
        description: 'Please select an email provider (Brevo or Sender.net)',
        variant: 'destructive',
      });
      return;
    }

    if (deliveryProvider === 'brevo' && !selectedBrevoListId) {
      toast({
        title: 'List Required',
        description: 'Please select a Brevo contact list to send to',
        variant: 'destructive',
      });
      return;
    }

    if (deliveryProvider === 'sender' && !selectedSenderListId) {
      toast({
        title: 'List Required',
        description: 'Please select a Sender.net contact list to send to',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      if (deliveryProvider === 'brevo') {
        if (!apiKeys?.brevo?.apiKey) {
          throw new Error('Brevo API key not configured. Go to Settings to add it.');
        }

        const senderEmail = apiKeys.brevo.senderEmail || appUser?.email;
        // Prioritize company name for sender name to show business name in recipient's inbox
        const senderName = company?.name || apiKeys.brevo.senderName || appUser?.name || 'Your Company';

        if (!senderEmail) {
          throw new Error('Sender email not configured. Go to Settings > Brevo to add it.');
        }

        toast({
          title: 'Creating Campaign...',
          description: 'Please wait while we prepare your email.',
        });

        const result = await createAndSendBrevoCampaignAction({
          apiKey: apiKeys.brevo.apiKey,
          campaignName: subject.substring(0, 50) + ' - ' + new Date().toLocaleDateString(),
          subject: subject,
          htmlContent: htmlContent,
          senderName: senderName,
          senderEmail: senderEmail,
          brevoListIds: [parseInt(selectedBrevoListId)],
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send campaign via Brevo');
        }

        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}

        toast({
          title: 'Email Campaign Sent!',
          description: `Your email is being sent to ${selectedBrevoList?.totalSubscribers || 'your'} contacts via Brevo.`,
        });

        // Save campaign to database for tracking
        if (appUser?.companyId) {
          try {
            await addStoredEmailCampaign({
              name: subject.substring(0, 50) + ' - ' + new Date().toLocaleDateString(),
              status: 'Sent via Brevo',
              subject: subject,
              senderName: senderName,
              senderEmail: senderEmail,
              content: htmlContent,
              companyId: appUser.companyId,
              recipients: selectedBrevoList?.name || 'Brevo List',
              provider: 'brevo',
              brevoListIds: [parseInt(selectedBrevoListId)],
              ...(result.brevoCampaignId && { brevoCampaignId: result.brevoCampaignId.toString() }),
              recipientCount: selectedBrevoList?.totalSubscribers || 0,
              sentDate: new Date(),
            });
          } catch (saveError) {
            console.error('Failed to save campaign record:', saveError);
          }
        }

      } else if (deliveryProvider === 'sender') {
        if (!apiKeys?.sender?.apiKey) {
          throw new Error('Sender.net API key not configured. Go to Settings to add it.');
        }

        const senderEmail = apiKeys.sender.senderEmail || appUser?.email;
        // Prioritize company name for sender name to show business name in recipient's inbox
        // Sender.net works best with just the company name (without email appended)
        const senderName = company?.name || apiKeys.sender.senderName || appUser?.name || 'Your Company';

        if (!senderEmail) {
          throw new Error('Sender email not configured. Go to Settings > Sender.net to add it.');
        }

        toast({
          title: 'Creating Campaign...',
          description: 'Please wait while we prepare your email.',
        });

        const createResult = await createSenderCampaignAction(
          apiKeys.sender.apiKey,
          {
            name: subject.substring(0, 50) + ' - ' + new Date().toLocaleDateString(),
            subject: subject,
            html: htmlContent,
            sender: {
              name: senderName,
              email: senderEmail,
            },
            groups: [selectedSenderListId],
          }
        );

        if (!createResult.success || !createResult.campaignId) {
          throw new Error(createResult.error || 'Failed to create campaign');
        }

        const sendResult = await sendSenderCampaignAction(
          apiKeys.sender.apiKey,
          createResult.campaignId
        );

        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Campaign created but failed to send');
        }

        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}

        toast({
          title: 'Email Campaign Sent!',
          description: `Your email is being sent to ${selectedSenderList?.total || 'your'} contacts via Sender.net.`,
        });

        // Save campaign to database for tracking
        if (appUser?.companyId) {
          try {
            await addStoredEmailCampaign({
              name: subject.substring(0, 50) + ' - ' + new Date().toLocaleDateString(),
              status: 'Sent via Sender.net',
              subject: subject,
              senderName: senderName,
              senderEmail: senderEmail,
              content: htmlContent,
              companyId: appUser.companyId,
              recipients: selectedSenderList?.name || 'Sender.net List',
              provider: 'sender',
              senderCampaignId: createResult.campaignId,
              recipientCount: selectedSenderList?.total || 0,
              sentDate: new Date(),
            });
          } catch (saveError) {
            console.error('Failed to save campaign record:', saveError);
          }
        }
      }

      setSubject('');
      setHtmlContent(`<h1>Hi {{ contact.FIRSTNAME }},</h1>

<p>Write your email content here...</p>

<p>Best regards,<br>${company?.name || '[Your Company Name]'}</p>`);

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send email campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <PageTitle icon={Mail}>Compose Email</PageTitle>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Write and send your own custom email - no AI credits used
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-auto sm:ml-0">
          <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)} className="text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Use </span>Template
          </Button>
          <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
            <Link href="/campaigns/ai-email">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              AI Studio
            </Link>
          </Button>
        </div>
      </div>

      {!hasAnyProvider && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No email provider configured. <Link href="/settings?tab=integrations" className="underline font-medium">Go to Settings</Link> to set up Brevo or Sender.net first.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                Email Content
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Write your email subject and body. Use {"{{ contact.FIRSTNAME }}"} to personalize with recipient names.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="Enter your email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email Body (HTML)</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'edit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('edit')}
                    >
                      <Code className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={viewMode === 'preview' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('preview')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>

                {viewMode === 'edit' ? (
                  <Textarea
                    placeholder="Write your email content here..."
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                ) : (
                  <div className="border rounded-lg p-4 min-h-[400px] bg-white dark:bg-gray-900">
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateName(subject || 'My Email Template');
                  setSaveTemplateDialogOpen(true);
                }}
                disabled={!subject || !htmlContent}
              >
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Send To
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Select provider and contact list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Email Provider</Label>
                <Select value={deliveryProvider || ''} onValueChange={(v) => setDeliveryProvider(v as DeliveryProvider)}>
                  <SelectTrigger className="w-full min-h-[44px] text-sm">
                    <SelectValue placeholder="Choose provider..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {hasBrevoConfigured && <SelectItem value="brevo" className="py-3">Brevo (Sendinblue)</SelectItem>}
                    {hasSenderConfigured && <SelectItem value="sender" className="py-3">Sender.net</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {deliveryProvider === 'brevo' && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Brevo Contact List</Label>
                  {isLoadingBrevoLists ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading lists...
                    </div>
                  ) : brevoLists.length === 0 ? (
                    <Alert className="py-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        No lists found. Create a contact list in Brevo first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedBrevoListId} onValueChange={setSelectedBrevoListId}>
                      <SelectTrigger className="w-full min-h-[44px] text-sm">
                        <SelectValue placeholder="Select list..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {brevoLists.map((list) => (
                          <SelectItem key={list.id} value={list.id.toString()} className="py-3">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{list.name}</span>
                              <span className="text-xs text-muted-foreground">{list.totalSubscribers} contacts</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {deliveryProvider === 'sender' && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Sender.net Contact List</Label>
                  {isLoadingSenderLists ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading lists...
                    </div>
                  ) : senderLists.length === 0 ? (
                    <Alert className="py-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        No lists found. Create a contact list in Sender.net first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedSenderListId} onValueChange={setSelectedSenderListId}>
                      <SelectTrigger className="w-full min-h-[44px] text-sm">
                        <SelectValue placeholder="Select list..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {senderLists.map((list) => (
                          <SelectItem key={list.id} value={list.id} className="py-3">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{list.name}</span>
                              <span className="text-xs text-muted-foreground">{list.total} contacts</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                className="w-full min-h-[44px] text-sm sm:text-base"
                onClick={handleSendEmail}
                disabled={isSending || !subject || !htmlContent || !deliveryProvider || 
                  (deliveryProvider === 'brevo' && !selectedBrevoListId) ||
                  (deliveryProvider === 'sender' && !selectedSenderListId)}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Alert className="py-2 sm:py-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              This sends your email directly via {deliveryProvider === 'brevo' ? 'Brevo' : deliveryProvider === 'sender' ? 'Sender.net' : 'your provider'} without using any AI credits.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Marketing Email Templates</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Choose a template to start with. Customize the [bracketed] text with your details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {MARKETING_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 sm:px-6">
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium">Subject: </span>
                    <span className="text-muted-foreground">{template.subject}</span>
                  </div>
                  <div className="bg-muted p-2 rounded text-xs max-h-20 sm:max-h-24 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: template.body.substring(0, 200) + '...' }} />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 px-3 sm:px-6 pt-2">
                  <Button size="sm" onClick={() => handleUseTemplate(template)} className="flex-1 text-xs sm:text-sm">
                    Use Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyTemplate(template)}
                    className="shrink-0"
                  >
                    {copied === template.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this email as a reusable template for future campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Monthly Newsletter"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description (Optional)</Label>
              <Textarea
                id="template-desc"
                placeholder="Brief description of this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={isSavingTemplate}>
              {isSavingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
