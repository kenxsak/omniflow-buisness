"use client";

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  MessageCircle,
  Plus,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Eye,
  Trash2,
  RefreshCw,
  Sparkles,
  Settings,
  ArrowRight,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import type { WhatsAppCampaign, WhatsAppRecipient } from '@/types/messaging';
import { getWhatsAppCampaigns, getWhatsAppCampaignRecipients, addWhatsAppCampaign, deleteWhatsAppCampaign } from '@/lib/messaging-campaigns-data';
import { sendBulkWhatsAppViaAiSensyAction } from '@/app/actions/aisensy-actions';
import { getMetaWhatsAppTemplatesAction, sendBulkWhatsAppViaMetaAction } from '@/app/actions/meta-whatsapp-actions';
import { getAuthkeyTemplatesAction, sendBulkWhatsAppViaAuthkeyAction } from '@/app/actions/authkey-actions';
import { getGupshupTemplatesAction, sendBulkWhatsAppViaGupshupAction } from '@/app/actions/gupshup-actions';
import { getMSG91WhatsAppTemplatesAction, sendBulkWhatsAppViaMSG91Action } from '@/app/actions/msg91-whatsapp-actions';
import { getFast2SMSWhatsAppTemplatesAction, sendBulkWhatsAppViaFast2SMSAction } from '@/app/actions/fast2sms-whatsapp-actions';
import { getWhatsAppLists, getWhatsAppContacts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function WhatsAppBulkCampaignsPage() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create'>('campaigns');
  
  // Campaigns list
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  // Create campaign
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'aisensy' | 'meta' | 'authkey' | 'gupshup' | 'msg91WhatsApp' | 'fast2smsWhatsApp'>('authkey');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [whatsappLists, setWhatsappLists] = useState<WhatsAppList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [templateType, setTemplateType] = useState<'text' | 'media'>('text');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  
  // Campaign details
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<WhatsAppRecipient[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Confetti celebration function
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // Load campaigns on mount
  useEffect(() => {
    if (appUser?.companyId) {
      loadCampaigns();
      loadWhatsAppLists();
    }
  }, [appUser?.companyId]);

  const loadCampaigns = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingCampaigns(true);
    try {
      const campaignsList = await getWhatsAppCampaigns(appUser.companyId);
      setCampaigns(campaignsList);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const loadWhatsAppLists = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    try {
      const lists = await getWhatsAppLists(appUser.companyId);
      setWhatsappLists(lists);
    } catch (error) {
      console.error('Error loading WhatsApp lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadTemplates = async () => {
    if (!appUser?.idToken) return;
    setIsLoadingTemplates(true);
    try {
      if (selectedPlatform === 'meta') {
        const result = await getMetaWhatsAppTemplatesAction(appUser.idToken);
        if (result.success && result.templates) {
          const approvedTemplates = result.templates.filter((t: any) => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
          
          if (approvedTemplates.length === 0 && result.templates.length > 0) {
            toast({
              title: 'Waiting for Approval',
              description: `You have ${result.templates.length} message design(s) waiting for Meta approval. This usually takes 1-24 hours.`,
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0) {
            toast({
              title: 'No Templates Found',
              description: 'No approved templates found in your Meta WhatsApp account. Please create and approve templates in Meta Business Manager first.',
              variant: 'default',
            });
          }
        } else {
          setTemplates([]);
          // Show the actual error message from Meta API
          toast({
            title: 'Meta WhatsApp Connection Issue',
            description: result.error || 'Could not load templates from Meta. Please check your API credentials in Settings.',
            variant: 'destructive',
          });
        }
      } else if (selectedPlatform === 'gupshup') {
        const result = await getGupshupTemplatesAction(appUser.idToken);
        if (result.success && result.templates) {
          const approvedTemplates = result.templates.filter((t: any) => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
          
          if (approvedTemplates.length === 0 && result.templates.length > 0) {
            toast({
              title: 'Waiting for Approval',
              description: `You have ${result.templates.length} message design(s) waiting for approval. This usually takes 1-24 hours.`,
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0) {
            toast({
              title: 'No Templates Found',
              description: 'No approved templates found in your Gupshup account. Please create and approve templates in your Gupshup dashboard first.',
              variant: 'default',
            });
          }
        } else {
          setTemplates([]);
          
          // Check if it's a "not configured" error vs actual API error
          const isNotConfigured = result.error?.includes('not configured') || 
                                  result.error?.includes('Please add') ||
                                  result.error?.includes('not found');
          
          // Only show destructive toast if credentials ARE configured but failing
          // Show friendly setup message if not configured at all
          if (isNotConfigured) {
            toast({
              title: 'Gupshup Setup Required',
              description: 'Connect your Gupshup account in Settings → API Integrations to load templates.',
              variant: 'default',
            });
          } else {
            // Actual error with configured credentials - show as warning, not destructive
            toast({
              title: 'Could not load templates',
              description: result.error || 'Please verify your Gupshup API Key and App Name in Settings.',
              variant: 'default',
            });
          }
        }
      } else if (selectedPlatform === 'aisensy') {
        // AiSensy doesn't have a templates fetch API
        // Templates must be created in AiSensy dashboard and referenced by campaign name
        setTemplates([]);
        toast({
          title: 'Manual Template Entry',
          description: 'AiSensy requires manual template entry. Create your template in AiSensy dashboard first, then enter the template name below.',
          variant: 'default',
        });
      } else if (selectedPlatform === 'authkey') {
        // Fetch templates from WMart CPaaS
        const result = await getAuthkeyTemplatesAction(appUser.idToken);
        if (result.success && result.templates) {
          const approvedTemplates = result.templates.filter((t: any) => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
          
          // Show helpful toast about templates and media
          if (approvedTemplates.length > 0) {
            const mediaTemplates = approvedTemplates.filter((t: any) => 
              t.temp_header_type === 'IMAGE' || t.temp_header_type === 'VIDEO' || t.temp_header_type === 'DOCUMENT'
            );
            toast({
              title: `${approvedTemplates.length} Template(s) Loaded`,
              description: mediaTemplates.length > 0 
                ? `Found ${mediaTemplates.length} media template(s). For media templates, paste the image/video URL from your WMart CPaaS Media Gallery.`
                : 'Select a template and choose your recipient list to send.',
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0 && result.templates.length > 0) {
            toast({
              title: 'Waiting for Approval',
              description: `You have ${result.templates.length} template(s) waiting for WhatsApp approval. This usually takes 1-24 hours.`,
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0) {
            toast({
              title: 'No Templates Found',
              description: 'Create templates at cpaas.wmart.in → WhatsApp → Templates. Use {{1}} for contact name variable.',
              variant: 'default',
            });
          }
        } else {
          setTemplates([]);
          
          // Check if it's a "not configured" error
          const isNotConfigured = result.error?.includes('not configured') || 
                                  result.error?.includes('Please add') ||
                                  result.error?.includes('API Key');
          
          if (isNotConfigured) {
            toast({
              title: 'WMart CPaaS Setup Required',
              description: 'Connect your WMart CPaaS account in Settings → API Integrations. Get your API key from cpaas.wmart.in',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Could not load templates',
              description: result.error || 'Please verify your WMart CPaaS API Key in Settings.',
              variant: 'default',
            });
          }
        }
      } else if (selectedPlatform === 'msg91WhatsApp') {
        const result = await getMSG91WhatsAppTemplatesAction(appUser.idToken);
        if (result.success && result.templates) {
          const approvedTemplates = result.templates.filter((t: any) => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
          
          if (approvedTemplates.length === 0 && result.templates.length > 0) {
            toast({
              title: 'Waiting for Approval',
              description: `You have ${result.templates.length} template(s) waiting for WhatsApp approval. This usually takes 1-24 hours.`,
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0) {
            toast({
              title: 'No Templates Found',
              description: 'No approved templates found in your MSG91 WhatsApp account. Please create and approve templates in MSG91 dashboard first.',
              variant: 'default',
            });
          }
        } else {
          setTemplates([]);
          toast({
            title: 'MSG91 WhatsApp Connection Issue',
            description: result.error || 'Could not load templates from MSG91. Please check your API credentials in Settings.',
            variant: 'destructive',
          });
        }
      } else if (selectedPlatform === 'fast2smsWhatsApp') {
        const result = await getFast2SMSWhatsAppTemplatesAction(appUser.idToken);
        if (result.success && result.templates) {
          const approvedTemplates = result.templates.filter((t: any) => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
          
          if (approvedTemplates.length === 0 && result.templates.length > 0) {
            toast({
              title: 'Waiting for Approval',
              description: `You have ${result.templates.length} template(s) waiting for WhatsApp approval. This usually takes 1-24 hours.`,
              variant: 'default',
            });
          } else if (approvedTemplates.length === 0) {
            toast({
              title: 'No Templates Found',
              description: 'No approved templates found in your Fast2SMS WhatsApp account. Please create and approve templates in Fast2SMS dashboard first.',
              variant: 'default',
            });
          }
        } else {
          setTemplates([]);
          toast({
            title: 'Fast2SMS WhatsApp Connection Issue',
            description: result.error || 'Could not load templates from Fast2SMS. Please check your API credentials in Settings.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Connection Issue',
        description: 'Could not load your message designs. Please check your connection in Settings.',
        variant: 'destructive',
      });
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'create' && appUser?.idToken) {
      loadTemplates();
      setSelectedTemplate(''); // Reset template when platform changes
    }
  }, [activeTab, appUser?.idToken, selectedPlatform]);

  const handleCreateCampaign = async () => {
    if (!appUser?.companyId || !appUser?.uid || !appUser?.idToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create campaigns',
        variant: 'destructive',
      });
      return;
    }

    if (!campaignName.trim()) {
      toast({
        title: 'Campaign Name Required',
        description: 'Please enter a campaign name',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: 'Message Design Required',
        description: 'Please choose a message design to send',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedListId) {
      toast({
        title: 'Recipients Required',
        description: 'Please select a contact list',
        variant: 'destructive',
      });
      return;
    }

    // Gupshup-specific validation: phone number is required
    if (selectedPlatform === 'gupshup' && !company?.apiKeys?.gupshup?.phoneNumber) {
      toast({
        title: 'Phone Number Required',
        description: 'Please add your Business WhatsApp Phone Number in Settings → API Integrations → Gupshup before sending campaigns.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Load contacts from selected list
      const contacts = await getWhatsAppContacts(selectedListId, appUser.companyId);
      
      if (contacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'The selected list has no contacts',
          variant: 'destructive',
        });
        return;
      }

      // Convert contacts to recipients
      const recipients: WhatsAppRecipient[] = contacts.map(contact => ({
        phone: contact.phoneNumber,
        name: contact.name,
        status: 'pending',
      }));

      // Send bulk campaign via selected platform
      let result;
      if (selectedPlatform === 'aisensy') {
        result = await sendBulkWhatsAppViaAiSensyAction({
          idToken: appUser.idToken,
          campaignName: selectedTemplate, // For AiSensy, template = campaign name
          recipients,
        });
      } else if (selectedPlatform === 'meta') {
        result = await sendBulkWhatsAppViaMetaAction({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          languageCode: 'en',
          recipients: recipients.map(r => ({
            phone: r.phone,
            parameters: []
          })),
        });
      } else if (selectedPlatform === 'authkey') {
        result = await sendBulkWhatsAppViaAuthkeyAction(appUser.idToken, {
          templateName: selectedTemplate,
          templateType: templateType,
          headerImageUrl: templateType === 'media' ? headerImageUrl : undefined,
          recipients: recipients.map(r => ({
            phone: r.phone,
            parameters: r.name ? [r.name] : []
          })),
        });
      } else if (selectedPlatform === 'gupshup') {
        result = await sendBulkWhatsAppViaGupshupAction({
          idToken: appUser.idToken,
          source: company.apiKeys.gupshup.phoneNumber,
          templateId: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            params: []
          })),
        });
      } else if (selectedPlatform === 'msg91WhatsApp') {
        result = await sendBulkWhatsAppViaMSG91Action({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          languageCode: 'en',
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            parameters: r.name ? [r.name] : []
          })),
        });
      } else if (selectedPlatform === 'fast2smsWhatsApp') {
        result = await sendBulkWhatsAppViaFast2SMSAction({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            parameters: r.name ? [r.name] : []
          })),
        });
      } else {
        throw new Error('Invalid platform selected');
      }

      console.log('Campaign send result:', { platform: selectedPlatform, success: result.success, error: result.error, result });

      if (result.success) {
        // Update recipient statuses based on API response
        const failedPhones = new Set(result.failedRecipients?.map(f => f.phone) || []);
        const updatedRecipients = recipients.map(recipient => ({
          ...recipient,
          status: failedPhones.has(recipient.phone) ? ('failed' as const) : ('sent' as const),
        }));

        const successCount = recipients.length - failedPhones.size;
        const failedCount = failedPhones.size;

        // Find template name for display (selectedTemplate is now UUID for platforms with dropdown)
        const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);
        const templateNameForDisplay = selectedTemplateObj ? (selectedTemplateObj.elementName || selectedTemplateObj.name) : selectedTemplate;

        // Save campaign to Firestore
        const campaign: Omit<WhatsAppCampaign, 'id' | 'createdAt'> = {
          companyId: appUser.companyId,
          name: campaignName,
          platform: selectedPlatform,
          templateId: selectedTemplate,
          templateName: templateNameForDisplay,
          recipients: updatedRecipients,
          status: 'completed',
          createdBy: appUser.uid,
          sentAt: new Date().toISOString(),
          stats: {
            total: recipients.length,
            sent: successCount,
            delivered: 0,
            read: 0,
            failed: failedCount,
            replied: 0,
          },
        };

        await addWhatsAppCampaign(campaign);

        // Trigger confetti celebration
        triggerConfetti();

        toast({
          title: 'Campaign Sent Successfully!',
          description: `Sent to ${successCount} contacts${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
        });

        // Reset form and switch to campaigns tab
        setCampaignName('');
        setSelectedTemplate('');
        setSelectedListId('');
        setActiveTab('campaigns');
        loadCampaigns();
      } else {
        // Extract error details with better fallback handling
        const errorDetails = result.error || 
                            (typeof result === 'object' && JSON.stringify(result) !== '{}' ? JSON.stringify(result) : null) ||
                            'Campaign sending failed. Please check your API configuration and try again.';
        
        console.error('Campaign send failed:', { 
          platform: selectedPlatform, 
          error: errorDetails, 
          fullResult: result,
          recipients: recipients.length 
        });
        
        let userFriendlyMessage = errorDetails;
        let actionMessage = '';

        // Platform-specific error handling
        if (selectedPlatform === 'aisensy') {
          if (errorDetails.includes('not configured') || errorDetails.includes('API key')) {
            userFriendlyMessage = 'AiSensy is not connected to your account';
            actionMessage = 'Go to Settings → API Integrations and add your AiSensy API key';
          } else if (errorDetails.includes('campaign') || errorDetails.includes('Campaign')) {
            userFriendlyMessage = `Campaign "${selectedTemplate}" not found in your AiSensy account`;
            actionMessage = 'Log in to your AiSensy dashboard and create an API campaign with this exact name';
          } else if (errorDetails.includes('template')) {
            userFriendlyMessage = 'Template issue with AiSensy campaign';
            actionMessage = 'Verify the campaign exists and is properly configured in AiSensy';
          } else if (errorDetails.includes('All messages failed')) {
            userFriendlyMessage = errorDetails;
            actionMessage = 'Check the campaign name matches exactly and your phone numbers have country codes';
          }
        }

        // Generic error messages
        if (errorDetails.includes('Network') || errorDetails.includes('fetch')) {
          userFriendlyMessage = 'Network error connecting to ' + selectedPlatform.toUpperCase();
          actionMessage = 'Check your internet connection and try again';
        }

        throw new Error(userFriendlyMessage + (actionMessage ? '. ' + actionMessage : ''));
      }
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      
      const errorMessage = error.message || 'Failed to send campaign';
      const shouldShowDiagnostics = 
        errorMessage.includes('not configured') || 
        errorMessage.includes('not connected') ||
        errorMessage.includes('API') ||
        errorMessage.includes('template') ||
        errorMessage.includes('campaign');

      toast({
        title: 'Campaign Failed',
        description: (
          <div className="space-y-2">
            <p>{errorMessage}</p>
            {shouldShowDiagnostics && (
              <Link href="/whatsapp-diagnostics" className="text-sm underline">
                Run diagnostics to troubleshoot →
              </Link>
            )}
          </div>
        ),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleViewCampaign = async (campaign: WhatsAppCampaign) => {
    if (!appUser?.companyId) return;
    
    setSelectedCampaign(campaign);
    setShowDetailsDialog(true);
    setIsLoadingRecipients(true);
    
    try {
      const recipients = await getWhatsAppCampaignRecipients(appUser.companyId, campaign.id);
      setCampaignRecipients(recipients);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign recipients',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!appUser?.companyId) return;
    
    try {
      await deleteWhatsAppCampaign(appUser.companyId, campaignId);
      toast({
        title: 'Campaign Deleted',
        description: 'Campaign has been removed',
      });
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: WhatsAppCampaign['status']) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, icon: Clock },
      scheduled: { variant: 'default' as const, icon: Clock },
      sending: { variant: 'default' as const, icon: Loader2 },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle
          title="Send to Many People"
          subtitle="Send WhatsApp messages to hundreds or thousands of contacts at once"
          icon={MessageCircle}
        />
        <Button asChild>
          <Link href="/campaigns/ai-email">
            <Sparkles className="mr-2 h-4 w-4" /> Create with AI
          </Link>
        </Button>
      </div>

      {/* Welcome Tip for First-Time Users */}
      {campaigns.length === 0 && !isLoadingCampaigns && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Quick Start Guide</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2 mt-2">
              <p className="text-sm">To send your first WhatsApp message to many people:</p>
              <ol className="text-sm space-y-1 ml-4 list-decimal">
                <li>Choose your platform (Gupshup, WMart CPaaS, or AiSensy) and connect it in Settings</li>
                <li>Create a list of contacts in WhatsApp Marketing</li>
                <li>Come back here and click "Create Campaign" to send</li>
              </ol>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button asChild className="min-h-11" variant="outline">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Set Up Connection
                  </Link>
                </Button>
                <Button asChild className="min-h-11" variant="outline">
                  <Link href="/whatsapp-marketing">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Contacts
                  </Link>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Diagnostics Tool Alert */}
      {campaigns.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Having trouble sending messages?</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span>Use the diagnostics tool to test your WhatsApp connection and find issues.</span>
            <Link href="/whatsapp-diagnostics">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Run Diagnostics
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'campaigns' | 'create')}>
        <TabsList>
          <TabsTrigger value="campaigns">
            <Users className="h-4 w-4 mr-2" />
            My Campaigns
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign History</CardTitle>
                  <CardDescription>
                    View and manage your WhatsApp bulk campaigns
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadCampaigns}
                  disabled={isLoadingCampaigns}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCampaigns ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCampaigns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first WhatsApp bulk campaign to get started
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Message Design</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Recipients</TableHead>
                          <TableHead>Delivered</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>{campaign.templateName}</TableCell>
                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                            <TableCell>{campaign.stats.total}</TableCell>
                            <TableCell>
                              {campaign.stats.delivered} / {campaign.stats.sent}
                            </TableCell>
                            <TableCell>
                              {format(new Date(campaign.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10"
                                  onClick={() => handleViewCampaign(campaign)}
                                  aria-label="View campaign"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10"
                                  onClick={() => handleDeleteCampaign(campaign.id)}
                                  aria-label="Delete campaign"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-3 sm:space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Create WhatsApp Campaign</CardTitle>
              <CardDescription className="text-sm">
                Send a WhatsApp message to many contacts at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              {/* Platform Selector */}
              <div className="space-y-2">
                <Label>Select WhatsApp Platform</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('authkey')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'authkey' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap">
                        WMart CPaaS
                        <Badge variant="default" className="text-[10px] sm:text-xs bg-green-600">Recommended</Badge>
                      </h4>
                      {selectedPlatform === 'authkey' && company?.apiKeys?.authkey && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'authkey' && !company?.apiKeys?.authkey && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      Our multi-channel CPaaS supporting WhatsApp, SMS, Email, and Voice in one account
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('meta')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'meta' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap">
                        Meta (Direct) 
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">Official API</Badge>
                      </h4>
                      {selectedPlatform === 'meta' && company?.apiKeys?.metaWhatsApp && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'meta' && !company?.apiKeys?.metaWhatsApp && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      Official WhatsApp Business API with best deliverability and reliability
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('aisensy')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'aisensy' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                        AiSensy
                      </h4>
                      {selectedPlatform === 'aisensy' && company?.apiKeys?.aisensy && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'aisensy' && !company?.apiKeys?.aisensy && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      AI-powered WhatsApp platform with built-in chatbots and marketing automation
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('gupshup')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'gupshup' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap">
                        Gupshup
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">Enterprise</Badge>
                      </h4>
                      {selectedPlatform === 'gupshup' && company?.apiKeys?.gupshup && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'gupshup' && !company?.apiKeys?.gupshup && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      Enterprise-grade platform with advanced automation, trusted by Fortune 500 companies
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('msg91WhatsApp')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'msg91WhatsApp' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                        MSG91 WhatsApp
                      </h4>
                      {selectedPlatform === 'msg91WhatsApp' && company?.apiKeys?.msg91WhatsApp && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'msg91WhatsApp' && !company?.apiKeys?.msg91WhatsApp && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      Affordable WhatsApp Business API for India with pay-as-you-go pricing
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('fast2smsWhatsApp')}
                    className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPlatform === 'fast2smsWhatsApp' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                        Fast2SMS WhatsApp
                      </h4>
                      {selectedPlatform === 'fast2smsWhatsApp' && company?.apiKeys?.fast2smsWhatsApp && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                      )}
                      {selectedPlatform === 'fast2smsWhatsApp' && !company?.apiKeys?.fast2smsWhatsApp && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      Zero setup fee WhatsApp platform, pay only for delivered messages
                    </p>
                  </button>
                </div>
                
                {/* AiSensy Not Connected Alert */}
                {selectedPlatform === 'aisensy' && !company?.apiKeys?.aisensy && (
                  <Alert className="mt-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">AiSensy Setup Required</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        To send WhatsApp campaigns, you need to connect your AiSensy account first.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button asChild className="w-full sm:w-auto" size="sm">
                          <Link href="/settings?tab=integrations">
                            <Settings className="h-4 w-4 mr-2" />
                            Set Up AiSensy Connection
                          </Link>
                        </Button>
                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          <p className="font-medium">You'll need:</p>
                          <ul className="list-disc ml-4">
                            <li>Your AiSensy API Key (from Dashboard → Project → Manage Page)</li>
                            <li>Optional: A default campaign name you've already created in AiSensy</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Meta Not Connected Alert */}
                {selectedPlatform === 'meta' && !company?.apiKeys?.metaWhatsApp && (
                  <Alert className="mt-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">Meta WhatsApp Setup Required</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        To use Meta's WhatsApp Cloud API, you need to connect your Meta Business account first.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button asChild className="w-full sm:w-auto" size="sm">
                          <Link href="/settings?tab=integrations">
                            <Settings className="h-4 w-4 mr-2" />
                            Set Up Meta WhatsApp
                          </Link>
                        </Button>
                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          <p className="font-medium">You'll need from Meta Business Manager:</p>
                          <ul className="list-disc ml-4">
                            <li>Phone Number ID (from WhatsApp → API Setup)</li>
                            <li>Permanent Access Token (never expires)</li>
                            <li>Optional: WABA ID (for template management)</li>
                          </ul>
                          <p className="font-medium mt-2">How to get these:</p>
                          <ol className="list-decimal ml-4">
                            <li>Go to Meta Business Manager</li>
                            <li>Navigate to WhatsApp → API Setup</li>
                            <li>Copy Phone Number ID and create Access Token</li>
                          </ol>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* WMart CPaaS Not Connected Alert */}
                {selectedPlatform === 'authkey' && !company?.apiKeys?.authkey && (
                  <Alert className="mt-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">WMart CPaaS Setup Required</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        To use our multi-channel CPaaS, you need to connect your WMart CPaaS account first.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button asChild className="w-full sm:w-auto" size="sm">
                          <Link href="/settings?tab=integrations">
                            <Settings className="h-4 w-4 mr-2" />
                            Set Up WMart CPaaS Connection
                          </Link>
                        </Button>
                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          <p className="font-medium">You'll need:</p>
                          <ul className="list-disc ml-4">
                            <li>Your WMart CPaaS API Key from <a href="https://cpaas.wmart.in" target="_blank" className="underline">cpaas.wmart.in</a></li>
                            <li>Get free credit when you sign up at <a href="https://wmart.in/cpaas/" target="_blank" className="underline">wmart.in/cpaas</a></li>
                            <li>Same key works for WhatsApp, SMS, Email, and Voice!</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* WMart CPaaS Connected - Usage Guide */}
                {selectedPlatform === 'authkey' && company?.apiKeys?.authkey && (
                  <Alert className="mt-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900 dark:text-blue-100">WMart CPaaS - Quick Guide</AlertTitle>
                    <AlertDescription>
                      <div className="text-xs space-y-3 text-blue-800 dark:text-blue-200 mt-2">
                        <div>
                          <p className="font-semibold mb-1">📝 Creating Templates with Variables:</p>
                          <ul className="list-disc ml-4 space-y-1">
                            <li>Go to <a href="https://cpaas.wmart.in" target="_blank" className="underline hover:text-blue-600">cpaas.wmart.in</a> → WhatsApp → Templates</li>
                            <li>Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{1}}'}</code> in your template for contact name (e.g., "Hi {'{{1}}'}, your order is ready!")</li>
                            <li>Keep it simple: 1 variable for name works best for sales & marketing</li>
                            <li>OmniFlow automatically replaces <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{1}}'}</code> with each contact's name</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">📷 Sending Images/Videos/Documents:</p>
                          <ul className="list-disc ml-4 space-y-1">
                            <li>Create a <strong>Media Template</strong> in WMart CPaaS with IMAGE/VIDEO/DOCUMENT header</li>
                            <li>Upload your media to WMart CPaaS Media Gallery first</li>
                            <li>Copy the media URL (starts with https://wpgallery.s3...)</li>
                            <li>Paste the URL once - it will be saved for future campaigns!</li>
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                          <p className="font-semibold mb-1">⚠️ Media Limits:</p>
                          <span className="text-[11px]">Image: 5MB (JPEG/PNG) | Video: 16MB (MP4) | Document: 100MB (PDF)</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Gupshup Not Connected Alert */}
                {selectedPlatform === 'gupshup' && !company?.apiKeys?.gupshup && (
                  <Alert className="mt-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">Gupshup Setup Required</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        To use Gupshup's enterprise platform, you need to connect your Gupshup account first.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button asChild className="w-full sm:w-auto" size="sm">
                          <Link href="/settings?tab=integrations">
                            <Settings className="h-4 w-4 mr-2" />
                            Set Up Gupshup Connection
                          </Link>
                        </Button>
                        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          <p className="font-medium">You'll need from your Gupshup dashboard:</p>
                          <ul className="list-disc ml-4">
                            <li>Gupshup API Key (Settings → API Keys)</li>
                            <li>Your WhatsApp Business App Name</li>
                            <li>Business WhatsApp Phone Number (with country code)</li>
                            <li>Approved message templates for campaigns</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignName">
                  {selectedPlatform === 'aisensy' ? 'Campaign Label (for your records)' : 'Campaign Name'}
                </Label>
                <Input
                  id="campaignName"
                  placeholder={selectedPlatform === 'aisensy' ? 'e.g., Diwali Campaign 2025' : 'e.g., Summer Sale 2025'}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
                {selectedPlatform === 'aisensy' && (
                  <p className="text-xs text-muted-foreground">
                    This is just for your tracking in OmniFlow - not sent to AiSensy
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">
                  {selectedPlatform === 'meta' || selectedPlatform === 'gupshup' ? 'Message Design' : 
                   selectedPlatform === 'authkey' ? 'Template Name' :
                   selectedPlatform === 'msg91WhatsApp' ? 'Template Name' :
                   selectedPlatform === 'fast2smsWhatsApp' ? 'Template Name' : 
                   'AiSensy API Campaign Name'}
                </Label>
                {selectedPlatform === 'meta' || selectedPlatform === 'gupshup' || (selectedPlatform === 'authkey' && templates.length > 0) ? (
                  <>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Choose a message design" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingTemplates ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                        ) : templates.length === 0 ? (
                          <div className="p-4 text-sm">
                            <p className="text-muted-foreground mb-2">No message designs found.</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedPlatform === 'gupshup'
                                ? 'Set up Gupshup in Settings to load your approved message templates.'
                                : selectedPlatform === 'authkey'
                                ? 'Set up WMart CPaaS in Settings to load your approved message templates.'
                                : 'Set up Meta WhatsApp in Settings to load your approved message templates.'}
                            </p>
                          </div>
                        ) : (
                          templates.map((template) => (
                            <SelectItem key={template.id || template.name} value={template.id || template.name}>
                              {template.elementName || template.name} {template.id ? `(${template.id})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedPlatform === 'authkey' && (
                      <>
                        <div className="space-y-2 mt-3">
                          <Label htmlFor="templateType">Template Type</Label>
                          <Select value={templateType} onValueChange={(v) => setTemplateType(v as 'text' | 'media')}>
                            <SelectTrigger id="templateType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Template</SelectItem>
                              <SelectItem value="media">Media Template (with image/video)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {templateType === 'media' && (
                          <div className="space-y-3 mt-3">
                            <Label htmlFor="headerImage">Header Image/Video URL</Label>
                            <Input
                              id="headerImage"
                              placeholder="https://wpgallery.s3.ap-south-1.amazonaws.com/gallery/..."
                              value={headerImageUrl}
                              onChange={(e) => setHeaderImageUrl(e.target.value)}
                            />
                            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">📷 How to Send Images with WMart CPaaS</p>
                                <div className="text-xs space-y-2 text-blue-800 dark:text-blue-200">
                                  <p className="font-medium">Getting your Media URL:</p>
                                  <ol className="list-decimal ml-4 space-y-1.5">
                                    <li>Log into <a href="https://cpaas.wmart.in" target="_blank" className="underline hover:text-blue-600">WMart CPaaS Dashboard</a></li>
                                    <li>Go to <strong>WhatsApp → Templates</strong></li>
                                    <li>Find your approved media template</li>
                                    <li>Click on the template to view details</li>
                                    <li>Copy the <strong>Header Media URL</strong> (starts with https://wpgallery.s3...)</li>
                                    <li>Paste it in the field above</li>
                                  </ol>
                                  <div className="mt-3 pt-2 border-t border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">⚠️ Image Requirements & Limitations:</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                      <li><strong>Use WMart CPaaS Media Gallery URLs only</strong> - External URLs will not work</li>
                                      <li>Image size: Max <strong>5 MB</strong> (JPEG or PNG recommended)</li>
                                      <li>Video size: Max <strong>16 MB</strong> (MP4 format only)</li>
                                      <li>Document size: Max <strong>100 MB</strong> (PDF recommended)</li>
                                      <li>URL format: Must start with <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">https://wpgallery.s3...</code></li>
                                      <li>Upload your media in WMart CPaaS first, then use the generated URL</li>
                                    </ul>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                                    <p className="font-medium mb-1">📚 Quick Tip:</p>
                                    <p>If you don't have a media URL yet, upload your image/video in the WMart CPaaS Media Gallery first, then copy the URL from there.</p>
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </>
                    )}
                    <Alert className="mt-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <p className="text-sm font-medium mb-1">Only WhatsApp-approved designs shown</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          WhatsApp reviews all bulk message designs before you can use them. This usually takes 1-24 hours.
                        </p>
                        <div className="flex flex-col gap-1 text-xs">
                          <Link href={selectedPlatform === 'authkey' ? 'https://cpaas.wmart.in' : selectedPlatform === 'gupshup' ? 'https://www.gupshup.io/whatsapp-api' : 'https://business.facebook.com/wa/manage/message-templates'} target="_blank" className="text-blue-600 hover:underline">
                            → {selectedPlatform === 'gupshup' ? 'Create templates in Gupshup Dashboard' : selectedPlatform === 'authkey' ? 'Create templates in WMart CPaaS Dashboard' : 'Create message templates in Meta Business Manager'}
                          </Link>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (selectedPlatform === 'authkey' && templates.length === 0) || selectedPlatform === 'msg91WhatsApp' || selectedPlatform === 'fast2smsWhatsApp' ? (
                  <>
                    <Input
                      id="template"
                      placeholder={`Enter template ID (WID) from ${
                        selectedPlatform === 'authkey' ? 'WMart CPaaS (e.g., 19137)' :
                        selectedPlatform === 'msg91WhatsApp' ? 'MSG91' :
                        'Fast2SMS'
                      } dashboard`}
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    />
                    {selectedPlatform === 'authkey' && (
                      <>
                        <div className="space-y-2 mt-3">
                          <Label htmlFor="templateType">Template Type</Label>
                          <Select value={templateType} onValueChange={(v) => setTemplateType(v as 'text' | 'media')}>
                            <SelectTrigger id="templateType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Template</SelectItem>
                              <SelectItem value="media">Media Template (with image/video)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {templateType === 'media' && (
                          <div className="space-y-3 mt-3">
                            <Label htmlFor="headerImage">Header Image/Video URL</Label>
                            <Input
                              id="headerImage"
                              placeholder="https://wpgallery.s3.ap-south-1.amazonaws.com/gallery/..."
                              value={headerImageUrl}
                              onChange={(e) => setHeaderImageUrl(e.target.value)}
                            />
                            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">📷 How to Send Images with WMart CPaaS</p>
                                <div className="text-xs space-y-2 text-blue-800 dark:text-blue-200">
                                  <p className="font-medium">Getting your Media URL:</p>
                                  <ol className="list-decimal ml-4 space-y-1.5">
                                    <li>Log into <a href="https://cpaas.wmart.in" target="_blank" className="underline hover:text-blue-600">WMart CPaaS Dashboard</a></li>
                                    <li>Go to <strong>WhatsApp → Templates</strong></li>
                                    <li>Find your approved media template</li>
                                    <li>Click on the template to view details</li>
                                    <li>Copy the <strong>Header Media URL</strong> (starts with https://wpgallery.s3...)</li>
                                    <li>Paste it in the field above</li>
                                  </ol>
                                  <div className="mt-3 pt-2 border-t border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">⚠️ Image Requirements & Limitations:</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                      <li><strong>Use WMart CPaaS Media Gallery URLs only</strong> - External URLs will not work</li>
                                      <li>Image size: Max <strong>5 MB</strong> (JPEG or PNG recommended)</li>
                                      <li>Video size: Max <strong>16 MB</strong> (MP4 format only)</li>
                                      <li>Document size: Max <strong>100 MB</strong> (PDF recommended)</li>
                                      <li>URL format: Must start with <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">https://wpgallery.s3...</code></li>
                                      <li>Upload your media in WMart CPaaS first, then use the generated URL</li>
                                    </ul>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                                    <p className="font-medium mb-1">📚 Quick Tip:</p>
                                    <p>If you don't have a media URL yet, upload your image/video in the WMart CPaaS Media Gallery first, then copy the URL from there.</p>
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </>
                    )}
                    <Alert className="mt-3 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          📋 Using {selectedPlatform === 'authkey' ? 'WMart CPaaS' : selectedPlatform === 'msg91WhatsApp' ? 'MSG91' : 'Fast2SMS'} Templates
                        </p>
                        <div className="text-xs space-y-2 text-blue-800 dark:text-blue-200">
                          <p className="font-medium">To send WhatsApp messages:</p>
                          <ol className="list-decimal ml-4 space-y-1.5">
                            <li>Log into your {selectedPlatform === 'authkey' ? 
                              <a href="https://wmart.in/cpaas/" target="_blank" className="underline hover:text-blue-600">WMart CPaaS Dashboard</a> :
                              selectedPlatform === 'msg91WhatsApp' ?
                              <a href="https://control.msg91.com" target="_blank" className="underline hover:text-blue-600">MSG91 Dashboard</a> :
                              <a href="https://www.fast2sms.com/dashboard" target="_blank" className="underline hover:text-blue-600">Fast2SMS Dashboard</a>
                            }</li>
                            <li>Navigate to WhatsApp Templates section</li>
                            <li>Find your approved WhatsApp template</li>
                            {selectedPlatform === 'authkey' && (
                              <>
                                <li><strong>Copy the WID number</strong> from the first column (e.g., 19137, not the template name)</li>
                                <li>Select template type: Text or Media (check the "Template" column)</li>
                                <li>If Media template, get the image URL from your template</li>
                              </>
                            )}
                            {selectedPlatform !== 'authkey' && (
                              <li>Note the exact template name or ID</li>
                            )}
                            <li>Enter the {selectedPlatform === 'authkey' ? 'WID number' : 'template name'} in the field above</li>
                          </ol>
                          <div className="mt-3 pt-2 border-t border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                            <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">⚠️ Template Variables:</p>
                            <ul className="list-disc ml-4 space-y-1">
                              <li>If your template has a variable (like {'{'}{'{'}{'{'}1{'}'}{'}'}{'}'} for a name), OmniFlow will automatically use the contact's name</li>
                              <li>For templates with one variable, the contact's first name will be sent</li>
                              <li>Templates without variables will work as-is</li>
                              <li>Keep templates simple for best WhatsApp approval rates</li>
                            </ul>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <>
                    <Input
                      id="template"
                      placeholder="Enter your AiSensy campaign name (e.g., welcome_message)"
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    />
                    <Alert className="mt-3 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 How AiSensy Works</p>
                        <div className="text-xs space-y-2 text-blue-800 dark:text-blue-200">
                          <p className="font-medium">AiSensy requires you to create API campaigns in their dashboard:</p>
                          <ol className="list-decimal ml-4 space-y-1.5">
                            <li>
                              <strong>Create an API Campaign in AiSensy Dashboard:</strong>
                              <ul className="list-disc ml-4 mt-1">
                                <li>Log into <a href="https://app.aisensy.com" target="_blank" className="underline hover:text-blue-600">AiSensy Dashboard</a></li>
                                <li>Go to: <strong>Campaigns → Launch Campaign → API Campaign</strong></li>
                                <li>Choose your approved WhatsApp template</li>
                                <li>Give your campaign a name (e.g., "diwali_offer_1")</li>
                                <li>Save the campaign</li>
                              </ul>
                            </li>
                            <li>
                              <strong>Enter that exact campaign name</strong> in the field above
                            </li>
                            <li>
                              <strong>Send your campaign</strong> - OmniFlow will use that campaign to send messages
                            </li>
                          </ol>
                          <div className="mt-3 pt-2 border-t border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                            <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">⚠️ Important Template Requirements:</p>
                            <ul className="list-disc ml-4 space-y-1">
                              <li><strong>Use only ONE variable</strong> in your WhatsApp template (e.g., just "FirstName" or "Name")</li>
                              <li>OmniFlow automatically sends the contact's first name to fill this variable</li>
                              <li>Multiple variables are not currently supported for bulk campaigns</li>
                              <li>Keep templates simple for best approval rates from WhatsApp</li>
                            </ul>
                          </div>
                          <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                            <p className="font-medium mb-1">📚 Helpful Resources:</p>
                            <div className="flex flex-col gap-1">
                              <Link href="https://wiki.aisensy.com/en/articles/11501891-how-to-setup-whatsapp-api-campaigns-in-aisensy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                Complete guide: How to set up API campaigns in AiSensy
                              </Link>
                              <Link href="https://app.aisensy.com/campaigns" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                Open AiSensy Campaigns Dashboard
                              </Link>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientList">Recipient List</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger id="recipientList">
                    <SelectValue placeholder="Select a contact list" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLists ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                    ) : whatsappLists.length === 0 ? (
                      <div className="p-4 text-sm">
                        <p className="text-muted-foreground mb-2">No contact lists found.</p>
                        <p className="text-xs text-muted-foreground">Create a contact list in WhatsApp Marketing to get started.</p>
                      </div>
                    ) : (
                      whatsappLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.contactCount || 0} contacts)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedListId && whatsappLists.find(l => l.id === selectedListId) && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <strong>
                        {whatsappLists.find(l => l.id === selectedListId)?.contactCount || 0}
                      </strong>{' '}
                      contacts will receive this message
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCreateCampaign}
                disabled={isSending || !campaignName || !selectedTemplate || !selectedListId}
                className="w-full min-h-11"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Campaign...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Campaign
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              Campaign details and delivery status
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="font-medium">{getStatusBadge(selectedCampaign.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Message Design</p>
                  <p className="font-medium">{selectedCampaign.templateName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Recipients</p>
                  <p className="font-medium">{selectedCampaign.stats.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="font-medium">
                    {selectedCampaign.stats.delivered} ({Math.round((selectedCampaign.stats.delivered / selectedCampaign.stats.total) * 100)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Read</p>
                  <p className="font-medium">{selectedCampaign.stats.read}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="font-medium">{selectedCampaign.stats.failed}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recipients</h4>
                {isLoadingRecipients ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-[400px]">
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {campaignRecipients.slice(0, 50).map((recipient, index) => (
                              <TableRow key={index}>
                                <TableCell>{recipient.name || '-'}</TableCell>
                                <TableCell>{recipient.phone}</TableCell>
                                <TableCell>
                                  <Badge variant={recipient.status === 'delivered' ? 'default' : 'secondary'}>
                                    {recipient.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {campaignRecipients.length > 50 && (
                          <div className="p-2 text-sm text-center text-muted-foreground border-t">
                            Showing first 50 of {campaignRecipients.length} recipients
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Help Button */}
      <ContextualHelpButton pageId="whatsapp-bulk-campaigns" />
    </div>
  );
}
