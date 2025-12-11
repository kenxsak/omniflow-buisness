"use client";

import { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Mail, MessageSquare, MessageCircle, ArrowRight, ArrowLeft,
  Send, Loader2, Users, CheckCircle, Wand2, AlertCircle, Settings
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { getDefaultBrevoListId } from '@/lib/brevo-utils';

// Import campaign functions
import { createEmailCampaignJob } from '@/lib/campaign-queue';
import { createSMSCampaignJob } from '@/lib/campaign-queue';
import { createWhatsAppCampaignJob } from '@/lib/campaign-queue';
import type { CampaignRecipient } from '@/types/campaign-jobs';

// Import data fetching
import { getWhatsAppLists, getWhatsAppContacts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList } from '@/types/whatsapp';
import { getWATITemplatesAction } from '@/app/actions/wati-actions';
import { fetchBrevoListsAction, fetchBrevoContactsInListAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction } from '@/app/actions/sender-actions';

type CampaignChannel = 'email' | 'sms' | 'whatsapp';

interface RecipientGroup {
  id: string;
  name: string;
  count: number;
}

export default function CreateCampaignPage() {
  const { appUser, company } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [channel, setChannel] = useState<CampaignChannel | null>(null);
  
  // Campaign details
  const [campaignName, setCampaignName] = useState('');
  const [selectedRecipientGroups, setSelectedRecipientGroups] = useState<string[]>([]);
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  
  // Email specific
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [emailProvider, setEmailProvider] = useState<'brevo' | 'sender' | 'smtp' | null>(null);
  const [availableEmailProviders, setAvailableEmailProviders] = useState<Array<{id: 'brevo' | 'sender' | 'smtp', name: string}>>([]);
  
  // SMS specific
  const [smsMessage, setSmsMessage] = useState('');
  const [messageType, setMessageType] = useState<'transactional' | 'promotional'>('transactional');
  const [dltTemplateId, setDltTemplateId] = useState('');
  
  // WhatsApp specific
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [broadcastName, setBroadcastName] = useState('');
  
  // Loading states
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Initialize sender details from company settings
  useEffect(() => {
    if (company) {
      setSenderName(company.name || '');
      // Priority: Company configured email > SMTP from email > User email
      const defaultSenderEmail = 
        company.apiKeys?.brevo?.senderEmail || 
        company.apiKeys?.sender?.senderEmail || 
        company.apiKeys?.smtp?.fromEmail ||
        appUser?.email || 
        '';
      setSenderEmail(defaultSenderEmail);
      
      // Determine available email providers
      const providers: Array<{id: 'brevo' | 'sender' | 'smtp', name: string}> = [];
      if (company.apiKeys?.brevo?.apiKey) {
        providers.push({ id: 'brevo', name: 'Brevo' });
      }
      if (company.apiKeys?.sender?.apiKey) {
        providers.push({ id: 'sender', name: 'Sender.net' });
      }
      if (company.apiKeys?.smtp?.host) {
        providers.push({ id: 'smtp', name: 'Custom SMTP' });
      }
      setAvailableEmailProviders(providers);
      
      // Auto-select first available provider
      if (providers.length > 0 && !emailProvider) {
        setEmailProvider(providers[0].id);
      }
    }
  }, [company, appUser]);

  // Load recipient groups based on channel and email provider
  useEffect(() => {
    if (channel && appUser?.companyId && company) {
      // For email channel, wait until provider is selected
      if (channel === 'email' && !emailProvider) {
        return;
      }
      loadRecipientGroups();
    }
  }, [channel, emailProvider, appUser?.companyId, company]);

  // Load WhatsApp templates when WhatsApp is selected
  useEffect(() => {
    if (channel === 'whatsapp' && appUser?.idToken) {
      loadWhatsAppTemplates();
    }
  }, [channel, appUser?.idToken]);

  const loadRecipientGroups = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingGroups(true);
    
    // Reset selections when loading new groups
    setSelectedRecipientGroups([]);
    setTotalRecipients(0);
    
    try {
      if (channel === 'email') {
        // Check which email provider is selected and load appropriate lists
        if (emailProvider === 'brevo') {
          // Load Brevo lists
          const brevoApiKey = company?.apiKeys?.brevo?.apiKey;
          if (!brevoApiKey) {
            toast({
              title: 'Setup Required',
              description: 'Please configure Brevo API key in Settings first',
              variant: 'destructive',
            });
            setRecipientGroups([]);
            setIsLoadingGroups(false);
            return;
          }

          const result = await fetchBrevoListsAction(brevoApiKey, 50, 0);
          if (result.success && result.lists) {
            const emailGroups = result.lists.map((list) => ({
              id: String(list.id),
              name: list.name,
              count: list.totalSubscribers || 0,
            }));
            setRecipientGroups(emailGroups);
            
            // Auto-select default list if available
            if (emailGroups.length > 0) {
              const defaultId = getDefaultBrevoListId(company?.apiKeys);
              const defaultListExists = emailGroups.find(g => g.id === defaultId);
              if (defaultListExists) {
                setSelectedRecipientGroups([defaultId]);
                setTotalRecipients(defaultListExists.count);
              } else if (emailGroups.length > 0) {
                setSelectedRecipientGroups([emailGroups[0].id]);
                setTotalRecipients(emailGroups[0].count);
              }
            }
          } else {
            toast({
              title: 'Error',
              description: 'Failed to load email lists from Brevo',
              variant: 'destructive',
            });
            setRecipientGroups([]);
          }
        } else if (emailProvider === 'sender') {
          // Load Sender.net lists
          const senderApiKey = company?.apiKeys?.sender?.apiKey;
          if (!senderApiKey) {
            toast({
              title: 'Setup Required',
              description: 'Please configure Sender.net API key in Settings first',
              variant: 'destructive',
            });
            setRecipientGroups([]);
            setIsLoadingGroups(false);
            return;
          }

          const result = await fetchSenderListsAction(senderApiKey, 50, 1);
          if (result.success && result.lists) {
            const emailGroups = result.lists.map((list: any) => ({
              id: String(list.id),
              name: list.name || list.title || `List ${list.id}`,
              count: list.total || list.active || 0,
            }));
            setRecipientGroups(emailGroups);
            
            // Auto-select first list if available
            if (emailGroups.length > 0) {
              setSelectedRecipientGroups([emailGroups[0].id]);
              setTotalRecipients(emailGroups[0].count);
            }
          } else {
            toast({
              title: 'Error',
              description: result.error || 'Failed to load email lists from Sender.net',
              variant: 'destructive',
            });
            setRecipientGroups([]);
          }
        } else if (emailProvider === 'smtp') {
          // SMTP doesn't have built-in lists, use WhatsApp lists as fallback
          const lists = await getWhatsAppLists(appUser.companyId);
          const groupsWithCounts = await Promise.all(
            lists.map(async (list) => {
              const contacts = await getWhatsAppContacts(list.id, appUser.companyId!);
              return {
                id: list.id,
                name: list.name,
                count: contacts.length,
              };
            })
          );
          setRecipientGroups(groupsWithCounts);
          
          if (groupsWithCounts.length === 0) {
            toast({
              title: 'No Contact Lists',
              description: 'SMTP uses your WhatsApp/SMS contact lists. Please create a contact list first.',
            });
          }
        }
      } else if (channel === 'sms' || channel === 'whatsapp') {
        // Load WhatsApp lists (used for both SMS and WhatsApp)
        const lists = await getWhatsAppLists(appUser.companyId);
        const groupsWithCounts = await Promise.all(
          lists.map(async (list) => {
            const contacts = await getWhatsAppContacts(list.id, appUser.companyId!);
            return {
              id: list.id,
              name: list.name,
              count: contacts.length,
            };
          })
        );
        setRecipientGroups(groupsWithCounts);
      }
    } catch (error) {
      console.error('Error loading recipient groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact lists',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const loadWhatsAppTemplates = async () => {
    if (!appUser?.idToken) return;
    setIsLoadingTemplates(true);
    try {
      const result = await getWATITemplatesAction(appUser.idToken);
      if (result.success && result.templates) {
        setWhatsappTemplates(result.templates);
      }
    } catch (error) {
      console.error('Error loading WhatsApp templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleChannelSelect = (selectedChannel: CampaignChannel) => {
    setChannel(selectedChannel);
    setCurrentStep(2);
  };

  const handleRecipientToggle = (groupId: string, count: number) => {
    if (selectedRecipientGroups.includes(groupId)) {
      setSelectedRecipientGroups(prev => prev.filter(id => id !== groupId));
      setTotalRecipients(prev => prev - count);
    } else {
      setSelectedRecipientGroups(prev => [...prev, groupId]);
      setTotalRecipients(prev => prev + count);
    }
  };

  const handleSendCampaign = async () => {
    if (!appUser?.companyId || !appUser?.email) {
      toast({
        title: 'Error',
        description: 'User information not found',
        variant: 'destructive',
      });
      return;
    }

    if (!campaignName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please give your campaign a name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRecipientGroups.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one contact list',
        variant: 'destructive',
      });
      return;
    }

    // Validate email provider is selected and configured for email campaigns
    if (channel === 'email') {
      if (!emailProvider) {
        toast({
          title: 'No Email Provider Selected',
          description: 'Please select an email service (Brevo, Sender.net, or SMTP) to send emails',
          variant: 'destructive',
        });
        return;
      }

      // Check if the selected provider is properly configured
      if (emailProvider === 'brevo' && !company?.apiKeys?.brevo?.apiKey) {
        toast({
          title: 'Brevo Not Configured',
          description: 'Please configure your Brevo API key in Settings',
          variant: 'destructive',
        });
        return;
      }

      if (emailProvider === 'sender' && !company?.apiKeys?.sender?.apiKey) {
        toast({
          title: 'Sender.net Not Configured',
          description: 'Please configure your Sender.net API key in Settings',
          variant: 'destructive',
        });
        return;
      }

      if (emailProvider === 'smtp' && !company?.apiKeys?.smtp?.host) {
        toast({
          title: 'SMTP Not Configured',
          description: 'Please configure your SMTP settings in Settings',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSending(true);

    try {
      let result;

      if (channel === 'email') {
        // Fetch email addresses based on selected provider
        const recipients: CampaignRecipient[] = [];
        const seenEmails = new Set<string>();

        if (emailProvider === 'brevo') {
          // Fetch contacts from Brevo lists
          const brevoApiKey = company?.apiKeys?.brevo?.apiKey!;

          for (const listId of selectedRecipientGroups) {
            let offset = 0;
            const limit = 500;
            let hasMore = true;

            while (hasMore) {
              const contactsResult = await fetchBrevoContactsInListAction(
                brevoApiKey, 
                parseInt(listId, 10), 
                limit,
                offset
              );

              if (contactsResult.success && contactsResult.contacts && contactsResult.contacts.length > 0) {
                contactsResult.contacts.forEach((contact: any) => {
                  const normalizedEmail = contact.email.toLowerCase().trim();
                  if (!seenEmails.has(normalizedEmail)) {
                    seenEmails.add(normalizedEmail);
                    recipients.push({
                      email: contact.email,
                      name: contact.attributes?.FIRSTNAME || contact.email,
                    });
                  }
                });

                if (contactsResult.contacts.length < limit) {
                  hasMore = false;
                } else {
                  offset += limit;
                }
              } else {
                hasMore = false;
              }
            }
          }
        } else if (emailProvider === 'sender' || emailProvider === 'smtp') {
          // For Sender.net and SMTP, use WhatsApp contact lists
          // (Sender.net API doesn't provide direct contact fetching from groups,
          // and SMTP doesn't have built-in lists)
          for (const listId of selectedRecipientGroups) {
            const contacts = await getWhatsAppContacts(listId, appUser.companyId);
            contacts.forEach(contact => {
              // Extract email from contact if available
              // WhatsApp contacts might have email in custom fields
              const email = (contact as any).email;
              if (email) {
                const normalizedEmail = email.toLowerCase().trim();
                if (!seenEmails.has(normalizedEmail)) {
                  seenEmails.add(normalizedEmail);
                  recipients.push({
                    email: email,
                    name: contact.name,
                  });
                }
              }
            });
          }

          // If no emails found in WhatsApp contacts, show helpful message
          if (recipients.length === 0) {
            throw new Error(
              `No email addresses found in selected contact lists. ${
                emailProvider === 'smtp' 
                  ? 'For SMTP, please ensure your contact lists include email addresses.' 
                  : 'For Sender.net, please ensure your contact lists include email addresses, or use the Sender.net groups directly in their platform.'
              }`
            );
          }
        }

        // Validate we have recipients
        if (recipients.length === 0) {
          throw new Error('No email recipients found in selected lists');
        }

        // Calculate actual duplicates removed
        const originalTotal = selectedRecipientGroups.reduce((sum, listId) => {
          const group = recipientGroups.find(g => g.id === listId);
          return sum + (group?.count || 0);
        }, 0);
        const duplicateCount = originalTotal - recipients.length;
        
        if (duplicateCount > 0) {
          toast({
            title: 'Duplicates Removed',
            description: `${duplicateCount} duplicate email addresses were removed from ${recipients.length} total contacts`,
          });
        }

        result = await createEmailCampaignJob(
          appUser.companyId,
          appUser.email,
          campaignName,
          {
            subject: emailSubject,
            htmlContent: emailContent,
            senderName: senderName || company?.name || 'Your Company',
            senderEmail: senderEmail || company?.apiKeys?.brevo?.senderEmail || company?.apiKeys?.sender?.senderEmail || appUser.email,
            tag: 'unified-campaign',
          },
          recipients,
          emailProvider || 'brevo' // Pass the selected provider
        );
        
      } else if (channel === 'sms' || channel === 'whatsapp') {
        // Build recipients list with deduplication
        const recipients: CampaignRecipient[] = [];
        const seenPhones = new Set<string>();
        
        // Helper function to normalize phone numbers to digits only
        const normalizePhone = (phone: string): string => {
          // Remove all non-digit characters except leading +
          return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
        };
        
        // Load contacts from selected lists and deduplicate by phone number
        for (const listId of selectedRecipientGroups) {
          const contacts = await getWhatsAppContacts(listId, appUser.companyId);
          contacts.forEach(contact => {
            const normalizedPhone = normalizePhone(contact.phoneNumber);
            if (!seenPhones.has(normalizedPhone)) {
              seenPhones.add(normalizedPhone);
              recipients.push({
                phone: contact.phoneNumber,
                name: contact.name,
              });
            }
          });
        }

        // Validate we have recipients
        if (recipients.length === 0) {
          throw new Error(`No ${channel.toUpperCase()} recipients found in selected lists`);
        }

        // Calculate actual duplicates removed
        const originalTotal = selectedRecipientGroups.reduce((sum, listId) => {
          const group = recipientGroups.find(g => g.id === listId);
          return sum + (group?.count || 0);
        }, 0);
        const duplicateCount = originalTotal - recipients.length;
        
        if (duplicateCount > 0) {
          toast({
            title: 'Duplicates Removed',
            description: `${duplicateCount} duplicate phone numbers were removed from ${recipients.length} total contacts`,
          });
        }

        if (channel === 'sms') {
          result = await createSMSCampaignJob(
            appUser.companyId,
            appUser.email,
            campaignName,
            {
              message: smsMessage,
              senderId: company?.apiKeys?.msg91?.senderId || 'SMSOTP',
              messageType,
              dltTemplateId: dltTemplateId || undefined,
            },
            recipients
          );
        } else {
          result = await createWhatsAppCampaignJob(
            appUser.companyId,
            appUser.email,
            campaignName,
            {
              templateName: whatsappTemplate,
              broadcastName: broadcastName || campaignName,
            },
            recipients
          );
        }
      }

      if (result && result.success) {
        // Trigger confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Get actual recipient count from the result
        const actualRecipientCount = result.recipientCount || 0;

        toast({
          title: '🎉 Campaign Created!',
          description: `Your ${channel} campaign is being sent to ${actualRecipientCount} contacts`,
        });

        // Redirect to campaigns page
        setTimeout(() => {
          router.push('/campaigns');
        }, 1500);
      } else {
        throw new Error(result?.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Campaign Failed',
        description: error.message || 'Failed to send campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

  const renderStepContent = () => {
    // Step 1: Choose Channel
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Choose Your Channel</h2>
            <p className="text-muted-foreground">Select how you want to reach your contacts</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card 
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => handleChannelSelect('email')}
            >
              <CardHeader>
                <Mail className="h-12 w-12 text-blue-500 mb-4" />
                <CardTitle>Email Campaign</CardTitle>
                <CardDescription>Send professional emails with rich content</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ Rich HTML content</li>
                  <li>✓ Images and links</li>
                  <li>✓ Track open rates</li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => handleChannelSelect('sms')}
            >
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-green-500 mb-4" />
                <CardTitle>SMS Campaign</CardTitle>
                <CardDescription>Send text messages to mobile phones</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ Instant delivery</li>
                  <li>✓ 98% open rate</li>
                  <li>✓ Global reach</li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => handleChannelSelect('whatsapp')}
            >
              <CardHeader>
                <MessageCircle className="h-12 w-12 text-emerald-500 mb-4" />
                <CardTitle>WhatsApp Campaign</CardTitle>
                <CardDescription>Send messages via WhatsApp Business</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ Rich media support</li>
                  <li>✓ High engagement</li>
                  <li>✓ Template-based</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Step 2: Select Recipients
    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Select Recipients</h2>
            <p className="text-muted-foreground">Choose which contact lists should receive this campaign</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Spring Sale Announcement"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <Separator />

            {channel === 'email' && emailProvider && (
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Using <strong>{emailProvider === 'brevo' ? 'Brevo' : emailProvider === 'sender' ? 'Sender.net' : 'SMTP'}</strong> to send emails.
                  {emailProvider === 'smtp' && ' Contact lists are from your WhatsApp/SMS contacts.'}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label className="text-base font-semibold">Contact Lists</Label>
              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recipientGroups.length === 0 ? (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No contact lists found. Please create contact lists first.
                    {(channel === 'sms' || channel === 'whatsapp') && (
                      <Link href="/whatsapp-marketing" className="ml-2 underline">
                        Create contact list
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3 mt-4">
                  {recipientGroups.map((group) => (
                    <Card
                      key={group.id}
                      className={`cursor-pointer transition-all ${
                        selectedRecipientGroups.includes(group.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleRecipientToggle(group.id, group.count)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                            selectedRecipientGroups.includes(group.id)
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {selectedRecipientGroups.includes(group.id) && (
                              <CheckCircle className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.count} contacts
                            </p>
                          </div>
                        </div>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {totalRecipients > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{totalRecipients}</strong> contacts selected
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => setCurrentStep(3)}
              disabled={selectedRecipientGroups.length === 0 || !campaignName.trim()}
            >
              Next: Compose Message
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 3: Compose Message
    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Compose Your Message</h2>
            <p className="text-muted-foreground">Create the content for your {channel} campaign</p>
          </div>

          {channel === 'email' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sender-name">Your Name</Label>
                  <Input
                    id="sender-name"
                    placeholder="e.g., John Doe"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sender-email">Your Email</Label>
                  <Input
                    id="sender-email"
                    type="email"
                    placeholder="e.g., john@company.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </div>
              </div>

              {availableEmailProviders.length > 1 && (
                <div>
                  <Label htmlFor="email-provider">Send Using</Label>
                  <Select 
                    value={emailProvider || undefined} 
                    onValueChange={(v: 'brevo' | 'sender' | 'smtp') => setEmailProvider(v)}
                  >
                    <SelectTrigger id="email-provider">
                      <SelectValue placeholder="Select email service" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmailProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which email service to use for sending
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="email-subject">Email Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="e.g., Special Offer Just for You!"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="email-content">Email Message</Label>
                <Textarea
                  id="email-content"
                  placeholder="Write your email message here... Use {{ contact.FIRSTNAME }} to personalize."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Tip: Use {'{'}{ contact.FIRSTNAME }{'}'} to personalize each email
                </p>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For advanced features like rich HTML editor, templates, and AI assistance,{' '}
                  <Link href="/email-marketing/create-campaign" className="underline font-medium">
                    use the Email Marketing page
                  </Link>.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {channel === 'sms' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="message-type">Message Type</Label>
                <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional (OTP, alerts)</SelectItem>
                    <SelectItem value="promotional">Promotional (Marketing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sms-message">Message</Label>
                <Textarea
                  id="sms-message"
                  placeholder="Your SMS message here..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={4}
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {smsMessage.length}/160 characters
                </p>
              </div>

              {messageType === 'promotional' && (
                <div>
                  <Label htmlFor="dlt-template">DLT Template ID (for India)</Label>
                  <Input
                    id="dlt-template"
                    placeholder="Enter DLT Template ID"
                    value={dltTemplateId}
                    onChange={(e) => setDltTemplateId(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {channel === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="broadcast-name">Broadcast Name</Label>
                <Input
                  id="broadcast-name"
                  placeholder="e.g., Spring Sale 2025"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="template">WhatsApp Template</Label>
                {isLoadingTemplates ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading templates...</span>
                  </div>
                ) : whatsappTemplates.length === 0 ? (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No templates found. Please configure WATI and create templates first.
                      <Link href="/settings" className="ml-2 underline">
                        Go to Settings
                      </Link>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={whatsappTemplate} onValueChange={setWhatsappTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappTemplates.map((template) => (
                        <SelectItem key={template.elementName} value={template.elementName}>
                          {template.elementName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => setCurrentStep(4)}
              disabled={
                (channel === 'email' && (!emailSubject.trim() || !emailContent.trim())) ||
                (channel === 'sms' && !smsMessage.trim()) ||
                (channel === 'whatsapp' && !whatsappTemplate)
              }
            >
              Next: Review & Send
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 4: Review & Send
    if (currentStep === 4) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Review & Send</h2>
            <p className="text-muted-foreground">Check your campaign details before sending</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    {channel === 'email' && <Mail className="h-4 w-4" />}
                    {channel === 'sms' && <MessageSquare className="h-4 w-4" />}
                    {channel === 'whatsapp' && <MessageCircle className="h-4 w-4" />}
                    {channel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaignName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="font-medium">{totalRecipients} contacts</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Lists</p>
                  <p className="font-medium">{selectedRecipientGroups.length} list(s)</p>
                </div>
              </div>

              <Separator />

              {channel === 'sms' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Message Preview</p>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{smsMessage}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {channel === 'whatsapp' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Template</p>
                  <Badge>{whatsappTemplate}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your campaign will be processed in the background and sent to all selected contacts within a few minutes.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={isSending}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSendCampaign} 
              disabled={isSending}
              variant="accent"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Campaign...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send Campaign Now
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Create Campaign" 
          description="Send messages to your contacts in a few simple steps"
        />
        <Button variant="ghost" asChild>
          <Link href="/campaigns">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Step {currentStep} of 4
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}
