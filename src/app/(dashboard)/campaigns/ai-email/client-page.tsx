'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, RefreshCw, ArrowLeft, ArrowRight, Send, Info, Mail, CheckCircle, AlertTriangle, Settings, Users, FileText, Save, BookmarkPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { generateEmailCampaignAction } from '@/app/actions/unified-campaign-actions';
import { createAICampaignDraftAction, updateAICampaignDraftAction, getAICampaignDraftAction } from '@/app/actions/ai-campaign-draft-actions';
import { createSavedEmailTemplateAction } from '@/app/actions/saved-email-template-actions';
import { publishAICampaignAction } from '@/app/actions/publish-ai-campaign-actions';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction } from '@/app/actions/sender-actions';
import { fetchInternalEmailListsAction, type InternalEmailList } from '@/app/actions/fetch-internal-email-lists-action';
import { syncEmailListToBrevoAction, syncEmailListToSenderAction } from '@/app/actions/sync-email-list-to-provider-action';
import type { ParsedCampaignBrief, EmailContent } from '@/types/ai-campaigns';
import { getDefaultBrevoListId } from '@/lib/brevo-utils';
import { showAIContentReadyToast } from '@/lib/ai-toast-helpers';

const EXAMPLE_PROMPTS = [
  "Flash sale - 50% off everything! Ends tonight at midnight. Target all customers. Urgent tone. CTA: Shop Now",
  "New product launch: AI-powered business assistant. Professional tone. Target: small business owners. CTA: Start Free Trial",
  "Holiday special event next Friday. Friendly tone. Include early bird discount. CTA: Reserve Your Spot",
];

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

type DeliveryProvider = 'brevo' | 'sender' | 'smtp';

type WizardStage = 1 | 2 | 3;

export default function AICampaignStudioPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const { apiKeys, isLoading: isLoadingApiKeys } = useCompanyApiKeys();
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftIdFromUrl = searchParams.get('draft');
  
  const [stage, setStage] = useState<WizardStage>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [loadedFromDraft, setLoadedFromDraft] = useState(false);
  const [attemptedDraftId, setAttemptedDraftId] = useState<string | null>(null);
  
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [parsedBrief, setParsedBrief] = useState<ParsedCampaignBrief | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  
  const [emailListId, setEmailListId] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  const [selectedInternalListId, setSelectedInternalListId] = useState('');
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider | null>(null);
  const [brevoLists, setBrevoLists] = useState<BrevoList[]>([]);
  const [senderLists, setSenderLists] = useState<SenderList[]>([]);
  const [internalLists, setInternalLists] = useState<InternalEmailList[]>([]);
  const [selectedBrevoListId, setSelectedBrevoListId] = useState('__new__');
  const [selectedSenderListId, setSelectedSenderListId] = useState('');
  const [isLoadingBrevoLists, setIsLoadingBrevoLists] = useState(false);
  const [isLoadingSenderLists, setIsLoadingSenderLists] = useState(false);
  const [isLoadingInternalLists, setIsLoadingInternalLists] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const fetchBrevoLists = useCallback(async () => {
    if (!apiKeys?.brevo?.apiKey) return;
    
    setIsLoadingBrevoLists(true);
    try {
      const result = await fetchBrevoListsAction(apiKeys.brevo.apiKey);
      if (result.success && result.lists) {
        setBrevoLists(result.lists);
        if (result.lists.length > 0 && !selectedBrevoListId) {
          const defaultId = getDefaultBrevoListId(apiKeys);
          const defaultListExists = result.lists?.find(l => l.id.toString() === defaultId);
          if (defaultListExists) {
            setSelectedBrevoListId(defaultId);
          } else {
            setSelectedBrevoListId(result.lists[0].id.toString());
          }
        }
      } else {
        console.error('Failed to fetch Brevo lists:', result.error);
        toast({
          title: 'Failed to Load Brevo Lists',
          description: result.error || 'Could not load your Brevo email lists.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching Brevo lists:', error);
    } finally {
      setIsLoadingBrevoLists(false);
    }
  }, [apiKeys, toast, selectedBrevoListId]);

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
      } else {
        console.error('Failed to fetch Sender lists:', result.error);
        toast({
          title: 'Failed to Load Sender Lists',
          description: result.error || 'Could not load your Sender.net email lists.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching Sender lists:', error);
    } finally {
      setIsLoadingSenderLists(false);
    }
  }, [apiKeys, toast, selectedSenderListId]);

  const fetchInternalLists = useCallback(async () => {
    if (!appUser?.idToken) return;
    
    setIsLoadingInternalLists(true);
    try {
      const result = await fetchInternalEmailListsAction(appUser.idToken);
      if (result.success && result.lists) {
        setInternalLists(result.lists);
        if (result.lists.length > 0 && !selectedInternalListId) {
          setSelectedInternalListId(result.lists[0].id);
        }
      } else {
        console.error('Failed to fetch internal lists:', result.error);
      }
    } catch (error) {
      console.error('Error fetching internal lists:', error);
    } finally {
      setIsLoadingInternalLists(false);
    }
  }, [appUser?.idToken, selectedInternalListId]);

  useEffect(() => {
    if (stage === 3) {
      if (!loadedFromDraft) {
        setSelectedInternalListId('');
        setDeliveryProvider(null);
        setSelectedBrevoListId('');
        setSelectedSenderListId('');
      }
      fetchInternalLists();
    }
  }, [stage, loadedFromDraft]);

  useEffect(() => {
    if (stage === 3 && deliveryProvider === 'brevo' && apiKeys?.brevo?.apiKey) {
      fetchBrevoLists();
    } else if (stage === 3 && deliveryProvider === 'sender' && apiKeys?.sender?.apiKey) {
      fetchSenderLists();
    }
  }, [stage, deliveryProvider, apiKeys?.brevo?.apiKey, apiKeys?.sender?.apiKey, fetchBrevoLists, fetchSenderLists]);

  useEffect(() => {
    if (!draftIdFromUrl) {
      if (loadedFromDraft) {
        setLoadedFromDraft(false);
        setCampaignPrompt('');
        setParsedBrief(null);
        setEmailContent(null);
        setStage(1);
      }
      if (currentDraftId) setCurrentDraftId(null);
      if (attemptedDraftId) setAttemptedDraftId(null);
    } else if (draftIdFromUrl !== attemptedDraftId) {
      if (loadedFromDraft) setLoadedFromDraft(false);
    }
  }, [draftIdFromUrl, loadedFromDraft, currentDraftId, attemptedDraftId]);

  useEffect(() => {
    const loadDraftFromUrl = async () => {
      if (!draftIdFromUrl || !appUser?.idToken) return;
      if (attemptedDraftId === draftIdFromUrl) return;
      
      setAttemptedDraftId(draftIdFromUrl);
      setIsLoadingDraft(true);
      try {
        const result = await getAICampaignDraftAction({
          idToken: appUser.idToken,
          draftId: draftIdFromUrl,
        });
        
        if (result.success && result.draft) {
          const draft = result.draft;
          
          setCampaignPrompt(draft.originalPrompt || '');
          setParsedBrief(draft.parsedBrief || null);
          setEmailContent(draft.emailContent || null);
          setCurrentDraftId(draft.id);
          setLoadedFromDraft(true);
          
          if (draft.emailContent?.htmlBody && draft.emailContent?.subjectLines?.length > 0) {
            setStage(3);
            toast({
              title: 'Draft Loaded',
              description: 'Your saved draft is ready to send. Select an email list and provider to continue.',
            });
          } else {
            setStage(1);
            setLoadedFromDraft(false);
            toast({
              title: 'Draft Missing Email Content',
              description: 'This draft does not have complete email content. Please generate new content.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Draft Not Found',
            description: result.error || 'Could not load the draft. It may have been deleted.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        console.error('Error loading draft:', error);
        toast({
          title: 'Error Loading Draft',
          description: error.message || 'Failed to load draft',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingDraft(false);
      }
    };
    
    loadDraftFromUrl();
  }, [draftIdFromUrl, appUser?.idToken, loadedFromDraft, toast]);

  const selectedInternalList = useMemo(() => 
    internalLists.find(l => l.id === selectedInternalListId),
    [internalLists, selectedInternalListId]
  );

  const hasBrevoConfigured = Boolean(apiKeys?.brevo?.apiKey);
  const hasSenderConfigured = Boolean(apiKeys?.sender?.apiKey);
  const hasSmtpConfigured = Boolean(apiKeys?.smtp?.host);
  const hasAnyProvider = hasBrevoConfigured || hasSenderConfigured || hasSmtpConfigured;


  const handleGenerateCampaign = async () => {
    if (!campaignPrompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please describe your campaign to get started',
        variant: 'destructive',
      });
      return;
    }

    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to generate campaigns',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generateEmailCampaignAction(appUser.companyId, appUser.uid, campaignPrompt);
      
      if (!result) {
        toast({
          title: 'Generation Failed',
          description: 'Server action failed. Please refresh the page and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      if (!result.success || !result.data) {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Failed to generate campaign',
          variant: 'destructive',
        });
        return;
      }

      setParsedBrief(result.parsedBrief || null);
      
      setEmailContent({
        subjectLines: result.data.subjectLineSuggestions,
        selectedSubjectIndex: 0,
        htmlBody: result.data.htmlContent,
        ctaSuggestions: result.data.ctaSuggestions,
      });

      if (appUser?.idToken) {
        try {
          const draftResult = await createAICampaignDraftAction({
            idToken: appUser.idToken,
            originalPrompt: campaignPrompt,
            parsedBrief: result.parsedBrief,
            emailContent: {
              subjectLines: result.data.subjectLineSuggestions,
              selectedSubjectIndex: 0,
              htmlBody: result.data.htmlContent,
              ctaSuggestions: result.data.ctaSuggestions,
            },
            selectedChannels: ['email'], // FIX Issue 2: Mark draft as email-only
          });

          if (draftResult.success && draftResult.draft) {
            setCurrentDraftId(draftResult.draft.id);
          } else {
            console.error('Draft creation failed:', draftResult.error);
            toast({
              title: 'Warning: Draft Not Saved',
              description: draftResult.error || 'Could not auto-save your campaign. You can still review and manually save it.',
              variant: 'destructive',
            });
          }
        } catch (draftError: any) {
          console.error('Error creating draft:', draftError);
          toast({
            title: 'Warning: Draft Not Saved',
            description: 'Could not auto-save your campaign. You can still review and manually save it before publishing.',
            variant: 'destructive',
          });
        }
      }

      showAIContentReadyToast(toast, "Email Campaign", result.quotaInfo);
      
      setStage(2);
    } catch (error: any) {
      console.error('Error generating campaign:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseExample = (example: string) => {
    setCampaignPrompt(example);
  };

  const handleRegenerateCampaign = async () => {
    await handleGenerateCampaign();
  };

  const handleSaveDraft = async () => {
    if (!appUser?.idToken || !currentDraftId) return;
    
    setIsSaving(true);
    try {
      await updateAICampaignDraftAction({
        idToken: appUser.idToken,
        draftId: currentDraftId,
        parsedBrief: parsedBrief || undefined,
        emailContent: emailContent || undefined,
      });

      toast({
        title: 'Draft Saved',
        description: 'Your changes have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSaveTemplateDialog = () => {
    const defaultName = parsedBrief?.campaignGoal || 'Email Template';
    setTemplateName(defaultName);
    setTemplateDescription('');
    setSaveTemplateDialogOpen(true);
  };

  const handleSaveAsTemplate = async () => {
    if (!appUser?.idToken || !emailContent) return;
    
    if (!templateName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the template',
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
          subject: emailContent.subjectLines[emailContent.selectedSubjectIndex],
          htmlContent: emailContent.htmlBody,
          originalPrompt: campaignPrompt,
          sourceDraftId: currentDraftId || undefined,
        },
      });

      if (result.success) {
        toast({
          title: 'Template Saved!',
          description: 'You can now reuse this email design anytime without AI credits.',
        });
        setSaveTemplateDialogOpen(false);
      } else {
        toast({
          title: 'Save Failed',
          description: result.error || 'Failed to save template',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handlePublishCampaigns = async () => {
    if (!appUser?.idToken || !appUser?.companyId) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to publish campaigns',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedInternalListId) {
      toast({
        title: 'Email List Required',
        description: 'Please select an email list from your OmniFlow contacts',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryProvider) {
      toast({
        title: 'Delivery Provider Required',
        description: 'Please select how you want to send your emails (Brevo, Sender, or SMTP)',
        variant: 'destructive',
      });
      return;
    }

    let draftIdToUse = currentDraftId;
    if (!draftIdToUse) {
      try {
        const draftResult = await createAICampaignDraftAction({
          idToken: appUser.idToken,
          originalPrompt: campaignPrompt,
          parsedBrief: parsedBrief || undefined,
          emailContent: emailContent || undefined,
          selectedChannels: ['email'],
        });

        if (draftResult.success && draftResult.draft) {
          draftIdToUse = draftResult.draft.id;
          setCurrentDraftId(draftIdToUse);
        } else {
          toast({
            title: 'Cannot Publish',
            description: draftResult.error || 'Please save your campaign as a draft first before publishing.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error: any) {
        toast({
          title: 'Cannot Publish',
          description: 'Failed to save campaign. Please try saving manually first.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsPublishing(true);
    setIsSyncing(true);

    try {
      let providerListId: string | number | undefined;
      let providerListName: string | undefined;
      let syncedContactCount = 0;

      if (deliveryProvider === 'brevo') {
        if (!apiKeys?.brevo?.apiKey) {
          throw new Error('Brevo API key not configured. Please set it up in Settings.');
        }
        
        toast({
          title: 'Syncing Contacts to Brevo...',
          description: 'Please wait while we sync your contacts.',
        });

        const syncResult = await syncEmailListToBrevoAction(
          selectedInternalListId,
          appUser.companyId,
          apiKeys.brevo.apiKey,
          selectedBrevoListId && selectedBrevoListId !== '__new__' ? parseInt(selectedBrevoListId) : undefined,
          selectedBrevoListId === '__new__'
        );

        if (!syncResult.success) {
          throw new Error(syncResult.errorMessage || 'Failed to sync contacts to Brevo');
        }

        providerListId = syncResult.providerListId;
        providerListName = syncResult.providerListName || selectedInternalList?.name;
        syncedContactCount = syncResult.syncedCount;

        toast({
          title: 'Contacts Synced!',
          description: `${syncResult.syncedCount} contacts synced to Brevo${syncResult.skippedCount > 0 ? `, ${syncResult.skippedCount} skipped` : ''}.`,
        });
      } else if (deliveryProvider === 'sender') {
        if (!apiKeys?.sender?.apiKey) {
          throw new Error('Sender.net API key not configured. Please set it up in Settings.');
        }

        if (!selectedSenderListId) {
          throw new Error('Please select a Sender.net list to sync contacts to.');
        }

        toast({
          title: 'Syncing Contacts to Sender.net...',
          description: 'Please wait while we sync your contacts.',
        });

        const syncResult = await syncEmailListToSenderAction(
          selectedInternalListId,
          appUser.companyId,
          apiKeys.sender.apiKey,
          selectedSenderListId
        );

        if (!syncResult.success) {
          throw new Error(syncResult.errorMessage || 'Failed to sync contacts to Sender.net');
        }

        providerListId = syncResult.providerListId;
        providerListName = senderLists.find(l => l.id === selectedSenderListId)?.name;
        syncedContactCount = syncResult.syncedCount;

        toast({
          title: 'Contacts Synced!',
          description: `${syncResult.syncedCount} contacts synced to Sender.net${syncResult.skippedCount > 0 ? `, ${syncResult.skippedCount} skipped` : ''}.`,
        });
      } else if (deliveryProvider === 'smtp') {
        providerListId = selectedInternalListId;
        providerListName = selectedInternalList?.name;
        syncedContactCount = selectedInternalList?.contactCount || 0;
      }

      setIsSyncing(false);

      await updateAICampaignDraftAction({
        idToken: appUser.idToken,
        draftId: draftIdToUse,
        parsedBrief: parsedBrief || undefined,
        emailContent: emailContent || undefined,
        selectedChannels: ['email'],
        emailConfig: {
          provider: deliveryProvider,
          listId: String(providerListId),
          listName: providerListName || 'Email List',
          recipientCount: syncedContactCount,
          internalListId: selectedInternalListId,
          internalListName: selectedInternalList?.name,
        },
      });

      const publishResult = await publishAICampaignAction({
        idToken: appUser.idToken,
        draftId: draftIdToUse,
      });

      if (!publishResult.success) {
        toast({
          title: 'Publishing Failed',
          description: publishResult.error || 'Failed to publish campaigns',
          variant: 'destructive',
        });
        return;
      }

      if (publishResult.error) {
        toast({
          title: '⚠️ Partial Success',
          description: `Email campaign published, but: ${publishResult.error}`,
          variant: 'default',
        });
      } else {
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (confettiError) {
          console.warn('Confetti animation failed:', confettiError);
        }
        
        toast({
          title: '🎉 Email Campaign Published!',
          description: `Your campaign will be sent to ${syncedContactCount} contacts. Check delivery status to track progress.`,
        });
      }

      if (draftIdFromUrl) {
        router.replace('/campaigns/ai-email');
      }
      
      setTimeout(() => {
        setCampaignPrompt('');
        setParsedBrief(null);
        setEmailContent(null);
        setEmailListId('');
        setSelectedInternalListId('');
        setDeliveryProvider(null);
        setCurrentDraftId(null);
        setLoadedFromDraft(false);
        setAttemptedDraftId(null);
        setStage(1);
      }, 3000);

    } catch (error: any) {
      console.error('Error publishing campaigns:', error);
      toast({
        title: 'Publishing Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
      setIsSyncing(false);
    }
  };

  const progressPercentage = useMemo(() => {
    if (stage === 1) return 33;
    if (stage === 2) return 66;
    return 100;
  }, [stage]);

  const canProceedToStage2 = useMemo(() => Boolean(parsedBrief && emailContent), [parsedBrief, emailContent]);
  const canProceedToStage3 = canProceedToStage2;

  if (isLoadingDraft) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold">Loading Your Draft...</h2>
          <p className="text-muted-foreground mt-2">Preparing your saved campaign for sending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Email Campaign Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Create professional email campaigns from a single prompt using AI
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/campaigns/ai-email/saved-templates">
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Saved Templates
            </Link>
          </Button>
          <Badge variant="outline" className="text-sm">
            <span className="mr-2">🚀 BETA</span>
          </Badge>
        </div>
      </div>

      {loadedFromDraft && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <FileText className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            <strong>Using saved draft</strong> - No AI credits will be used. Select an email list and provider to send this campaign to a new audience.
            <Link href="/campaigns/ai-email/drafts" className="ml-2 underline">
              View all drafts
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Progress value={progressPercentage} className="mb-6" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className={stage >= 1 ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center ${stage >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <CardTitle className="text-lg">Describe</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card className={stage >= 2 ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center ${stage >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <CardTitle className="text-lg">Review & Edit</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card className={stage >= 3 ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center ${stage >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <CardTitle className="text-lg">Publish</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      {stage === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage 1: Describe Your Email Campaign</CardTitle>
            <CardDescription>
              Tell us about your campaign in plain language. Our AI will generate a professional email with subject lines and content ready to send.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Campaign Description</Label>
              <Textarea
                id="prompt"
                placeholder="Example: Flash sale - 50% off everything! Ends tonight. Target all customers. Urgent tone. CTA: Shop Now"
                value={campaignPrompt}
                onChange={(e) => setCampaignPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Try an example:</Label>
              <div className="grid gap-2">
                {EXAMPLE_PROMPTS.map((example, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseExample(example)}
                    className="justify-start h-auto py-2 text-left whitespace-normal"
                  >
                    <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{example}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <div />
            <Button 
              onClick={handleGenerateCampaign} 
              disabled={isGenerating || !campaignPrompt.trim()}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Campaign
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === 2 && parsedBrief && emailContent && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stage 2: Review & Customize Content</CardTitle>
                  <CardDescription>
                    Review and edit the AI-generated content for each channel
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRegenerateCampaign} disabled={isGenerating}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="bg-muted p-4 rounded-lg mb-4 space-y-2">
                <h3 className="font-semibold">Campaign Brief</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Goal:</span> {parsedBrief.campaignGoal}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audience:</span> {parsedBrief.targetAudience}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tone:</span> {parsedBrief.tone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">CTA:</span> {parsedBrief.callToAction}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Content
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Select
                      value={String(emailContent.selectedSubjectIndex)}
                      onValueChange={(value) =>
                        setEmailContent({
                          ...emailContent,
                          selectedSubjectIndex: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emailContent.subjectLines.map((subject, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body (HTML)</Label>
                    <Textarea
                      value={emailContent.htmlBody}
                      onChange={(e) =>
                        setEmailContent({ ...emailContent, htmlBody: e.target.value })
                      }
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStage(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenSaveTemplateDialog}>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save as Template
                </Button>
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button onClick={() => setStage(3)} disabled={!canProceedToStage3}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {stage === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage 3: Select Audience & Send</CardTitle>
            <CardDescription>
              Choose your contacts and delivery provider to send your AI-generated campaign
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Need SMS or WhatsApp?</strong> For SMS and WhatsApp campaigns, use the manual campaign tools with your approved message templates. AI Campaign Studio is email-only because SMS and WhatsApp require pre-approved templates that AI cannot generate.
              </AlertDescription>
            </Alert>

            {/* Step 1: Select Your Audience (Internal List) */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="rounded-full w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <Label className="text-base font-medium">Select Your Audience</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose which contacts from your OmniFlow email lists to send this campaign to.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email List</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchInternalLists}
                    disabled={isLoadingInternalLists}
                    className="h-8"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingInternalLists ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {isLoadingInternalLists ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading your email lists...</span>
                  </div>
                ) : internalLists.length === 0 ? (
                  <div className="p-4 border rounded-md bg-muted text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No email lists found. Create one first to continue.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/campaigns/email-lists">Create Email List</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select value={selectedInternalListId} onValueChange={setSelectedInternalListId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select email list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {internalLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.contactCount.toLocaleString()} contacts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedInternalList && (
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800 dark:text-green-200">
                          <strong>{selectedInternalList.contactCount.toLocaleString()}</strong> contacts will receive this campaign
                        </span>
                      </div>
                    )}
                    
                    {selectedInternalList?.contactCount === 0 && (
                      <div className="p-3 border border-amber-200 rounded-md bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          This list has 0 contacts. Add contacts before publishing.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Step 2: Choose Delivery Provider */}
            {selectedInternalListId && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="rounded-full w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium">
                    2
                  </div>
                  <Label className="text-base font-medium">Choose Delivery Channel</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which email service to use for sending. Contacts will be synced automatically.
                </p>

                {!hasAnyProvider ? (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="space-y-2">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        No email providers configured. Set up at least one to send campaigns.
                      </p>
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/settings?tab=integrations">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Email Provider
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Brevo Option */}
                    <button
                      type="button"
                      onClick={() => setDeliveryProvider('brevo')}
                      disabled={!hasBrevoConfigured}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryProvider === 'brevo' 
                          ? 'border-primary bg-primary/5' 
                          : hasBrevoConfigured 
                            ? 'border-border hover:border-primary/50' 
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">Brevo</h4>
                        {hasBrevoConfigured ? (
                          deliveryProvider === 'brevo' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Badge variant="outline" className="text-xs">Connected</Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">Not Set Up</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Send via Brevo (Sendinblue) with tracking & analytics
                      </p>
                    </button>

                    {/* Sender.net Option */}
                    <button
                      type="button"
                      onClick={() => setDeliveryProvider('sender')}
                      disabled={!hasSenderConfigured}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryProvider === 'sender' 
                          ? 'border-primary bg-primary/5' 
                          : hasSenderConfigured 
                            ? 'border-border hover:border-primary/50' 
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">Sender.net</h4>
                        {hasSenderConfigured ? (
                          deliveryProvider === 'sender' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Badge variant="outline" className="text-xs">Connected</Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">Not Set Up</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Send via Sender.net with delivery reports
                      </p>
                    </button>

                    {/* SMTP Option */}
                    <button
                      type="button"
                      onClick={() => setDeliveryProvider('smtp')}
                      disabled={!hasSmtpConfigured}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryProvider === 'smtp' 
                          ? 'border-primary bg-primary/5' 
                          : hasSmtpConfigured 
                            ? 'border-border hover:border-primary/50' 
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">Custom SMTP</h4>
                        {hasSmtpConfigured ? (
                          deliveryProvider === 'smtp' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Badge variant="outline" className="text-xs">Connected</Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">Not Set Up</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Send via your own SMTP server
                      </p>
                    </button>
                  </div>
                )}

                {/* Brevo List Selection (optional - for syncing to existing list) */}
                {deliveryProvider === 'brevo' && hasBrevoConfigured && (
                  <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
                    <Label className="text-sm">Sync to Brevo List (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to create a new list, or select an existing Brevo list to sync contacts to.
                    </p>
                    {isLoadingBrevoLists ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading Brevo lists...</span>
                      </div>
                    ) : (
                      <Select value={selectedBrevoListId} onValueChange={setSelectedBrevoListId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Create new list (recommended)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">Create new list</SelectItem>
                          {brevoLists.map((list) => (
                            <SelectItem key={list.id} value={String(list.id)}>
                              {list.name} ({list.totalSubscribers.toLocaleString()} existing)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Sender.net List Selection (required - must sync to existing list) */}
                {deliveryProvider === 'sender' && hasSenderConfigured && (
                  <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
                    <Label className="text-sm">Sender.net Target List *</Label>
                    <p className="text-xs text-muted-foreground">
                      Select which Sender.net list to sync your contacts to.
                    </p>
                    {isLoadingSenderLists ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading Sender.net lists...</span>
                      </div>
                    ) : senderLists.length === 0 ? (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                          No lists found in Sender.net. Please create a list in your Sender.net dashboard first.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={selectedSenderListId} onValueChange={setSelectedSenderListId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sender.net list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {senderLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} ({list.total.toLocaleString()} existing)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* SMTP Info */}
                {deliveryProvider === 'smtp' && hasSmtpConfigured && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Emails will be sent directly via your SMTP server. No contact sync required.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStage(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Review
            </Button>
            
            <Button 
              onClick={handlePublishCampaigns} 
              disabled={
                isPublishing || 
                isSyncing ||
                !selectedInternalListId || 
                !deliveryProvider ||
                (deliveryProvider === 'sender' && !selectedSenderListId)
              }
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Contacts...
                </>
              ) : isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Sync & Publish Campaign
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Reusable Template</DialogTitle>
            <DialogDescription>
              Save this email design as a template. You can reuse it later without consuming AI credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Flash Sale Announcement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="e.g., Great for weekend sales promotions"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="link" asChild className="px-0">
              <Link href="/campaigns/ai-email/saved-templates">
                View Saved Templates
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(false)} disabled={isSavingTemplate}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsTemplate} disabled={isSavingTemplate || !templateName.trim()}>
                {isSavingTemplate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
