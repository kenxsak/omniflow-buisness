'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, FileText, Trash2, RefreshCw, Eye, Send, Mail, Clock, BarChart, 
  ArrowLeft, Plus, Copy, Check, AlertTriangle, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { getSavedEmailTemplatesAction, deleteSavedEmailTemplateAction, incrementTemplateSendCountAction } from '@/app/actions/saved-email-template-actions';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction } from '@/app/actions/sender-actions';
import { fetchInternalEmailListsAction, type InternalEmailList } from '@/app/actions/fetch-internal-email-lists-action';
import { syncEmailListToBrevoAction, syncEmailListToSenderAction } from '@/app/actions/sync-email-list-to-provider-action';
import { publishAICampaignAction } from '@/app/actions/publish-ai-campaign-actions';
import { createAICampaignDraftAction, updateAICampaignDraftAction } from '@/app/actions/ai-campaign-draft-actions';
import type { SavedEmailTemplate } from '@/types/templates';
import Link from 'next/link';
import PageTitle from '@/components/ui/page-title';

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

export default function SavedEmailTemplatesPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const { apiKeys } = useCompanyApiKeys();
  
  const [templates, setTemplates] = useState<SavedEmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedEmailTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SavedEmailTemplate | null>(null);
  
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider | null>(null);
  const [internalLists, setInternalLists] = useState<InternalEmailList[]>([]);
  const [selectedInternalListId, setSelectedInternalListId] = useState('');
  const [brevoLists, setBrevoLists] = useState<BrevoList[]>([]);
  const [senderLists, setSenderLists] = useState<SenderList[]>([]);
  const [selectedBrevoListId, setSelectedBrevoListId] = useState('');
  const [selectedSenderListId, setSelectedSenderListId] = useState('');
  
  const [isLoadingInternalLists, setIsLoadingInternalLists] = useState(false);
  const [isLoadingBrevoLists, setIsLoadingBrevoLists] = useState(false);
  const [isLoadingSenderLists, setIsLoadingSenderLists] = useState(false);
  const [senderListsLoaded, setSenderListsLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const hasBrevoConfigured = Boolean(apiKeys?.brevo?.apiKey);
  const hasSenderConfigured = Boolean(apiKeys?.sender?.apiKey);

  useEffect(() => {
    if (appUser?.idToken) {
      loadTemplates();
    }
  }, [appUser?.idToken]);

  const loadTemplates = async () => {
    if (!appUser?.idToken) return;
    
    setIsLoading(true);
    try {
      const result = await getSavedEmailTemplatesAction({ idToken: appUser.idToken });
      
      if (result.success && result.templates) {
        setTemplates(result.templates);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!appUser?.idToken) return;
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    setDeletingId(templateId);
    try {
      const result = await deleteSavedEmailTemplateAction({
        idToken: appUser.idToken,
        templateId,
      });
      
      if (result.success) {
        toast({
          title: 'Template Deleted',
          description: 'The template has been deleted successfully',
        });
        loadTemplates();
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openSendDialog = async (template: SavedEmailTemplate) => {
    setSelectedTemplate(template);
    setSendDialogOpen(true);
    setDeliveryProvider(null);
    setSelectedInternalListId('');
    setSelectedBrevoListId('');
    setSelectedSenderListId('');
    
    await loadInternalLists();
  };

  const loadInternalLists = async () => {
    if (!appUser?.idToken) return;
    
    setIsLoadingInternalLists(true);
    try {
      const result = await fetchInternalEmailListsAction(appUser.idToken);
      if (result.success && result.lists) {
        setInternalLists(result.lists);
      }
    } catch (error) {
      console.error('Error loading internal lists:', error);
    } finally {
      setIsLoadingInternalLists(false);
    }
  };

  const loadBrevoLists = useCallback(async () => {
    if (!apiKeys?.brevo?.apiKey) return;
    
    setIsLoadingBrevoLists(true);
    try {
      const result = await fetchBrevoListsAction(apiKeys.brevo.apiKey);
      if (result.success && result.lists) {
        setBrevoLists(result.lists);
        if (result.lists.length > 0) {
          setSelectedBrevoListId(result.lists[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error loading Brevo lists:', error);
    } finally {
      setIsLoadingBrevoLists(false);
    }
  }, [apiKeys?.brevo?.apiKey]);

  const loadSenderLists = useCallback(async () => {
    if (!apiKeys?.sender?.apiKey) return;
    
    setIsLoadingSenderLists(true);
    setSenderListsLoaded(false);
    try {
      const result = await fetchSenderListsAction(apiKeys.sender.apiKey);
      if (result.success && result.lists) {
        setSenderLists(result.lists.map(l => ({
          id: l.id,
          name: l.title,
          total: l.total || 0
        })));
        if (result.lists.length > 0) {
          setSelectedSenderListId(result.lists[0].id);
        }
        setSenderListsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading Sender lists:', error);
      toast({
        title: 'Failed to Load Lists',
        description: 'Could not load Sender.net lists. Please check your API key configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSenderLists(false);
    }
  }, [apiKeys?.sender?.apiKey, toast]);

  useEffect(() => {
    if (sendDialogOpen && deliveryProvider === 'brevo' && apiKeys?.brevo?.apiKey) {
      loadBrevoLists();
    } else if (sendDialogOpen && deliveryProvider === 'sender' && apiKeys?.sender?.apiKey) {
      loadSenderLists();
    }
  }, [sendDialogOpen, deliveryProvider, apiKeys?.brevo?.apiKey, apiKeys?.sender?.apiKey, loadBrevoLists, loadSenderLists]);

  const selectedInternalList = internalLists.find(l => l.id === selectedInternalListId);

  const handleSendTemplate = async () => {
    if (!appUser?.idToken || !appUser?.companyId || !selectedTemplate) return;

    if (!selectedInternalListId) {
      toast({
        title: 'Email List Required',
        description: 'Please select an email list from your contacts',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryProvider) {
      toast({
        title: 'Provider Required',
        description: 'Please select how you want to send your emails',
        variant: 'destructive',
      });
      return;
    }

    if (deliveryProvider === 'sender' && !selectedSenderListId) {
      toast({
        title: 'Sender.net List Required',
        description: 'Please select a Sender.net list to sync your contacts',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      let providerListId: string | number | undefined;
      let providerListName: string | undefined;
      let syncedContactCount = 0;

      if (deliveryProvider === 'brevo') {
        if (!apiKeys?.brevo?.apiKey) {
          throw new Error('Brevo API key not configured');
        }
        
        toast({
          title: 'Syncing Contacts to Brevo...',
          description: 'Please wait while we sync your contacts.',
        });

        const syncResult = await syncEmailListToBrevoAction(
          selectedInternalListId,
          appUser.companyId,
          apiKeys.brevo.apiKey,
          selectedBrevoListId ? parseInt(selectedBrevoListId) : undefined,
          !selectedBrevoListId
        );

        if (!syncResult.success) {
          throw new Error(syncResult.errorMessage || 'Failed to sync contacts to Brevo');
        }

        providerListId = syncResult.providerListId;
        providerListName = syncResult.providerListName || selectedInternalList?.name;
        syncedContactCount = syncResult.syncedCount;

        toast({
          title: 'Contacts Synced!',
          description: `${syncResult.syncedCount} contacts synced to Brevo.`,
        });
      } else if (deliveryProvider === 'sender') {
        if (!apiKeys?.sender?.apiKey) {
          throw new Error('Sender.net API key not configured');
        }

        if (!selectedSenderListId) {
          throw new Error('Please select a Sender.net list');
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
          description: `${syncResult.syncedCount} contacts synced to Sender.net.`,
        });
      }

      const draftResult = await createAICampaignDraftAction({
        idToken: appUser.idToken,
        originalPrompt: selectedTemplate.originalPrompt || `Resend template: ${selectedTemplate.name}`,
        emailContent: {
          subjectLines: [selectedTemplate.subject],
          selectedSubjectIndex: 0,
          htmlBody: selectedTemplate.htmlContent,
          ctaSuggestions: [],
        },
        selectedChannels: ['email'],
      });

      if (!draftResult.success || !draftResult.draft) {
        throw new Error(draftResult.error || 'Failed to create campaign draft');
      }

      await updateAICampaignDraftAction({
        idToken: appUser.idToken,
        draftId: draftResult.draft.id,
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
        draftId: draftResult.draft.id,
      });

      if (!publishResult.success) {
        throw new Error(publishResult.error || 'Failed to publish campaign');
      }

      await incrementTemplateSendCountAction({
        idToken: appUser.idToken,
        templateId: selectedTemplate.id,
      });

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
        title: 'Email Campaign Sent!',
        description: `Your email is being sent to ${syncedContactCount} contacts.`,
      });

      setSendDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('Error sending template:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send email campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const openPreview = (template: SavedEmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle 
          title="Saved Email Templates" 
          description="Reuse your email designs without consuming AI credits"
        />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/campaigns/ai-email">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageTitle 
            title="Saved Email Templates" 
            description="Reuse your email designs without consuming AI credits"
          />
        </div>
        <Button onClick={loadTemplates} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No Saved Templates</p>
              <p className="text-sm text-muted-foreground mt-2">
                Save your AI-generated emails as templates to reuse them later.
              </p>
              <Button asChild className="mt-4" variant="accent">
                <Link href="/campaigns/ai-email">
                  Create Email Campaign
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.description || template.subject}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject Line</p>
                    <p className="text-sm truncate">{template.subject}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      <span>{template.sendCount} sends</span>
                    </div>
                    {template.lastSentAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Last: {format(new Date(template.lastSentAt), 'MMM dd')}</span>
                      </div>
                    )}
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex justify-between w-full gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(template)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => openSendDialog(template)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Subject: {previewTemplate?.subject}
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewTemplate.htmlContent}
                className="w-full h-[500px] bg-white"
                title="Email Preview"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {previewTemplate && (
              <Button variant="accent" onClick={() => {
                setPreviewDialogOpen(false);
                openSendDialog(previewTemplate);
              }}>
                <Send className="h-4 w-4 mr-1" />
                Send This Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email Template</DialogTitle>
            <DialogDescription>
              Send "{selectedTemplate?.name}" to your email list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Email List</Label>
              {isLoadingInternalLists ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading lists...
                </div>
              ) : internalLists.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No email lists found. Create an email list first in your CRM.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedInternalListId} onValueChange={setSelectedInternalListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {internalLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contactCount} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Delivery Provider</Label>
              <Select value={deliveryProvider || ''} onValueChange={(v) => setDeliveryProvider(v as DeliveryProvider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose how to send..." />
                </SelectTrigger>
                <SelectContent>
                  {hasBrevoConfigured && (
                    <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                  )}
                  {hasSenderConfigured && (
                    <SelectItem value="sender">Sender.net</SelectItem>
                  )}
                  {!hasBrevoConfigured && !hasSenderConfigured && (
                    <SelectItem value="" disabled>
                      No providers configured
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!hasBrevoConfigured && !hasSenderConfigured && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please configure Brevo or Sender.net in Settings to send emails.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {deliveryProvider === 'brevo' && (
              <div className="space-y-2">
                <Label>Brevo List</Label>
                {isLoadingBrevoLists ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Brevo lists...
                  </div>
                ) : (
                  <Select value={selectedBrevoListId} onValueChange={setSelectedBrevoListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select or create new..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Create New List</SelectItem>
                      {brevoLists.map((list) => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name} ({list.totalSubscribers} subscribers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {deliveryProvider === 'sender' && (
              <div className="space-y-2">
                <Label>Sender.net List (Required)</Label>
                {isLoadingSenderLists ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Sender.net lists...
                  </div>
                ) : senderLists.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No Sender.net lists found. Please create a list in your Sender.net dashboard first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedSenderListId} onValueChange={setSelectedSenderListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {senderLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.total} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={handleSendTemplate} 
              disabled={
                isSending || 
                !selectedInternalListId || 
                !deliveryProvider || 
                (deliveryProvider === 'sender' && (!selectedSenderListId || isLoadingSenderLists)) ||
                (deliveryProvider === 'brevo' && isLoadingBrevoLists)
              }
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
