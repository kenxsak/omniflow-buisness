"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
import { Loader2, Users, AlertTriangle, CheckCircle, Mail, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWhatsAppLists } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList } from '@/types/whatsapp';
import { addLeadsToWhatsAppListAction } from '@/app/actions/add-leads-to-messaging-list-action';
import { addLeadsToEmailListAction } from '@/app/actions/add-leads-to-email-list-action';
import { addLeadsToSenderListAction } from '@/app/actions/add-leads-to-sender-list-action';
import { addLeadsToInternalEmailListAction } from '@/app/actions/add-leads-to-internal-email-list-action';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction } from '@/app/actions/sender-actions';
import type { BrevoContactList } from '@/services/brevo';
import type { SenderContactList } from '@/lib/sender-client';
import type { EmailList } from '@/types/email-lists';
import { getEmailLists } from '@/lib/email-list-data';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { getDefaultBrevoListId } from '@/lib/brevo-utils';
import { Database } from 'lucide-react';

interface AddToMessagingListDialogProps {
  leads: Lead[];
  selectedLeadIds: Set<string>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function AddToMessagingListDialog({
  leads,
  selectedLeadIds,
  isOpen,
  onOpenChange,
  onComplete,
}: AddToMessagingListDialogProps) {
  const [listType, setListType] = useState<'messaging' | 'email'>('messaging');
  const [emailProvider, setEmailProvider] = useState<'internal' | 'brevo' | 'sender'>('internal');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [whatsAppLists, setWhatsAppLists] = useState<WhatsAppList[]>([]);
  const [emailLists, setEmailLists] = useState<BrevoContactList[]>([]);
  const [senderLists, setSenderLists] = useState<SenderContactList[]>([]);
  const [internalEmailLists, setInternalEmailLists] = useState<EmailList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { appUser } = useAuth();
  const { apiKeys, isLoading: isLoadingKeys } = useCompanyApiKeys();

  const brevoApiKey = apiKeys?.brevo?.apiKey || '';
  const senderApiKey = apiKeys?.sender?.apiKey || '';
  const selectedLeads = leads.filter(lead => selectedLeadIds.has(lead.id));
  
  const contactsWithPhone = selectedLeads.filter(lead => {
    if (!lead.phone) return false;
    const cleaned = lead.phone.replace(/[()\s-]/g, '');
    return /^\+\d{10,15}$/.test(cleaned);
  });
  
  const contactsWithoutPhone = selectedLeads.filter(lead => !lead.phone);
  const contactsWithInvalidPhone = selectedLeads.filter(lead => {
    if (!lead.phone) return false;
    const cleaned = lead.phone.replace(/[()\s-]/g, '');
    return !/^\+\d{10,15}$/.test(cleaned);
  });

  const contactsWithEmail = selectedLeads.filter(lead => {
    if (!lead.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(lead.email);
  });
  
  const contactsWithoutEmail = selectedLeads.filter(lead => !lead.email);
  const contactsWithInvalidEmail = selectedLeads.filter(lead => {
    if (!lead.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(lead.email);
  });

  const loadMessagingLists = useCallback(async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    try {
      const lists = await getWhatsAppLists(appUser.companyId);
      setWhatsAppLists(lists);
    } catch (error) {
      console.error('Failed to load messaging lists:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load your messaging lists.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, [appUser?.companyId, toast]);

  const loadEmailLists = useCallback(async () => {
    console.log('[LoadEmailLists] Starting...');
    console.log('[LoadEmailLists] isLoadingKeys:', isLoadingKeys);
    console.log('[LoadEmailLists] apiKeys:', apiKeys);
    console.log('[LoadEmailLists] brevoApiKey:', brevoApiKey ? '***configured***' : 'MISSING');
    
    if (isLoadingKeys) {
      console.log('[LoadEmailLists] API keys still loading, waiting...');
      return;
    }
    
    if (!brevoApiKey) {
      console.error('[LoadEmailLists] No Brevo API key found!');
      setIsLoadingLists(false);
      toast({
        title: 'Email Service Not Connected',
        description: 'Please add your Brevo connection code in Settings → Connect Your Tools',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoadingLists(true);
    try {
      console.log('[LoadEmailLists] Fetching Brevo lists...');
      const result = await fetchBrevoListsAction(brevoApiKey, 50);
      console.log('[LoadEmailLists] Result:', result);
      
      if (result.success && result.lists) {
        setEmailLists(result.lists);
        console.log(`[LoadEmailLists] Loaded ${result.lists.length} lists`);
        
        // Auto-select default list if not already selected
        if (result.lists && result.lists.length > 0 && !selectedListId) {
          const defaultId = getDefaultBrevoListId(apiKeys);
          const defaultListExists = result.lists.find(l => l.id.toString() === defaultId);
          if (defaultListExists) {
            setSelectedListId(defaultId);
          } else if (result.lists.length > 0) {
            setSelectedListId(result.lists[0].id.toString());
          }
        }
      } else {
        console.error('[LoadEmailLists] Error from Brevo:', result.error);
        toast({
          title: 'Error Loading Email Lists',
          description: result.error || 'Could not load your Brevo email lists.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[LoadEmailLists] Exception:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load your email lists.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, [brevoApiKey, toast, apiKeys, isLoadingKeys]);

  const loadSenderLists = useCallback(async () => {
    console.log('[LoadSenderLists] Starting...');
    console.log('[LoadSenderLists] isLoadingKeys:', isLoadingKeys);
    console.log('[LoadSenderLists] senderApiKey:', senderApiKey ? '***configured***' : 'MISSING');
    
    if (isLoadingKeys) {
      console.log('[LoadSenderLists] API keys still loading, waiting...');
      return;
    }
    
    if (!senderApiKey) {
      console.error('[LoadSenderLists] No Sender.net API key found!');
      setIsLoadingLists(false);
      toast({
        title: 'Sender.net Not Connected',
        description: 'Please add your Sender.net connection code in Settings → Connect Your Tools',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoadingLists(true);
    try {
      console.log('[LoadSenderLists] Fetching Sender.net lists...');
      const result = await fetchSenderListsAction(senderApiKey, 50);
      console.log('[LoadSenderLists] Result:', result);
      
      if (result.success && result.lists) {
        setSenderLists(result.lists);
        console.log(`[LoadSenderLists] Loaded ${result.lists.length} lists`);
        
        if (result.lists.length > 0) {
          setSelectedListId(result.lists[0].id.toString());
        }
      } else {
        console.error('[LoadSenderLists] Error from Sender.net:', result.error);
        toast({
          title: 'Error Loading Lists',
          description: result.error || 'Could not load your Sender.net lists.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[LoadSenderLists] Exception:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load your Sender.net lists.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, [senderApiKey, toast, isLoadingKeys]);

  const loadInternalEmailLists = useCallback(async () => {
    if (!appUser?.companyId) return;
    
    setIsLoadingLists(true);
    try {
      console.log('[LoadInternalEmailLists] Fetching internal email lists...');
      const lists = await getEmailLists(appUser.companyId);
      setInternalEmailLists(lists);
      console.log(`[LoadInternalEmailLists] Loaded ${lists.length} internal lists`);
      
      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id);
      }
    } catch (error) {
      console.error('[LoadInternalEmailLists] Exception:', error);
      toast({
        title: 'Error Loading Lists',
        description: 'Could not load your internal email lists.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, [appUser?.companyId, toast]);

  useEffect(() => {
    if (isOpen) {
      setSelectedListId('');
      
      if (listType === 'messaging') {
        loadMessagingLists();
      } else {
        if (emailProvider === 'internal') {
          loadInternalEmailLists();
        } else if (emailProvider === 'brevo') {
          loadEmailLists();
        } else if (emailProvider === 'sender') {
          loadSenderLists();
        }
      }
    }
  }, [isOpen, listType, emailProvider, loadMessagingLists, loadEmailLists, loadSenderLists, loadInternalEmailLists]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedListId || !appUser?.companyId) {
      toast({
        title: 'Selection Required',
        description: 'Please select a list to add contacts to.',
        variant: 'destructive',
      });
      return;
    }

    if (listType === 'messaging') {
      if (contactsWithPhone.length === 0) {
        toast({
          title: 'No Valid Contacts',
          description: 'None of the selected contacts have valid phone numbers.',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await addLeadsToWhatsAppListAction(
          Array.from(selectedLeadIds),
          selectedListId,
          appUser.companyId
        );

        if (result.success) {
          const selectedList = whatsAppLists.find(l => l.id === selectedListId);
          let description = `${result.addedCount} contact${result.addedCount !== 1 ? 's' : ''} added to "${selectedList?.name}".`;
          
          if (result.skippedCount > 0) {
            const reasons = [];
            if (result.skippedReasons?.noPhone) {
              reasons.push(`${result.skippedReasons.noPhone} without phone`);
            }
            if (result.skippedReasons?.invalidPhone) {
              reasons.push(`${result.skippedReasons.invalidPhone} with invalid phone`);
            }
            if (result.skippedReasons?.persistenceFailed) {
              reasons.push(`${result.skippedReasons.persistenceFailed} failed to save`);
            }
            description += ` ${result.skippedCount} skipped (${reasons.join(', ')}).`;
          }

          toast({
            title: 'Contacts Added Successfully',
            description,
          });
          
          onComplete();
          onOpenChange(false);
        } else {
          toast({
            title: 'Failed to Add Contacts',
            description: result.errorMessage || 'An error occurred.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to add contacts to list.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (contactsWithEmail.length === 0) {
        toast({
          title: 'No Valid Contacts',
          description: 'None of the selected contacts have valid email addresses.',
          variant: 'destructive',
        });
        return;
      }

      if (emailProvider === 'internal') {
        setIsSubmitting(true);
        try {
          console.log('[Email Submit] Adding to internal list:', selectedListId);
          
          const result = await addLeadsToInternalEmailListAction(
            Array.from(selectedLeadIds),
            selectedListId,
            appUser.companyId
          );

          if (result.success) {
            const selectedList = internalEmailLists.find(l => l.id === selectedListId);
            let description = `${result.addedCount} contact${result.addedCount !== 1 ? 's' : ''} added to "${selectedList?.name}".`;
            
            if (result.skippedCount > 0) {
              const reasons = [];
              if (result.skippedReasons?.noEmail) {
                reasons.push(`${result.skippedReasons.noEmail} without email`);
              }
              if (result.skippedReasons?.invalidEmail) {
                reasons.push(`${result.skippedReasons.invalidEmail} with invalid email`);
              }
              if (result.skippedReasons?.duplicate) {
                reasons.push(`${result.skippedReasons.duplicate} already in list`);
              }
              if (result.skippedReasons?.failed) {
                reasons.push(`${result.skippedReasons.failed} failed to save`);
              }
              description += ` ${result.skippedCount} skipped (${reasons.join(', ')}).`;
            }

            toast({
              title: 'Contacts Added to Internal List',
              description,
            });
            
            onComplete();
            onOpenChange(false);
          } else {
            toast({
              title: 'Failed to Add Contacts',
              description: result.errorMessage || 'An error occurred.',
              variant: 'destructive',
            });
          }
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to add contacts to internal email list.',
            variant: 'destructive',
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const currentApiKey = emailProvider === 'brevo' ? brevoApiKey : senderApiKey;
      const providerName = emailProvider === 'brevo' ? 'Brevo' : 'Sender.net';

      if (!currentApiKey) {
        toast({
          title: `${providerName} Not Configured`,
          description: `Please set your ${providerName} API Key in Settings.`,
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        console.log('[Email Submit] selectedListId:', selectedListId);
        console.log('[Email Submit] emailProvider:', emailProvider);
        
        let result;
        if (emailProvider === 'brevo') {
          const listIdNumber = parseInt(selectedListId, 10);
          console.log('[Email Submit] Parsed list ID (Brevo):', listIdNumber);
          
          if (isNaN(listIdNumber)) {
            console.error('[Email Submit] Invalid list ID - NaN after parseInt');
            toast({
              title: 'Invalid List Selection',
              description: `Please select a valid email list. (Selected ID: "${selectedListId}")`,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
          
          result = await addLeadsToEmailListAction(
            Array.from(selectedLeadIds),
            listIdNumber,
            appUser.companyId,
            brevoApiKey
          );
        } else {
          console.log('[Email Submit] Using list ID (Sender.net):', selectedListId);
          
          if (!selectedListId) {
            console.error('[Email Submit] Invalid list ID - empty');
            toast({
              title: 'Invalid List Selection',
              description: 'Please select a valid email list.',
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
          
          result = await addLeadsToSenderListAction(
            Array.from(selectedLeadIds),
            selectedListId,
            appUser.companyId,
            senderApiKey
          );
        }

        if (result.success) {
          let listName = '';
          if (emailProvider === 'brevo') {
            const selectedList = emailLists.find(l => l.id === parseInt(selectedListId, 10));
            listName = selectedList?.name || '';
          } else {
            const selectedList = senderLists.find(l => l.id === selectedListId);
            listName = selectedList?.title || '';
          }
          
          let description = `${result.addedCount} contact${result.addedCount !== 1 ? 's' : ''} added to "${listName}" via ${providerName}.`;
          
          if (result.skippedCount > 0) {
            const reasons = [];
            if (result.skippedReasons?.noEmail) {
              reasons.push(`${result.skippedReasons.noEmail} without email`);
            }
            if (result.skippedReasons?.invalidEmail) {
              reasons.push(`${result.skippedReasons.invalidEmail} with invalid email`);
            }
            if (result.skippedReasons?.persistenceFailed) {
              reasons.push(`${result.skippedReasons.persistenceFailed} failed to save`);
            }
            description += ` ${result.skippedCount} skipped (${reasons.join(', ')}).`;
          }

          toast({
            title: 'Contacts Added Successfully',
            description,
          });
          
          onComplete();
          onOpenChange(false);
        } else {
          toast({
            title: 'Failed to Add Contacts',
            description: result.errorMessage || 'An error occurred.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to add contacts to email list.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validContactCount = listType === 'messaging' ? contactsWithPhone.length : contactsWithEmail.length;
  const skippedContactCount = listType === 'messaging' 
    ? (contactsWithoutPhone.length + contactsWithInvalidPhone.length)
    : (contactsWithoutEmail.length + contactsWithInvalidEmail.length);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Contacts to List</DialogTitle>
          <DialogDescription>
            Add selected contacts to a messaging list (WhatsApp/SMS) or email list (Brevo, Sender.net).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <Tabs value={listType} onValueChange={(value) => { setListType(value as 'messaging' | 'email'); setSelectedListId(''); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messaging" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Messaging Lists
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Lists
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messaging" className="space-y-4">
              <div>
                <Label htmlFor="target-list">Select Messaging List (WhatsApp/SMS)</Label>
                {isLoadingLists ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : whatsAppLists.length === 0 ? (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Lists Found</AlertTitle>
                    <AlertDescription>
                      Create a WhatsApp list in the WhatsApp Marketing page first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger id="target-list" className="mt-2">
                      <SelectValue placeholder="Choose a messaging list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsAppLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.contactCount || 0} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div>
                <Label htmlFor="email-provider">Email List Storage</Label>
                <Select value={emailProvider} onValueChange={(value) => { 
                  setEmailProvider(value as 'internal' | 'brevo' | 'sender'); 
                  setSelectedListId('');
                  setSenderLists([]);
                  setEmailLists([]);
                  setInternalEmailLists([]);
                }}>
                  <SelectTrigger id="email-provider" className="mt-2">
                    <SelectValue placeholder="Choose storage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>Internal Lists (Recommended)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="brevo">Brevo (Direct Sync)</SelectItem>
                    <SelectItem value="sender">Sender.net (Direct Sync)</SelectItem>
                  </SelectContent>
                </Select>
                {emailProvider === 'internal' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Contacts stay in your CRM. Sync to providers later when ready to campaign.
                  </p>
                )}
                {(emailProvider === 'brevo' || emailProvider === 'sender') && (
                  <p className="text-xs text-amber-600 mt-1">
                    Contacts will be pushed directly to external provider.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email-list">
                  Select Email List 
                  {emailProvider === 'internal' ? ' (Internal)' : emailProvider === 'brevo' ? ' (Brevo)' : ' (Sender.net)'}
                </Label>
                {isLoadingLists ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : emailProvider === 'internal' ? (
                  internalEmailLists.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Internal Lists Found</AlertTitle>
                      <AlertDescription>
                        Create an email list in Email Lists page first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger id="email-list" className="mt-2">
                        <SelectValue placeholder="Choose an internal list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {internalEmailLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.contactCount || 0} contacts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : emailProvider === 'brevo' ? (
                  !brevoApiKey ? (
                    <Alert className="mt-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Brevo Not Configured</AlertTitle>
                      <AlertDescription>
                        Please set your Brevo API Key in Settings to use email lists.
                      </AlertDescription>
                    </Alert>
                  ) : emailLists.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Lists Found</AlertTitle>
                      <AlertDescription>
                        Create an email list in Brevo first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger id="email-list" className="mt-2">
                          <SelectValue placeholder="Choose an email list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {emailLists.map((list) => (
                            <SelectItem key={list.id} value={list.id.toString()}>
                              {list.name} ({list.totalSubscribers || 0} subscribers)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedListId && emailLists.find(l => l.id.toString() === selectedListId)?.totalSubscribers === 0 ? (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-sm">Showing 0 subscribers?</AlertTitle>
                          <AlertDescription className="text-xs">
                            In Brevo, contacts added via API need to be "Subscribed" status to count as subscribers. Log into Brevo → Your list → Check contact status is "Subscribed" (not "Unconfirmed").
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </>
                  )
                ) : (
                  !senderApiKey ? (
                    <Alert className="mt-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Sender.net Not Configured</AlertTitle>
                      <AlertDescription>
                        Please set your Sender.net API Key in Settings to use email lists.
                      </AlertDescription>
                    </Alert>
                  ) : senderLists.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Lists Found</AlertTitle>
                      <AlertDescription>
                        Create an email list in Sender.net first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger id="email-list" className="mt-2">
                        <SelectValue placeholder="Choose an email list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {senderLists.map((list) => (
                          <SelectItem key={list.id} value={list.id.toString()}>
                            {list.title} ({list.active || 0} active)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Contacts:</span>
                  <span className="text-sm text-muted-foreground">{selectedLeads.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Will be added:</span>
                  </div>
                  <span className="text-sm font-medium">{validContactCount}</span>
                </div>
                
                {skippedContactCount > 0 && (
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Will be skipped:</span>
                    </div>
                    <span className="text-sm font-medium">{skippedContactCount}</span>
                  </div>
                )}
                
                {listType === 'messaging' ? (
                  <>
                    {contactsWithoutPhone.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        • {contactsWithoutPhone.length} contact{contactsWithoutPhone.length !== 1 ? 's' : ''} without phone numbers
                      </p>
                    )}
                    {contactsWithInvalidPhone.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        • {contactsWithInvalidPhone.length} contact{contactsWithInvalidPhone.length !== 1 ? 's' : ''} with invalid phone numbers
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {contactsWithoutEmail.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        • {contactsWithoutEmail.length} contact{contactsWithoutEmail.length !== 1 ? 's' : ''} without email addresses
                      </p>
                    )}
                    {contactsWithInvalidEmail.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        • {contactsWithInvalidEmail.length} contact{contactsWithInvalidEmail.length !== 1 ? 's' : ''} with invalid email addresses
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {listType === 'messaging' && contactsWithPhone.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Valid Contacts</AlertTitle>
              <AlertDescription>
                None of the selected contacts have valid phone numbers with country codes (e.g., +1234567890).
              </AlertDescription>
            </Alert>
          )}
          
          {listType === 'email' && contactsWithEmail.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Valid Contacts</AlertTitle>
              <AlertDescription>
                None of the selected contacts have valid email addresses.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedListId ||
                validContactCount === 0 ||
                (listType === 'messaging' && whatsAppLists.length === 0) ||
                (listType === 'email' && (
                  (emailProvider === 'internal' && internalEmailLists.length === 0) ||
                  (emailProvider === 'brevo' && (emailLists.length === 0 || !brevoApiKey)) ||
                  (emailProvider === 'sender' && (senderLists.length === 0 || !senderApiKey))
                ))
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Users className="mr-2 h-4 w-4" />
              Add {validContactCount} Contact{validContactCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
