
"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button }
from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Send,
  Save,
  Loader2,
  Wand2,
  ClipboardList,
  Copy,
  Info,
  Eye,
  Code,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useForm, Controller, type SubmitHandler, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EmailCampaign } from '@/lib/mock-data';
import {
  getStoredEmailCampaigns,
  addStoredEmailCampaign,
  updateStoredEmailCampaign,
} from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  sendBrevoCampaign,
  type SendBrevoCampaignInput,
  type SendBrevoCampaignOutput,
} from '@/ai/flows/send-brevo-campaign-flow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateTrackedEmailContentAction, generateTrackedSubjectAndCtasAction } from '@/app/actions/tracked-ai-content-actions';
import type { GenerateEmailContentInput, GenerateEmailContentOutput } from '@/ai/flows/generate-email-content-flow';
import type { GenerateSubjectAndCtaInput, GenerateSubjectAndCtaOutput } from '@/ai/flows/generate-subject-and-cta-flow';
import { 
  createSenderCampaignAction, 
  sendSenderCampaignAction,
  fetchSenderListsAction 
} from '@/app/actions/sender-actions';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import type { SenderContactList } from '@/lib/sender-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import type { StoredApiKeys } from '@/types/integrations';
import { useAuth } from '@/hooks/use-auth';
import { showAISuccessToast } from '@/lib/ai-toast-helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TemplateBrowser from '@/components/templates/template-browser';
import { getFriendlyLabel } from '@/lib/friendly-labels';
import { getFriendlyError, getFriendlySuccess, getFriendlyLoading } from '@/lib/friendly-messages';


const campaignSchema = z.object({
  name: z.string().min(1, 'Please give your campaign a name'),
  subject: z.string().min(1, 'Please add an email title'),
  senderName: z.string().min(1, 'Please add your name or company name'),
  senderEmail: z.string().email('Please enter a valid email address'),
  content: z
    .string()
    .min(10, 'Your email needs to be at least 10 characters long')
    .refine(
      (content) => content.includes('{{ contact.FIRSTNAME }}'),
      { message: "Don't forget to add {{ contact.FIRSTNAME }} so we can personalize each email!" }
    ),
  recipients: z
    .string()
    .min(1, 'Please select which contacts should receive this email')
    .regex(/^([a-zA-Z0-9]+)(,\s*[a-zA-Z0-9]+)*$/, 'Please enter contact group IDs separated by commas (like: 2, e506gz)'),
  companyId: z.string().min(1, 'Company ID is missing.'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

type AiContentInputs = {
  campaignGoal: string;
  targetAudience: string;
  keyPoints: string;
  tone: 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
  callToAction?: string;
  callToActionLink?: string;
};

type AiSubjectAndCtaInputs = GenerateSubjectAndCtaInput;

export default function CreateEmailCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [campaignIdToEdit, setCampaignIdToEdit] = useState<string | null>(null);
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [defaultBrevoListId, setDefaultBrevoListId] = useState('2');
  const [senderApiKey, setSenderApiKey] = useState('');
  
  // Provider selection
  const [selectedProvider, setSelectedProvider] = useState<'brevo' | 'sender' | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Array<'brevo' | 'sender'>>([]);
  
  // Lists for both providers
  const [brevoLists, setBrevoLists] = useState<Array<{id: number; name: string; totalSubscribers: number}>>([]);
  const [senderLists, setSenderLists] = useState<SenderContactList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);


  const [aiInputs, setAiInputs] = useState<AiContentInputs>({
    campaignGoal: '',
    targetAudience: '',
    keyPoints: '',
    tone: 'Friendly',
    callToAction: '',
    callToActionLink: '',
  });

  const [aiSubjectCtaInputs, setAiSubjectCtaInputs] = useState<AiSubjectAndCtaInputs>({
    campaignTopicOrGoal: '',
    desiredToneForSubject: 'Friendly',
    desiredToneForCta: 'Benefit-driven',
    numSuggestions: 3,
  });
  const [subjectLineSuggestions, setSubjectLineSuggestions] = useState<string[] | null>(null);
  const [ctaSuggestions, setCtaSuggestions] = useState<string[] | null>(null);
  const [isSubjectCtaLoading, setIsSubjectCtaLoading] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);


  const getSenderDetails = useCallback(() => {
    // **REVISED LOGIC**: Prioritize the company name and default sender email from settings.
    const defaultSenderEmail = company?.apiKeys?.brevo?.senderEmail || company?.apiKeys?.sender?.senderEmail || appUser?.email || "notifications@example.com";
    // Use company name as sender name, falling back to user name if company name is not set
    const defaultSenderName = company?.name || appUser?.name || "Your Company";
    return { defaultSenderName, defaultSenderEmail };
  }, [appUser, company]);
  
  // Fetch contact lists for the selected provider
  const fetchContactLists = useCallback(async (provider: 'brevo' | 'sender') => {
    setIsLoadingLists(true);
    try {
      if (provider === 'brevo' && brevoApiKey) {
        const result = await fetchBrevoListsAction(brevoApiKey);
        if (result.success && result.lists) {
          setBrevoLists(result.lists);
        } else {
          toast({
            title: 'Error Loading Brevo Lists',
            description: result.error || 'Could not load contact lists from Brevo.',
            variant: 'destructive',
          });
        }
      } else if (provider === 'sender' && senderApiKey) {
        const result = await fetchSenderListsAction(senderApiKey);
        if (result.success && result.lists) {
          setSenderLists(result.lists);
        } else {
          toast({
            title: 'Error Loading Sender.net Lists',
            description: result.error || 'Could not load contact groups from Sender.net.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error Loading Lists',
        description: error.message || 'Failed to load contact lists.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, [brevoApiKey, senderApiKey, toast]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      subject: '',
      senderName: '',
      senderEmail: '',
      content: `<h1>Hi {{ contact.FIRSTNAME }},</h1>\n\n<p>Start your email content here...</p>\n\n<p>[Your Company Name]</p>`,
      recipients: '',
      companyId: appUser?.companyId || '',
    },
  });

  const watchedContent = watch('content');

  useEffect(() => {
    if (appUser?.companyId) {
      setValue('companyId', appUser.companyId);
    }
    
    const providers: Array<'brevo' | 'sender'> = [];
    
    // Check Brevo configuration
    if (company?.apiKeys?.brevo?.apiKey) {
        setBrevoApiKey(company.apiKeys.brevo.apiKey);
        const listIdFromSettings = company.apiKeys.brevo.defaultListId;
        setDefaultBrevoListId(listIdFromSettings && listIdFromSettings.trim() !== '' ? listIdFromSettings : '2');
        providers.push('brevo');
    }
    
    // Check Sender.net configuration
    if (company?.apiKeys?.sender?.apiKey) {
        setSenderApiKey(company.apiKeys.sender.apiKey);
        providers.push('sender');
    }
    
    setAvailableProviders(providers);
    
    // Auto-select first available provider
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [appUser, company, setValue, selectedProvider]);
  
  // Fetch lists when selected provider changes
  useEffect(() => {
    if (selectedProvider) {
      fetchContactLists(selectedProvider);
    }
  }, [selectedProvider, fetchContactLists]);

  useEffect(() => {
    const { defaultSenderName, defaultSenderEmail } = getSenderDetails();
    
    const editId = searchParams.get('edit');
    const fromAdName = searchParams.get('name');
    const fromAdSubject = searchParams.get('subject');
    const fromAdContent = searchParams.get('content');

    const loadCampaignForEditing = async (id: string) => {
        const campaigns = await getStoredEmailCampaigns(appUser?.companyId);
        const campaignToEdit = campaigns.find((c) => c.id === id);
        if (campaignToEdit) {
            reset({
            name: campaignToEdit.name,
            subject: campaignToEdit.subject,
            senderName: campaignToEdit.senderName || defaultSenderName,
            senderEmail: campaignToEdit.senderEmail || defaultSenderEmail,
            content: campaignToEdit.content || `<h1>Hi {{ contact.FIRSTNAME }},</h1>\n\n<p>Content for ${campaignToEdit.name}...</p>`,
            recipients: campaignToEdit.brevoListIds?.join(',') || campaignToEdit.recipients || defaultBrevoListId,
            companyId: campaignToEdit.companyId,
            });
            setAiSubjectCtaInputs((prev) => ({
            ...prev,
            campaignTopicOrGoal: campaignToEdit.name || campaignToEdit.subject,
            }));
            setAiInputs((prev) => ({
            ...prev,
            campaignGoal: campaignToEdit.name || campaignToEdit.subject,
            targetAudience: 'Previous Audience', 
            keyPoints: 'Review & Update Key Points',
            callToAction: campaignToEdit.subject, 
            }));
        } else {
            toast({
            title: "Error",
            description: "Campaign not found for editing.",
            variant: "destructive",
            });
            router.push('/email-marketing');
        }
    };

    if (editId) {
      setIsEditing(true);
      setCampaignIdToEdit(editId);
      loadCampaignForEditing(editId);
    } else if (fromAdName && fromAdSubject && fromAdContent) {
        setIsEditing(false);
        setCampaignIdToEdit(null);
        reset({
            name: fromAdName,
            subject: fromAdSubject,
            content: fromAdContent,
            senderName: defaultSenderName,
            senderEmail: defaultSenderEmail,
            recipients: defaultBrevoListId,
            companyId: appUser?.companyId || '',
        });
        setAiSubjectCtaInputs(prev => ({ ...prev, campaignTopicOrGoal: fromAdName }));
        setAiInputs(prev => ({ ...prev, campaignGoal: fromAdName }));
        toast({
            title: "Campaign Pre-filled from Ad",
            description: "Review the content and recipients, then save or send.",
        });
    } else {
      setIsEditing(false);
      setCampaignIdToEdit(null);
      reset({
        name: '',
        subject: '',
        senderName: defaultSenderName,
        senderEmail: defaultSenderEmail,
        content: `<h1>Hi {{ contact.FIRSTNAME }},</h1>\n\n<p>Start your email content here...</p>\n\n<p>[Your Company Name]</p>`,
        recipients: defaultBrevoListId,
        companyId: appUser?.companyId || '',
      });
      setAiInputs({
        campaignGoal: '', targetAudience: '', keyPoints: '', tone: 'Friendly', callToAction: '', callToActionLink: ''
      });
       setAiSubjectCtaInputs({ campaignTopicOrGoal: '', desiredToneForSubject: 'Friendly', desiredToneForCta: 'Benefit-driven', numSuggestions: 3 });
    }
  }, [searchParams, router, toast, reset, getSenderDetails, appUser, defaultBrevoListId]);

  const handleAiInputChange = (
    field: keyof AiContentInputs,
    value: string | AiContentInputs['tone']
  ) => {
    setAiInputs((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleAiSubjectCtaInputChange = (
    field: keyof AiSubjectAndCtaInputs,
    value: string | number | undefined
  ) => {
    setAiSubjectCtaInputs((prev) => ({ ...prev, [field]: value as any }));
    if (field === 'campaignTopicOrGoal') {
        const currentSubject = getValues('subject');
        const campaignName = getValues('name');
        if (!currentSubject || currentSubject === campaignName) {
            setValue('subject', (value as string) || campaignName || '', { shouldValidate: true });
        }
        setAiInputs(prevAi => ({ ...prevAi, campaignGoal: (value as string) || campaignName || '' }));
    }
  };

  const handleGenerateContent = async () => {
    if (!aiInputs.campaignGoal || !aiInputs.keyPoints || !aiInputs.targetAudience) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: 'Please fill in Campaign Goal, Target Audience, and Key Messages to generate content.',
        variant: 'destructive',
      });
      return;
    }
    if (!appUser) return;
    setIsGeneratingContent(true);
    try {
      const result = await generateTrackedEmailContentAction(appUser.companyId, appUser.uid, aiInputs);
      if (result.success && result.data) {
        setValue('content', result.data.htmlContent, { shouldValidate: true });
        const successMsg = getFriendlySuccess('email/sent', `Your email content is ready! (-${result.quotaInfo?.consumed} credits, ${result.quotaInfo?.remaining} remaining)`);
        toast({
          title: 'Content Created! ✨',
          description: successMsg.description,
        });
      } else {
        throw new Error(result.error || 'Failed to generate content');
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      const errorMsg = getFriendlyError('ai/generation-failed', error.message);
      toast({
        title: errorMsg.title,
        description: errorMsg.description || 'We had trouble creating content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateSubjectAndCtas = async () => {
    if (!appUser) return;
    const currentCampaignName = getValues('name');
    const topicToUse = aiSubjectCtaInputs.campaignTopicOrGoal || currentCampaignName || "";
    if (!topicToUse) {
      toast({
        title: "Topic/Goal Required",
        description: "Please enter a campaign topic/goal (pre-fills from Campaign Name).",
        variant: "destructive",
      });
      return;
    }
    setIsSubjectCtaLoading(true);
    setSubjectLineSuggestions(null);
    setCtaSuggestions(null);
    try {
      const result = await generateTrackedSubjectAndCtasAction(appUser.companyId, appUser.uid, {
        ...aiSubjectCtaInputs,
        campaignTopicOrGoal: topicToUse,
      });
      if (result.success && result.data) {
        setSubjectLineSuggestions(result.data.subjectLineSuggestions);
        setCtaSuggestions(result.data.ctaSuggestions);
        showAISuccessToast(toast, "Subject Lines & CTAs", result.quotaInfo);
      } else {
          throw new Error(result.error || 'Failed to generate suggestions.');
      }
    } catch (error: any) {
      toast({
        title: 'Error Generating Suggestions',
        description: error.message || 'Failed to generate subject lines and CTAs.',
        variant: 'destructive',
      });
    } finally {
      setIsSubjectCtaLoading(false);
    }
  };

  const useSubjectLine = (subject: string) => {
    setValue('subject', subject, { shouldValidate: true });
    setAiInputs((prev) => ({ ...prev, campaignGoal: subject })); // Update body generator goal
    setSubjectLineSuggestions(null); 
  };

  const usePrimaryCta = (cta: string) => {
    handleAiInputChange('callToAction', cta);
    toast({ title: 'Primary CTA Text Set', description: `"${cta}" will be used by the AI Email Body Generator. Remember to add the CTA link below.` });
    setCtaSuggestions(null); 
  };

  const handleApplyTemplate = (subject: string | undefined, content: string) => {
    if (subject) {
      setValue('subject', subject, { shouldValidate: true });
    }
    setValue('content', content, { shouldValidate: true });
    setIsTemplateBrowserOpen(false);
    toast({
      title: 'Template Applied!',
      description: 'The template has been filled into your campaign.',
    });
  };

  const onSubmit: SubmitHandler<CampaignFormData> = async (data) => {
    setIsLoading(true);
    const listIds = data.recipients
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (listIds.length === 0) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: "Please select at least one contact group to send to.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    let campaignToSave: EmailCampaign;

    if (isEditing && campaignIdToEdit) {
      const campaigns = await getStoredEmailCampaigns(appUser?.companyId);
      const existingCampaign = campaigns.find((c) => c.id === campaignIdToEdit);
      if (existingCampaign) {
        // Calculate total recipients from selected lists
        let totalRecipients = 0;
        if (selectedProvider === 'brevo') {
          totalRecipients = listIds.reduce((sum, listIdStr) => {
            const listId = parseInt(listIdStr);
            const list = brevoLists.find(l => l.id === listId);
            return sum + (list?.totalSubscribers || 0);
          }, 0);
        } else if (selectedProvider === 'sender') {
          totalRecipients = listIds.reduce((sum, groupId) => {
            const group = senderLists.find(l => l.id === groupId);
            return sum + (group?.total || 0);
          }, 0);
        }
        
        campaignToSave = {
          ...existingCampaign,
          ...data,
          provider: selectedProvider || undefined,
          brevoListIds: listIds,
          recipientCount: totalRecipients,
          status: 'Draft',
          lastModified: new Date().toISOString(),
        };
        await updateStoredEmailCampaign(campaignToSave);
        const successMsg = getFriendlySuccess('save/success', `"${data.name}" has been updated`);
        toast({
          title: successMsg.title,
          description: successMsg.description,
        });
      } else {
        const errorMsg = getFriendlyError('data/not-found');
        toast({ title: errorMsg.title, description: errorMsg.description, variant: "destructive"});
        setIsLoading(false);
        return;
      }
    } else {
       // Calculate total recipients from selected lists
       let totalRecipients = 0;
       if (selectedProvider === 'brevo') {
         totalRecipients = listIds.reduce((sum, listIdStr) => {
           const listId = parseInt(listIdStr);
           const list = brevoLists.find(l => l.id === listId);
           return sum + (list?.totalSubscribers || 0);
         }, 0);
       } else if (selectedProvider === 'sender') {
         totalRecipients = listIds.reduce((sum, groupId) => {
           const group = senderLists.find(l => l.id === groupId);
           return sum + (group?.total || 0);
         }, 0);
       }
       
       const newCampaignData: Omit<EmailCampaign, 'id' | 'createdAt' | 'lastModified'> = {
         ...data,
         status: 'Draft',
         provider: selectedProvider || undefined,
         brevoListIds: listIds,
         recipientCount: totalRecipients,
         openRate: 0,
         clickRate: 0,
         unsubscribes: 0,
         bounces: 0,
         sentDate: null,
       };
      await addStoredEmailCampaign(newCampaignData);
      const successMsg = getFriendlySuccess('save/success', `"${data.name}" saved as a draft`);
      toast({
        title: successMsg.title,
        description: successMsg.description,
      });
    }
    setIsLoading(false);
    router.push('/email-marketing');
  };

  const handleSendViaBrevo = async () => {
    if (!brevoApiKey) {
        const errorMsg = getFriendlyError('brevo/not-configured');
        toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' });
        return;
    }

    const formData = getValues();
    const validation = campaignSchema.safeParse(formData);
    if (!validation.success) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: "destructive",
      });
      validation.error.errors.forEach((err) => {
        toast({
          title: errorMsg.title,
          description: err.message,
          variant: "destructive",
        });
      });
      return;
    }

    setIsSending(true);
    const brevoListIds = formData.recipients
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (brevoListIds.length === 0) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: "Please select which contacts should receive this email.",
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }

    const campaignInput: SendBrevoCampaignInput = {
      apiKey: brevoApiKey,
      campaignName: formData.name,
      subject: formData.subject,
      htmlContent: formData.content,
      senderName: formData.senderName,
      senderEmail: formData.senderEmail,
      brevoListIds: brevoListIds,
    };

    let currentCampaignIdForSend = campaignIdToEdit;
    let localCampaignForStatusUpdate: EmailCampaign | undefined;

    if (!isEditing || !campaignIdToEdit) {
      // Calculate total recipients from selected Brevo lists
      const totalRecipients = brevoListIds.reduce((sum, listId) => {
        const list = brevoLists.find(l => l.id === listId);
        return sum + (list?.totalSubscribers || 0);
      }, 0);
      
      const newCampaignDraftData: Omit<EmailCampaign, 'id' | 'createdAt' | 'lastModified'> = {
        ...formData,
        status: 'Draft',
        provider: 'brevo',
        brevoListIds,
        recipientCount: totalRecipients, openRate: 0, clickRate: 0, unsubscribes: 0, bounces: 0, sentDate: null,
      };
      const newCampaignDraft = await addStoredEmailCampaign(newCampaignDraftData);
      localCampaignForStatusUpdate = newCampaignDraft;
      currentCampaignIdForSend = newCampaignDraft.id;
      setCampaignIdToEdit(currentCampaignIdForSend);
      setIsEditing(true);
      toast({
        title: 'Draft Saved Locally',
        description: `Campaign "${formData.name}" saved. Attempting to send via Brevo...`,
      });
    } else {
      const campaigns = await getStoredEmailCampaigns(appUser?.companyId);
      localCampaignForStatusUpdate = campaigns.find((c) => c.id === currentCampaignIdForSend);
    }

    if (localCampaignForStatusUpdate && currentCampaignIdForSend) {
      const sendingState = { ...localCampaignForStatusUpdate, status: 'Sending via Brevo' as const };
      await updateStoredEmailCampaign(sendingState);
    } else {
        toast({ title: "Error", description: "Could not find local campaign to update status before sending.", variant: "destructive" });
        setIsSending(false);
        return;
    }

    try {
      const result: SendBrevoCampaignOutput = await sendBrevoCampaign(campaignInput);
      const finalCampaignState = (await getStoredEmailCampaigns(appUser?.companyId)).find(
        (c) => c.id === currentCampaignIdForSend
      );

      if (result.success && currentCampaignIdForSend && finalCampaignState) {
        const successMsg = getFriendlySuccess('email/sent', `"${finalCampaignState.name}" is on its way to your contacts!`);
        toast({
          title: successMsg.title,
          description: successMsg.description,
          duration: 7000,
        });
        await updateStoredEmailCampaign({
          ...finalCampaignState,
          status: 'Sent via Brevo',
          ...(result.brevoCampaignId && { brevoCampaignId: result.brevoCampaignId.toString() }),
          sentDate: new Date().toISOString(),
        });
        router.push(`/email-marketing/campaigns/${currentCampaignIdForSend}`);
      } else {
        const errorDescription = result.message || 'Could not send campaign via Brevo. Please check Brevo for details.';
        const isIpError = errorDescription.toLowerCase().includes('ip address') || errorDescription.toLowerCase().includes('unauthorized');
        const errorMsg = getFriendlyError('brevo/send-failed', errorDescription);
        
        toast({
          title: errorMsg.title,
          description: isIpError 
            ? `${errorMsg.description}\n\nℹ️ Tip: You may need to add your server's IP address to Brevo's authorized list in Settings → Security.`
            : errorMsg.description,
          variant: 'destructive',
          duration: 10000,
        });
        if (finalCampaignState && currentCampaignIdForSend) {
          await updateStoredEmailCampaign({
            ...finalCampaignState,
            status: 'Failed via Brevo',
            ...(result.brevoCampaignId && { brevoCampaignId: result.brevoCampaignId.toString() }),
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error Sending Campaign',
        description: error.message || 'Failed to send campaign.',
        variant: 'destructive',
      });
      const finalCampaignStateOnError = (await getStoredEmailCampaigns(appUser?.companyId)).find(
        (c) => c.id === currentCampaignIdForSend
      );
      if (finalCampaignStateOnError && currentCampaignIdForSend) {
        await updateStoredEmailCampaign({ ...finalCampaignStateOnError, status: 'Failed via Brevo' });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendViaSender = async () => {
    if (!senderApiKey) {
        const errorMsg = getFriendlyError('sender/not-configured');
        toast({ 
          title: 'Sender.net Not Configured', 
          description: 'Please add your Sender.net API key in Settings to send campaigns.', 
          variant: 'destructive' 
        });
        return;
    }

    const formData = getValues();
    const validation = campaignSchema.safeParse(formData);
    if (!validation.success) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: "destructive",
      });
      validation.error.errors.forEach((err) => {
        toast({
          title: errorMsg.title,
          description: err.message,
          variant: "destructive",
        });
      });
      return;
    }

    setIsSending(true);
    const groupIds = formData.recipients
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (groupIds.length === 0) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({
        title: errorMsg.title,
        description: "Please select which contact groups should receive this email.",
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }

    let currentCampaignIdForSend = campaignIdToEdit;
    let localCampaignForStatusUpdate: EmailCampaign | undefined;

    if (!isEditing || !campaignIdToEdit) {
      // Calculate total recipients from selected Sender.net groups
      const totalRecipients = groupIds.reduce((sum, groupId) => {
        const group = senderLists.find(l => l.id === groupId);
        return sum + (group?.total || 0);
      }, 0);
      
      const newCampaignDraftData: Omit<EmailCampaign, 'id' | 'createdAt' | 'lastModified'> = {
        ...formData,
        status: 'Draft',
        provider: 'sender',
        brevoListIds: groupIds,
        recipientCount: totalRecipients, openRate: 0, clickRate: 0, unsubscribes: 0, bounces: 0, sentDate: null,
      };
      const newCampaignDraft = await addStoredEmailCampaign(newCampaignDraftData);
      localCampaignForStatusUpdate = newCampaignDraft;
      currentCampaignIdForSend = newCampaignDraft.id;
      setCampaignIdToEdit(currentCampaignIdForSend);
      setIsEditing(true);
      toast({
        title: 'Draft Saved Locally',
        description: `Campaign "${formData.name}" saved. Attempting to send via Sender.net...`,
      });
    } else {
      const campaigns = await getStoredEmailCampaigns(appUser?.companyId);
      localCampaignForStatusUpdate = campaigns.find((c) => c.id === currentCampaignIdForSend);
    }

    if (localCampaignForStatusUpdate && currentCampaignIdForSend) {
      const sendingState = { ...localCampaignForStatusUpdate, status: 'Sending via Sender.net' as const };
      await updateStoredEmailCampaign(sendingState);
    } else {
        toast({ title: "Error", description: "Could not find local campaign to update status before sending.", variant: "destructive" });
        setIsSending(false);
        return;
    }

    try {
      // Step 1: Create campaign in Sender.net
      const createResult = await createSenderCampaignAction(senderApiKey, {
        name: formData.name,
        subject: formData.subject,
        html: formData.content,
        sender: {
          name: formData.senderName,
          email: formData.senderEmail,
        },
        groups: groupIds,
      });

      if (!createResult.success || !createResult.campaignId) {
        throw new Error(createResult.error || 'Failed to create campaign in Sender.net');
      }

      const senderCampaignId = createResult.campaignId;

      // Step 2: Send the campaign
      const sendResult = await sendSenderCampaignAction(senderApiKey, senderCampaignId);

      const finalCampaignState = (await getStoredEmailCampaigns(appUser?.companyId)).find(
        (c) => c.id === currentCampaignIdForSend
      );

      if (sendResult.success && currentCampaignIdForSend && finalCampaignState) {
        const successMsg = getFriendlySuccess('email/sent', `"${finalCampaignState.name}" is on its way to your contacts via Sender.net!`);
        toast({
          title: successMsg.title,
          description: successMsg.description,
          duration: 7000,
        });
        await updateStoredEmailCampaign({
          ...finalCampaignState,
          status: 'Sent via Sender.net',
          senderCampaignId: senderCampaignId.toString(),
          sentDate: new Date().toISOString(),
        });
        router.push(`/email-marketing/campaigns/${currentCampaignIdForSend}`);
      } else {
        const errorDescription = sendResult.error || 'Could not send campaign via Sender.net.';
        const errorMsg = getFriendlyError('sender/send-failed', errorDescription);
        
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
          duration: 10000,
        });
        if (finalCampaignState && currentCampaignIdForSend) {
          await updateStoredEmailCampaign({
            ...finalCampaignState,
            status: 'Failed via Sender.net',
            senderCampaignId: senderCampaignId.toString(),
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error Sending Campaign',
        description: error.message || 'Failed to send campaign via Sender.net.',
        variant: 'destructive',
      });
      const finalCampaignStateOnError = (await getStoredEmailCampaigns(appUser?.companyId)).find(
        (c) => c.id === currentCampaignIdForSend
      );
      if (finalCampaignStateOnError && currentCampaignIdForSend) {
        await updateStoredEmailCampaign({ ...finalCampaignStateOnError, status: 'Failed via Sender.net' });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild type="button">
          <Link href="/email-marketing"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Link>
        </Button>
        <PageTitle
          title={isEditing ? "Edit Email Campaign" : "Create New Email Campaign"}
          description={
            isEditing
              ? `Modifying campaign: ${getValues('name') || campaignIdToEdit}`
              : "Design your next email blast."
          }
        />
      </div>

      {availableProviders.length === 0 && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitleComponent>No Email Provider Configured</AlertTitleComponent>
                <AlertDescription>
                   You need to configure at least one email provider (Brevo or Sender.net) in <Link href="/settings?tab=integrations" className="underline font-semibold">Settings</Link> to send campaigns. You can still save drafts.
                </AlertDescription>
            </Alert>
        )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Setup</CardTitle>
              <CardDescription>Basic campaign information.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTemplateBrowserOpen(true)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Browse Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selector - only show if multiple providers configured */}
          {availableProviders.length > 1 && (
            <div>
              <Label htmlFor="emailProvider">Email Provider *</Label>
              <Select
                value={selectedProvider || ''}
                onValueChange={(value: 'brevo' | 'sender') => setSelectedProvider(value)}
              >
                <SelectTrigger id="emailProvider">
                  <SelectValue placeholder="Select email provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.includes('brevo') && (
                    <SelectItem value="brevo">Brevo</SelectItem>
                  )}
                  {availableProviders.includes('sender') && (
                    <SelectItem value="sender">Sender.net</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose which email service to use for this campaign
              </p>
            </div>
          )}
          
          {/* Show selected provider info if only one is configured */}
          {availableProviders.length === 1 && selectedProvider && (
            <Alert variant="default" className="text-xs">
              <Info className="h-4 w-4 text-blue-500"/>
              <AlertDescription className="text-blue-600">
                Using <strong>{selectedProvider === 'brevo' ? 'Brevo' : 'Sender.net'}</strong> as your email provider
              </AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="campaignName"
                  placeholder="e.g., Holiday Special"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setAiSubjectCtaInputs((prev) => ({ ...prev, campaignTopicOrGoal: e.target.value || getValues('subject') }));
                    setAiInputs((prev) => ({ ...prev, campaignGoal: e.target.value }));
                  }}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
          
          <Accordion type="single" collapsible className="w-full border-b-0">
            <AccordionItem value="ai-subject-cta-combined" className="border-b-0">
              <AccordionTrigger className="text-base font-semibold py-3 hover:no-underline text-primary">
                <Wand2 className="mr-2 h-5 w-5" /> AI Subject Line & CTA Generator
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-6">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Generate Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="aiCombinedTopicGoal">Campaign Topic/Primary Goal</Label>
                      <Input
                        id="aiCombinedTopicGoal"
                        value={aiSubjectCtaInputs.campaignTopicOrGoal || ''}
                        onChange={(e) => handleAiSubjectCtaInputChange('campaignTopicOrGoal', e.target.value)}
                        placeholder="Pre-fills from Campaign Name, or enter custom topic/goal"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aiDesiredToneSubjectCombined">Desired Tone for Subject</Label>
                        <Select
                          value={aiSubjectCtaInputs.desiredToneForSubject as string || 'Friendly'}
                          onValueChange={(value: string) => handleAiSubjectCtaInputChange('desiredToneForSubject', value as AiSubjectAndCtaInputs['desiredToneForSubject'])}
                        >
                          <SelectTrigger id="aiDesiredToneSubjectCombined"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Professional">Professional</SelectItem>
                            <SelectItem value="Friendly">Friendly</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                            <SelectItem value="Playful">Playful</SelectItem>
                            <SelectItem value="Intriguing">Intriguing</SelectItem>
                            <SelectItem value="Benefit-driven">Benefit-driven</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="aiDesiredToneCtaCombined">Desired Tone for CTA</Label>
                        <Select
                          value={aiSubjectCtaInputs.desiredToneForCta as string || 'Benefit-driven'}
                          onValueChange={(value: string) => handleAiSubjectCtaInputChange('desiredToneForCta', value as AiSubjectAndCtaInputs['desiredToneForCta'])}
                        >
                          <SelectTrigger id="aiDesiredToneCtaCombined"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                            <SelectItem value="Benefit-driven">Benefit-driven</SelectItem>
                            <SelectItem value="Clear & Direct">Clear & Direct</SelectItem>
                            <SelectItem value="Playful">Playful</SelectItem>
                            <SelectItem value="Intriguing">Intriguing</SelectItem>
                            <SelectItem value="Reassuring">Reassuring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="aiNumSuggestionsCombined"># Suggestions (for each)</Label>
                      <Select
                        value={(aiSubjectCtaInputs.numSuggestions || 3).toString()}
                        onValueChange={(value) => handleAiSubjectCtaInputChange('numSuggestions', parseInt(value, 10) || 3)}
                      >
                        <SelectTrigger id="aiNumSuggestionsCombined"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (<SelectItem key={num} value={num.toString()}>{num}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateSubjectAndCtas}
                      disabled={isSubjectCtaLoading}
                    >
                      {isSubjectCtaLoading && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}
                      Suggest Subjects & CTAs
                    </Button>
                    
                    {subjectLineSuggestions && subjectLineSuggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <Label>Subject Line Suggestions:</Label>
                        <ul className="space-y-1 text-sm">
                          {subjectLineSuggestions.map((line, index) => (
                            <li key={`subj-${index}`} className="flex items-center justify-between p-1.5 border rounded-md bg-muted/30 hover:bg-muted/50">
                              <span>{line}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => useSubjectLine(line)} title="Use this subject line">Use Subject</Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ctaSuggestions && ctaSuggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <Label>CTA Suggestions:</Label>
                        <ul className="space-y-1 text-sm">
                          {ctaSuggestions.map((cta, index) => (
                            <li key={`cta-${index}`} className="flex items-center justify-between p-1.5 border rounded-md bg-muted/30 hover:bg-muted/50">
                              <span>{cta}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => usePrimaryCta(cta)} title="Use as Primary CTA for Email Body">Use CTA</Button>
                            </li>
                          ))}
                        </ul>
                         <Alert variant="default" className="mt-2 text-xs">
                           <Info className="h-3 w-3"/>
                           <AlertDescription>Click "Use CTA" to set as Primary CTA for the AI Email Body Generator. Remember to add the CTA link below.</AlertDescription>
                         </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div>
            <Label htmlFor="subjectLine">{getFriendlyLabel('subject_line').label} *</Label>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <Input
                  id="subjectLine"
                  placeholder={getFriendlyLabel('subject_line').placeholder}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setAiSubjectCtaInputs((prev) => ({ ...prev, campaignTopicOrGoal: e.target.value || getValues('name')}));
                    setAiInputs((prev) => ({ ...prev, campaignGoal: e.target.value || getValues('name') })); // Also update body goal
                  }}
                />
              )}
            />
            {errors.subject && (
              <p className="text-sm text-destructive mt-1">
                {errors.subject.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="senderName">{getFriendlyLabel('sender_name').label} *</Label>
            <Controller
              name="senderName"
              control={control}
              render={({ field }) => (
                <Input id="senderName" placeholder={getFriendlyLabel('sender_name').placeholder} {...field} />
              )}
            />
            {errors.senderName && (
              <p className="text-sm text-destructive mt-1">
                {errors.senderName.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="senderEmail">{getFriendlyLabel('sender_email').label} *</Label>
            <Controller
              name="senderEmail"
              control={control}
              render={({ field }) => (
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder={getFriendlyLabel('sender_email').placeholder}
                  {...field}
                />
              )}
            />
            {errors.senderEmail && (
              <p className="text-sm text-destructive mt-1">
                {errors.senderEmail.message}
              </p>
            )}
             <Alert variant="default" className="mt-2 text-xs">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitleComponent className="font-semibold text-blue-700">Important: Email Verification Required</AlertTitleComponent>
                <AlertDescription className="text-blue-600 space-y-1">
                    <p>The email address you use here needs to be verified in your email service provider before you can send emails.</p>
                    {selectedProvider === 'brevo' && (
                      <>
                        <p><strong>For Brevo:</strong></p>
                        <ol className="list-decimal list-inside pl-3 mt-1">
                            <li>Log in to your Brevo (formerly Sendinblue) account.</li>
                            <li>Navigate to <strong>Settings</strong> (often a gear icon or under your profile).</li>
                            <li>Look for a section like <strong>"Senders & IP"</strong> or <strong>"Your Senders."</strong></li>
                            <li>Add the email address you want to use here and follow Brevo's verification process (usually involves clicking a link in a confirmation email sent to that address).</li>
                        </ol>
                      </>
                    )}
                    {selectedProvider === 'sender' && (
                      <>
                        <p><strong>For Sender.net:</strong></p>
                        <ol className="list-decimal list-inside pl-3 mt-1">
                            <li>Log in to your Sender.net account.</li>
                            <li>Navigate to <strong>Settings</strong> or <strong>Account Settings</strong>.</li>
                            <li>Look for <strong>"Sender Details"</strong> or <strong>"Verified Senders"</strong>.</li>
                            <li>Add and verify the email address you want to use (verification link will be sent to that email).</li>
                        </ol>
                      </>
                    )}
                    <p>Using an unvalidated sender will likely result in your emails not being sent or being rejected.</p>
                </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>AI Email Body Generation</CardTitle>
              <CardDescription>
                Provide details for the AI to generate the main email content below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="aiCampaignGoal">Campaign Goal * (Pre-fills from Campaign Name or Subject)</Label>
            <Input
              id="aiCampaignGoal"
              value={aiInputs.campaignGoal}
              onChange={(e) => handleAiInputChange('campaignGoal', e.target.value)}
              placeholder="e.g., Promote new feature, Announce holiday sale"
            />
          </div>
          <div>
            <Label htmlFor="aiTargetAudience">Target Audience *</Label>
            <Input
              id="aiTargetAudience"
              value={aiInputs.targetAudience}
              onChange={(e) => handleAiInputChange('targetAudience', e.target.value)}
              placeholder="e.g., Existing customers, Newsletter subscribers"
            />
          </div>
          <div>
            <Label htmlFor="aiKeyPoints">
              Key Messages/Points * (one per line or comma-separated)
            </Label>
            <Textarea
              id="aiKeyPoints"
              value={aiInputs.keyPoints}
              onChange={(e) => handleAiInputChange('keyPoints', e.target.value)}
              rows={4}
              placeholder="e.g., - 20% off all products\n- Limited time offer\n- Free shipping over $50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aiTone">Tone *</Label>
              <Select
                value={aiInputs.tone}
                onValueChange={(value: AiContentInputs['tone']) =>
                  handleAiInputChange('tone', value)
                }
              >
                <SelectTrigger id="aiTone">
                  <SelectValue placeholder="Select Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Informal">Informal</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="aiCallToAction">
                Primary Call To Action Text (Optional)
              </Label>
              <Input
                id="aiCallToAction"
                value={aiInputs.callToAction || ''}
                onChange={(e) => handleAiInputChange('callToAction', e.target.value)}
                placeholder="e.g., Shop Now (Pre-fills from AI generator)"
              />
            </div>
          </div>
           <div>
              <Label htmlFor="aiCallToActionLink">
                CTA Link (Optional, e.g., https://yourwebsite.com/offer)
              </Label>
              <Input
                id="aiCallToActionLink"
                type="url"
                value={aiInputs.callToActionLink || ''}
                onChange={(e) => handleAiInputChange('callToActionLink', e.target.value)}
                placeholder="https://www.yourwebsite.com/your-link"
              />
            </div>
          <Button
            type="button"
            onClick={handleGenerateContent}
            disabled={
              isGeneratingContent ||
              !aiInputs.campaignGoal ||
              !aiInputs.targetAudience ||
              !aiInputs.keyPoints
            }
          >
            {isGeneratingContent && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Wand2 className="mr-2 h-4 w-4" /> Generate Email Body
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
           <CardTitle>Email Content (HTML) *</CardTitle>
            <CardDescription>
                Craft your message in the editor on the left and see a live preview on the right.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="content-editor">HTML Editor</Label>
                    <Controller
                        name="content"
                        control={control}
                        render={({ field }) => (
                        <Textarea
                            id="content-editor"
                            placeholder={`<h1>Hi {{ contact.FIRSTNAME }},</h1>...`}
                            rows={20}
                            className="min-h-[400px] font-mono text-xs"
                            {...field}
                        />
                        )}
                    />
                </div>
                <div>
                    <Label>Live Preview</Label>
                    <div
                        className="p-4 border rounded-md bg-background min-h-[400px] prose dark:prose-invert max-w-none h-full"
                        dangerouslySetInnerHTML={{ __html: watchedContent || '<p class="text-muted-foreground">Start typing to see a preview...</p>' }}
                    />
                </div>
            </div>
            {errors.content && (
                <p className="text-sm text-destructive mt-1">
                {errors.content.message}
                </p>
            )}
            <Alert variant="default" className="mt-2 text-xs">
                <Info className="h-4 w-4 text-blue-500"/>
                <AlertTitleComponent className="font-semibold text-blue-700">Important Notes:</AlertTitleComponent>
                <AlertDescription className="text-blue-600 space-y-1">
                    <p>The validation rule requires <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">{"{{ contact.FIRSTNAME }}"}</code> (with double curly braces) for Brevo personalization. The AI aims to include this. Ensure it's present, especially if manually editing.</p>
                    <p>If your email includes Calls to Action (like buttons or links from the AI generator), please ensure you update placeholder URLs (e.g., <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">href='#'</code> or <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">href='[YOUR_LINK_HERE]'</code>) with your actual website links from the "CTA Link" field above before sending!</p>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Recipients ({selectedProvider === 'brevo' ? 'Brevo List' : selectedProvider === 'sender' ? 'Sender.net Group' : 'Contact List'} IDs) *
          </CardTitle>
          <CardDescription>
            {selectedProvider === 'brevo' 
              ? 'Specify Brevo List IDs (comma-separated numbers).' 
              : selectedProvider === 'sender'
              ? 'Specify Sender.net Group IDs (comma-separated numbers).'
              : 'Specify contact list IDs (comma-separated numbers).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipientList">
              {selectedProvider === 'brevo' ? 'Brevo List IDs' : selectedProvider === 'sender' ? 'Sender.net Group IDs' : 'List IDs'} *
            </Label>
            <Controller
              name="recipients"
              control={control}
              render={({ field }) => (
                <Input
                  id="recipientList"
                  placeholder="e.g., 2, 15, 23"
                  {...field}
                />
              )}
            />
            {errors.recipients && (
              <p className="text-sm text-destructive mt-1">
                {errors.recipients.message}
              </p>
            )}
            
            {/* Show available lists */}
            {isLoadingLists && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading contact lists...
              </p>
            )}
            
            {!isLoadingLists && selectedProvider === 'brevo' && brevoLists.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Available Brevo Lists:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {brevoLists.map((list) => (
                    <li key={list.id} className="flex items-center justify-between p-1.5 border rounded-md bg-muted/30">
                      <span>
                        <strong>ID {list.id}:</strong> {list.name}
                      </span>
                      {list.totalSubscribers !== undefined && (
                        <span className="text-xs">({list.totalSubscribers} subscribers)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {!isLoadingLists && selectedProvider === 'sender' && senderLists.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Available Sender.net Groups:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {senderLists.map((list) => (
                    <li key={list.id} className="flex items-center justify-between p-1.5 border rounded-md bg-muted/30">
                      <span>
                        <strong>ID {list.id}:</strong> {list.title}
                      </span>
                      <span className="text-xs">({list.active} active)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedProvider === 'brevo' && (
              <p className="text-xs text-muted-foreground mt-1">
                Find List IDs in your Brevo account (Contacts &gt; Lists). The
                default ID ("{defaultBrevoListId}") is pre-filled from your company's API key settings.
              </p>
            )}
            
            {selectedProvider === 'sender' && (
              <p className="text-xs text-muted-foreground mt-1">
                Find Group IDs in your Sender.net account (Subscribers &gt; Groups). Enter the group ID numbers you want to send to.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/email-marketing')}
          disabled={isLoading || isSubmitting || isSending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || isSubmitting || isSending}>
          {(isLoading || isSubmitting) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditing ? (
            <>
              <Save className="mr-2 h-4 w-4" /> Update Draft
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save as Draft
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isLoading || isSubmitting || isSending || availableProviders.length === 0}
          onClick={() => {
            if (selectedProvider === 'brevo') {
              handleSendViaBrevo();
            } else if (selectedProvider === 'sender') {
              handleSendViaSender();
            }
          }}
        >
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" /> 
          {selectedProvider === 'brevo' ? 'Send via Brevo' : selectedProvider === 'sender' ? 'Send via Sender.net' : 'Send Campaign'}
        </Button>
      </CardFooter>

      <Dialog open={isTemplateBrowserOpen} onOpenChange={setIsTemplateBrowserOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
            <DialogDescription>
              Choose a pre-built template to get started quickly
            </DialogDescription>
          </DialogHeader>
          <TemplateBrowser
            filterType="email"
            onApply={handleApplyTemplate}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
