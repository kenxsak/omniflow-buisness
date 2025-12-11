"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  MessageSquare,
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
  DollarSign,
  Sparkles,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import type { SMSCampaign, SMSRecipient } from '@/types/messaging';
import { getSMSCampaigns, getSMSCampaignRecipients, addSMSCampaign, deleteSMSCampaign } from '@/lib/messaging-campaigns-data';
import { sendBulkSMSViaMSG91Action, calculateSMSCostAction, getMSG91TemplatesAction } from '@/app/actions/msg91-actions';
import { sendBulkSMSViaFast2SMSAction } from '@/app/actions/fast2sms-actions';
import { sendBulkSMSViaTwilioAction } from '@/app/actions/twilio-sms-action';
import { syncFast2SMSTemplatesAction, syncMSG91TemplatesAction, getSMSTemplatesAction } from '@/app/actions/sms-templates-actions';
import { getWhatsAppLists, getWhatsAppContacts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import type { SMSTemplate } from '@/lib/sms-templates-sync';
import { VariableMapping, type VariableMapping as VariableMappingType } from '@/components/sms/variable-mapping';
import { AddTemplateDialog } from '@/components/sms/add-template-dialog';

interface SMSActionResult {
  success: boolean;
  campaignId?: string;
  requestId?: string;
  messageId?: string;
  error?: string;
  smsCount?: number;
  estimatedCost?: number;
  sent?: number;
  failed?: number;
  failedRecipients?: { phone: string; error: string }[];
  message?: string[];
  scheduledAt?: string;
}

interface BulkSMSCampaignsProps {
  defaultProvider?: 'msg91' | 'fast2sms' | 'twilio';
}

interface QuickSMSVariableMapping {
  variableName: string;
  mappingType: 'contact_field' | 'static';
  mappingValue: string;
}

interface RecipientWithFields extends Omit<SMSRecipient, 'status'> {
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  [key: string]: string | number | boolean | undefined;
}

export default function BulkSMSCampaigns({ defaultProvider }: BulkSMSCampaignsProps) {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create'>('campaigns');
  
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'msg91' | 'fast2sms' | 'twilio'>(defaultProvider as 'msg91' | 'fast2sms' | 'twilio' || 'msg91');
  
  const initializedVariablesRef = useRef<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'promotional' | 'transactional'>('transactional');
  const [dltTemplateId, setDltTemplateId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [contactLists, setContactLists] = useState<WhatsAppList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [smsCount, setSmsCount] = useState(1);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [forceQuickSMS, setForceQuickSMS] = useState(false);
  
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
  
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<SMSRecipient[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  
  const [variableMappings, setVariableMappings] = useState<VariableMappingType[]>([]);
  const [quickSMSMappings, setQuickSMSMappings] = useState<QuickSMSVariableMapping[]>([]);
  const [loadedContacts, setLoadedContacts] = useState<WhatsAppContact[]>([]);

  const shouldShowQuickSMSMapping = selectedPlatform === 'fast2sms' && (forceQuickSMS || !dltTemplateId);

  const detectedQuickSMSVariables = useMemo(() => {
    if (!shouldShowQuickSMSMapping) return [];
    const matches = message.match(/\{(\w+)\}/g) || [];
    const uniqueVars = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
    return uniqueVars;
  }, [message, shouldShowQuickSMSMapping]);

  const availableContactFields = useMemo(() => {
    const baseFields = [
      { value: 'name', label: 'Contact Name' },
      { value: 'phone', label: 'Phone Number' },
      { value: 'phoneNumber', label: 'Phone Number' },
    ];
    
    if (loadedContacts.length > 0) {
      const firstContact = loadedContacts[0];
      Object.keys(firstContact)
        .filter(k => !['id', 'createdAt', 'updatedAt', 'listId', 'companyId', 'name', 'phone', 'phoneNumber'].includes(k))
        .forEach(key => {
          const value = firstContact[key as keyof typeof firstContact];
          if (typeof value === 'string' || typeof value === 'number') {
            baseFields.push({
              value: key,
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
            });
          }
        });
    }
    
    return baseFields;
  }, [loadedContacts]);

  useEffect(() => {
    if (detectedQuickSMSVariables.length === 0) {
      if (quickSMSMappings.length > 0) {
        setQuickSMSMappings([]);
        initializedVariablesRef.current.clear();
      }
      return;
    }
    
    const currentVarNames = new Set(detectedQuickSMSVariables);
    const existingVarNames = new Set(quickSMSMappings.map(m => m.variableName));
    
    const newVarsToAdd = detectedQuickSMSVariables.filter(
      varName => !initializedVariablesRef.current.has(varName) && !existingVarNames.has(varName)
    );
    
    const varsToRemove = quickSMSMappings
      .filter(m => !currentVarNames.has(m.variableName))
      .map(m => m.variableName);
    
    if (newVarsToAdd.length === 0 && varsToRemove.length === 0) {
      return;
    }
    
    setQuickSMSMappings(prev => {
      const filtered = prev.filter(m => currentVarNames.has(m.variableName));
      
      const newMappings = newVarsToAdd.map(varName => {
        const matchingField = availableContactFields.find(f => 
          f.value.toLowerCase() === varName.toLowerCase()
        );
        
        initializedVariablesRef.current.add(varName);
        
        return {
          variableName: varName,
          mappingType: matchingField ? 'contact_field' as const : 'static' as const,
          mappingValue: matchingField?.value || ''
        };
      });
      
      return [...filtered, ...newMappings];
    });
    
    varsToRemove.forEach(varName => {
      initializedVariablesRef.current.delete(varName);
    });
  }, [detectedQuickSMSVariables, availableContactFields, quickSMSMappings]);

  const updateQuickSMSMapping = useCallback((varName: string, type: 'contact_field' | 'static', value: string) => {
    setQuickSMSMappings(prev => 
      prev.map(m => m.variableName === varName ? { ...m, mappingType: type, mappingValue: value } : m)
    );
  }, []);

  const transformMappingsForFast2SMS = useCallback((
    mappings: VariableMappingType[]
  ): QuickSMSVariableMapping[] => {
    return mappings.map(m => ({
      variableName: m.placeholder,
      mappingType: m.mappingType === 'field' ? 'contact_field' as const : 'static' as const,
      mappingValue: m.mappingType === 'field' ? (m.fieldMapping || '') : (m.staticValue || '')
    }));
  }, []);

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

  useEffect(() => {
    if (defaultProvider && defaultProvider !== selectedPlatform) {
      setSelectedPlatform(defaultProvider);
    }
  }, [defaultProvider]);

  useEffect(() => {
    if (appUser?.companyId) {
      loadCampaigns();
      loadContactLists();
      loadTemplates();
    }
  }, [appUser?.companyId]);

  useEffect(() => {
    if (!appUser?.idToken) {
      console.log('❌ loadTemplates skipped: appUser.idToken not available yet');
      return;
    }
    console.log('🚀 loadTemplates triggered for platform:', selectedPlatform);
    loadTemplates();
    setSelectedTemplate(null);
    setTemplateId('');
    setDltTemplateId('');
  }, [selectedPlatform, appUser?.idToken]);

  const loadCampaigns = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingCampaigns(true);
    try {
      const campaignsList = await getSMSCampaigns(appUser.companyId);
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

  const loadContactLists = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    try {
      const lists = await getWhatsAppLists(appUser.companyId);
      setContactLists(lists);
    } catch (error) {
      console.error('Error loading contact lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a phone number to send a test message',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message first',
        variant: 'destructive',
      });
      return;
    }

    setIsTestSending(true);
    try {
      const baseContact = loadedContacts[0] || {};
      const testRecipient: RecipientWithFields = {
        phone: testPhoneNumber,
        name: baseContact.name || 'Test User',
        status: 'pending',
      };
      
      Object.keys(baseContact).forEach(key => {
        if (!['phoneNumber', 'name', 'phone', 'status', 'id', 'createdAt', 'updatedAt', 'listId', 'companyId'].includes(key)) {
          const value = baseContact[key as keyof typeof baseContact];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            testRecipient[key] = value;
          }
        }
      });

      let result: SMSActionResult | undefined;
      if (selectedPlatform === 'fast2sms') {
        const route = forceQuickSMS ? 'q' : (dltTemplateId ? 'dlt' : 'q');
        const costWarning = route === 'q' ? ' (₹5 charge for test message)' : ' (₹0.20 charge for test message)';
        
        if (route === 'q') {
          const confirmed = window.confirm(`⚠️ Quick SMS Test Send${costWarning}\n\nYou will be charged ₹5 for this test message. Continue?`);
          if (!confirmed) {
            setIsTestSending(false);
            return;
          }
        }
        
        const fast2smsMappings = shouldShowQuickSMSMapping && quickSMSMappings.length > 0
          ? quickSMSMappings
          : variableMappings.length > 0 
            ? transformMappingsForFast2SMS(variableMappings)
            : undefined;
        
        result = await sendBulkSMSViaFast2SMSAction({
          idToken: appUser!.idToken!,
          message,
          recipients: [testRecipient],
          route,
          dltTemplateId: !forceQuickSMS && dltTemplateId ? dltTemplateId : undefined,
          variableMappings: fast2smsMappings,
        });
      } else if (selectedPlatform === 'msg91') {
        result = await sendBulkSMSViaMSG91Action({
          idToken: appUser!.idToken!,
          message,
          recipients: [testRecipient],
          messageType,
          templateId: templateId || undefined,
          dltTemplateId: dltTemplateId || undefined,
          variableMappings: variableMappings.length > 0 ? variableMappings : undefined,
        });
      } else if (selectedPlatform === 'twilio') {
        result = await sendBulkSMSViaTwilioAction({
          idToken: appUser!.idToken!,
          message,
          recipients: [testRecipient],
        });
      }

      if (result?.success) {
        toast({
          title: 'Test Message Sent!',
          description: `Test SMS sent to ${testPhoneNumber}`,
        });
        setTestPhoneNumber('');
      } else {
        toast({
          title: 'Test Send Failed',
          description: result?.error || 'Failed to send test message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send test message',
        variant: 'destructive',
      });
    } finally {
      setIsTestSending(false);
    }
  };

  const loadTemplates = async () => {
    if (!appUser?.idToken) {
      console.log('❌ loadTemplates early return: no idToken');
      return;
    }
    if (selectedPlatform === 'twilio') {
      console.log('📱 Twilio selected, clearing templates');
      setTemplates([]);
      return;
    }
    setIsLoadingTemplates(true);
    try {
      let result;
      
      // Use dedicated MSG91 action for MSG91 templates (loads from database, no API sync)
      if (selectedPlatform === 'msg91') {
        console.log('📨 Loading MSG91 templates...');
        result = await getMSG91TemplatesAction({ idToken: appUser.idToken });
        console.log('📨 getMSG91TemplatesAction result:', result);
        if (result.success && result.templates) {
          console.log('✅ Setting templates:', result.templates.length, 'templates found');
          // Transform MSG91Template to SMSTemplate format
          const transformedTemplates: SMSTemplate[] = result.templates.map(t => ({
            id: t.id,
            provider: 'msg91' as const,
            templateId: t.templateId,
            dltId: t.dltId,
            text: t.text,
            name: t.name,
            type: t.type,
            variables: t.variables?.length || 0,
            createdAt: t.createdAt,
            syncedAt: t.updatedAt || t.createdAt,
          }));
          setTemplates(transformedTemplates);
        } else {
          console.log('❌ No templates or API error:', result.error);
          setTemplates([]);
        }
      } else {
        console.log('📩 Loading', selectedPlatform, 'templates...');
        result = await getSMSTemplatesAction({
          idToken: appUser.idToken,
          provider: selectedPlatform as 'msg91' | 'fast2sms'
        });
        if (result.success && result.templates) {
          const filteredTemplates = result.templates.filter(t => t.provider === selectedPlatform);
          console.log('✅ Setting', filteredTemplates.length, selectedPlatform, 'templates');
          setTemplates(filteredTemplates);
        } else {
          console.log('❌ No templates or API error:', result.error);
          setTemplates([]);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSyncTemplates = async () => {
    if (!appUser?.idToken) return;
    setIsSyncingTemplates(true);
    try {
      const result = selectedPlatform === 'fast2sms'
        ? await syncFast2SMSTemplatesAction({ idToken: appUser.idToken })
        : selectedPlatform === 'msg91'
        ? await syncMSG91TemplatesAction({ idToken: appUser.idToken })
        : null;
      
      if (!result) {
        if (selectedPlatform === 'twilio') {
          toast({
            title: 'Template Sync Not Available',
            description: 'Twilio does not require template approval. You can send any message directly.',
            variant: 'default',
          });
          setIsSyncingTemplates(false);
          return;
        }
        toast({
          title: 'Sync Failed',
          description: 'Server returned no response. Please refresh the page and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      if (result.success) {
        toast({
          title: 'Templates Synced',
          description: `Fetched ${result.count || 0} templates from ${selectedPlatform.toUpperCase()}`,
        });
        await loadTemplates();
      } else {
        toast({
          title: 'Sync Failed',
          description: result.error || 'Failed to sync templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sync templates. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const handleSelectTemplate = (template: SMSTemplate) => {
    setSelectedTemplate(template);
    setTemplateId(template.templateId);
    setDltTemplateId(template.dltId);
    setMessage(template.text);
  };

  useEffect(() => {
    const loadContactsForPreview = async () => {
      if (!selectedListId || !appUser?.companyId) {
        setLoadedContacts([]);
        return;
      }
      
      try {
        const contacts = await getWhatsAppContacts(selectedListId, appUser.companyId);
        setLoadedContacts(contacts);
      } catch (error) {
        console.error('Error loading contacts for preview:', error);
        setLoadedContacts([]);
      }
    };
    
    loadContactsForPreview();
  }, [selectedListId, appUser?.companyId]);

  // HIDDEN: Cost calculation disabled (future: re-enable if monetizing with markup)
  // useEffect(() => {
  //   const calculateCost = async () => {
  //     if (!message || !selectedListId || !appUser?.idToken) {
  //       setEstimatedCost(null);
  //       return;
  //     }
  //
  //     if (selectedPlatform !== 'msg91') {
  //       setEstimatedCost(null);
  //       return;
  //     }
  //
  //     try {
  //       const selectedList = contactLists.find(l => l.id === selectedListId);
  //       const recipientCount = selectedList?.contactCount || 0;
  //       
  //       if (recipientCount === 0) return;
  //
  //       const result = await calculateSMSCostAction({
  //         message,
  //         recipientCount,
  //       });
  //
  //       setSmsCount(result.smsCount || 1);
  //       setEstimatedCost(result.estimatedCost || 0);
  //     } catch (error) {
  //       console.error('Error calculating cost:', error);
  //     }
  //   };
  //
  //   calculateCost();
  // }, [message, selectedListId, selectedPlatform, appUser?.idToken, contactLists]);

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

    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter your SMS message',
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

    if (selectedPlatform !== 'twilio') {
      if (!forceQuickSMS && selectedPlatform === 'fast2sms' && !dltTemplateId.trim()) {
        toast({
          title: 'DLT Template ID Required',
          description: 'DLT Template ID is required for DLT mode in India (TRAI compliance). Please select a template or switch to Quick SMS mode.',
          variant: 'destructive',
        });
        return;
      }

      if (selectedPlatform === 'msg91' && !dltTemplateId.trim()) {
        toast({
          title: 'DLT Template ID Required',
          description: 'DLT Template ID is required for all SMS in India (TRAI compliance). Please select or enter a template.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSending(true);
    try {
      const contacts = await getWhatsAppContacts(selectedListId, appUser.companyId);
      
      if (contacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'The selected list has no contacts',
          variant: 'destructive',
        });
        return;
      }

      const recipients: RecipientWithFields[] = contacts.map(contact => {
        const recipient: RecipientWithFields = {
          phone: contact.phoneNumber,
          name: contact.name,
          status: 'pending',
        };
        
        Object.keys(contact).forEach(key => {
          if (!['phoneNumber', 'name', 'status', 'id', 'createdAt', 'updatedAt', 'listId', 'companyId'].includes(key)) {
            const value = contact[key as keyof typeof contact];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              recipient[key] = value;
            }
          }
        });
        
        return recipient;
      });

      let result: SMSActionResult;
      if (selectedPlatform === 'msg91') {
        result = await sendBulkSMSViaMSG91Action({
          idToken: appUser.idToken!,
          message,
          recipients,
          messageType,
          templateId: templateId || undefined,
          dltTemplateId: dltTemplateId || undefined,
          variableMappings: variableMappings.length > 0 ? variableMappings : undefined,
        });
      } else if (selectedPlatform === 'fast2sms') {
        const route = forceQuickSMS ? 'q' : (dltTemplateId ? 'dlt' : 'q');
        const scheduledTime = scheduledDateTime ? Math.floor(new Date(scheduledDateTime).getTime() / 1000) : undefined;
        
        const fast2smsMappings = shouldShowQuickSMSMapping && quickSMSMappings.length > 0
          ? quickSMSMappings
          : variableMappings.length > 0 
            ? transformMappingsForFast2SMS(variableMappings)
            : undefined;
        
        result = await sendBulkSMSViaFast2SMSAction({
          idToken: appUser.idToken!,
          message,
          recipients,
          route,
          dltTemplateId: !forceQuickSMS && dltTemplateId ? dltTemplateId : undefined,
          variableMappings: fast2smsMappings,
          scheduledTime,
        });
      } else if (selectedPlatform === 'twilio') {
        result = await sendBulkSMSViaTwilioAction({
          idToken: appUser.idToken!,
          message,
          recipients,
        });
      } else {
        throw new Error('Invalid platform selected');
      }

      if (result.success) {
        const sentCount = result.sent ?? recipients.length;
        const failedCount = result.failed ?? 0;
        
        const failedPhones = new Set((result.failedRecipients || []).map(f => f.phone));
        const updatedRecipients = recipients.map(recipient => ({
          ...recipient,
          status: failedPhones.has(recipient.phone) ? 'failed' as const : 'sent' as const,
        }));

        const campaignStatus = failedCount === recipients.length ? 'failed' : 'completed';

        const campaign: Omit<SMSCampaign, 'id' | 'createdAt'> = {
          companyId: appUser.companyId,
          name: campaignName,
          platform: selectedPlatform,
          messageType,
          message,
          recipients: updatedRecipients,
          status: campaignStatus,
          createdBy: appUser.uid,
          sentAt: new Date().toISOString(),
          stats: {
            total: recipients.length,
            sent: sentCount,
            delivered: 0,
            failed: failedCount,
          },
          // HIDDEN: Cost not shown to users (affiliate model)
          // estimatedCost: result.estimatedCost,
          dltTemplateId: dltTemplateId || '',
        };

        await addSMSCampaign(campaign);

        if (sentCount > 0) {
          triggerConfetti();
        }

        if (failedCount > 0) {
          toast({
            title: 'Campaign Partially Sent',
            description: `${sentCount} sent, ${failedCount} failed`,
            variant: failedCount === recipients.length ? 'destructive' : 'default',
          });
        } else {
          toast({
            title: 'Campaign Sent Successfully!',
            description: `Sent to ${sentCount} contacts`,
          });
        }

        setCampaignName('');
        setMessage('');
        setDltTemplateId('');
        setTemplateId('');
        setSelectedTemplate(null);
        setVariableMappings([]);
        setQuickSMSMappings([]);
        setSelectedListId('');
        setActiveTab('campaigns');
        loadCampaigns();
      } else {
        throw new Error(result.error || 'Failed to send campaign');
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

  const handleViewCampaign = async (campaign: SMSCampaign) => {
    if (!appUser?.companyId) return;
    
    setSelectedCampaign(campaign);
    setShowDetailsDialog(true);
    setIsLoadingRecipients(true);
    
    try {
      const recipients = await getSMSCampaignRecipients(appUser.companyId, campaign.id);
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
      await deleteSMSCampaign(appUser.companyId, campaignId);
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

  const getStatusBadge = (status: SMSCampaign['status']) => {
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
    <div className="space-y-4">
      {campaigns.length === 0 && !isLoadingCampaigns && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Quick Start Guide</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2 mt-2">
              <p className="text-sm">To send your first SMS bulk campaign:</p>
              <ol className="text-sm space-y-1 ml-4 list-decimal">
                <li>Connect MSG91 or Fast2SMS in Settings</li>
                <li>Create a contact list in WhatsApp Marketing</li>
                <li>Come back here and sync your DLT-approved templates</li>
                <li>Select a template and send to bulk contacts</li>
              </ol>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button asChild className="min-h-11" variant="outline">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings
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
                    View and manage your SMS bulk campaigns
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
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first SMS bulk campaign to get started
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Type</TableHead>
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
                            <TableCell className="capitalize">{campaign.messageType}</TableCell>
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

          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedCampaign?.name}</DialogTitle>
                <DialogDescription>
                  Campaign details and recipient status
                </DialogDescription>
              </DialogHeader>
              {selectedCampaign && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="font-medium">{getStatusBadge(selectedCampaign.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{selectedCampaign.stats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sent</p>
                      <p className="font-medium text-green-600">{selectedCampaign.stats.sent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="font-medium text-red-600">{selectedCampaign.stats.failed}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Recipients</p>
                    <ScrollArea className="h-64 border rounded-lg p-4">
                      {isLoadingRecipients ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : campaignRecipients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recipient details available</p>
                      ) : (
                        <div className="space-y-2">
                          {campaignRecipients.map((recipient, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-muted rounded">
                              <span>{recipient.phone}</span>
                              <Badge variant={recipient.status === 'sent' ? 'default' : 'destructive'}>
                                {recipient.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>
                Create and send SMS bulk campaigns with DLT-approved templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Flash Sale Alert"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className={`grid gap-4 ${(selectedPlatform === 'fast2sms' && dltTemplateId) ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="platform">SMS Platform</Label>
                  <Select value={selectedPlatform} onValueChange={(value) => {
                    setSelectedPlatform(value as 'msg91' | 'fast2sms' | 'twilio');
                    setTemplates([]);
                    setSelectedTemplate(null);
                    setDltTemplateId('');
                    setTemplateId('');
                  }}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msg91">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50">MSG91</Badge>
                          <Badge variant="secondary" className="text-xs">India + Global</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="fast2sms">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50">Fast2SMS</Badge>
                          <Badge variant="secondary" className="text-xs">India Only</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="twilio">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-red-50">Twilio</Badge>
                          <Badge variant="secondary" className="text-xs">Global</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!(selectedPlatform === 'fast2sms' && dltTemplateId) && (
                  <div className="space-y-2">
                    <Label htmlFor="messageType">Message Type</Label>
                    <Select value={messageType} onValueChange={(value) => setMessageType(value as 'promotional' | 'transactional')}>
                      <SelectTrigger id="messageType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {selectedPlatform === 'fast2sms' && (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                    <Label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="smsMode"
                        value="quick"
                        checked={forceQuickSMS}
                        onChange={() => {
                          setForceQuickSMS(true);
                          setDltTemplateId('');
                          setSelectedTemplate(null);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Quick SMS Mode (Higher cost, no template needed)</span>
                    </Label>
                    <Label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="smsMode"
                        value="dlt"
                        checked={!forceQuickSMS}
                        onChange={() => setForceQuickSMS(false)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">DLT Template Mode (Cost-effective, TRAI compliant)</span>
                    </Label>
                  </div>

                  <Alert className={forceQuickSMS ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' : 'border-green-200 bg-green-50 dark:bg-green-900/20'}>
                    <MessageSquare className={`h-4 w-4 ${forceQuickSMS ? 'text-orange-600' : 'text-green-600'}`} />
                    <AlertTitle className={forceQuickSMS ? 'text-orange-900 dark:text-orange-100' : 'text-green-900 dark:text-green-100'}>
                      {forceQuickSMS ? 'Quick SMS Mode Active' : 'DLT Template Mode Active'}
                    </AlertTitle>
                    <AlertDescription className={forceQuickSMS ? 'text-orange-800 dark:text-orange-200 text-sm' : 'text-green-800 dark:text-green-200 text-sm'}>
                      {forceQuickSMS ? (
                        <div className="space-y-1">
                          <p><strong>Higher Cost</strong> - For exact pricing, check your Fast2SMS dashboard</p>
                          <p className="text-xs">Send any message anytime without template approval</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p><strong>Cost-effective</strong> - For exact pricing, check your Fast2SMS dashboard</p>
                          <p className="text-xs">Using TRAI-approved DLT template for compliance - Select template below</p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">SMS Message</Label>
                <Textarea
                  id="message"
                  placeholder={forceQuickSMS && selectedPlatform === 'fast2sms' ? "Enter your SMS message... (Use {name}, {phone}, {email} or other contact fields for personalization)" : "Enter your SMS message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {message.length} characters · {smsCount} SMS
                  {smsCount > 1 && ' (Long message will be split)'}
                </p>
              </div>

              {shouldShowQuickSMSMapping && (
                <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-900 dark:text-purple-100">Personalization with Variables</p>
                  <p className="text-xs text-purple-800 dark:text-purple-200">Add these variables to your message to personalize for each contact:</p>
                  
                  {loadedContacts.length > 0 && (
                    <div className="p-2 bg-white dark:bg-slate-800 rounded border border-purple-300 dark:border-purple-600">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Your Contact Fields:</p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {Object.keys(loadedContacts[0] || {})
                          .filter(k => !['id', 'createdAt', 'updatedAt', 'listId', 'companyId'].includes(k))
                          .map(key => {
                            const value = loadedContacts[0][key as keyof typeof loadedContacts[0]];
                            return (
                              <div key={key} className="flex justify-between gap-2">
                                <span className="font-mono text-purple-600 dark:text-purple-400">{key}:</span>
                                <span className="text-gray-500 dark:text-gray-500">{String(value).substring(0, 30)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Click to Add Variables to Message:</p>
                    <div className="flex flex-wrap gap-2">
                      {['name', 'phone', 'email'].map((field) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => {
                            const variable = `{${field}}`;
                            setMessage(message + variable);
                          }}
                          className="px-2 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 text-xs rounded font-mono"
                        >
                          {`{${field}}`}
                        </button>
                      ))}
                      {loadedContacts.length > 0 && Object.keys(loadedContacts[0] || {})
                        .filter(k => !['name', 'phone', 'email', 'phoneNumber', 'id', 'createdAt', 'updatedAt', 'listId', 'companyId'].includes(k))
                        .map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              const variable = `{${field}}`;
                              setMessage(message + variable);
                            }}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs rounded font-mono"
                          >
                            {`{${field}}`}
                          </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only fields shown above are available for personalization. Add more fields to your contacts to enable more variables.</p>
                  </div>

                  {quickSMSMappings.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Variable Mapping</p>
                      <div className="space-y-2">
                        {quickSMSMappings.map((mapping) => (
                          <div key={mapping.variableName} className="p-2 bg-white dark:bg-slate-800 rounded border border-purple-200 dark:border-purple-700 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                {`{${mapping.variableName}}`}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Select 
                                value={mapping.mappingType}
                                onValueChange={(val) => updateQuickSMSMapping(mapping.variableName, val as 'contact_field' | 'static', mapping.mappingValue)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contact_field">Contact Field</SelectItem>
                                  <SelectItem value="static">Static Value</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {mapping.mappingType === 'contact_field' ? (
                                <Select
                                  value={mapping.mappingValue || 'name'}
                                  onValueChange={(val) => updateQuickSMSMapping(mapping.variableName, 'contact_field', val)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableContactFields.map((field) => (
                                      <SelectItem key={field.value} value={field.value}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={mapping.mappingValue}
                                  onChange={(e) => updateQuickSMSMapping(mapping.variableName, 'static', e.target.value)}
                                  placeholder="Enter static value"
                                  className="h-8 text-xs"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedListId && loadedContacts.length > 0 && message.includes('{') && (
                    <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                      <Label className="text-xs font-medium">Preview & Test Message</Label>
                      <div className="space-y-2">
                        <Select defaultValue={loadedContacts[0]?.id || ''}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select a contact to test with" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadedContacts.slice(0, 20).map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name || contact.phoneNumber} ({contact.phoneNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {message.includes('{') && (
                          <div className="p-2 bg-white dark:bg-slate-800 rounded border border-purple-200 dark:border-purple-700">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Preview:</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                              {message.replace(/\{(\w+)\}/g, (match, field) => {
                                const mapping = quickSMSMappings.find(m => m.variableName === field);
                                const testContact = loadedContacts[0];
                                if (mapping && testContact) {
                                  if (mapping.mappingType === 'static') {
                                    return mapping.mappingValue || `[${field}]`;
                                  }
                                  const fieldValue = testContact[mapping.mappingValue as keyof typeof testContact];
                                  return String(fieldValue || `[${field}]`);
                                }
                                if (testContact) {
                                  const value = testContact[field as keyof typeof testContact];
                                  return String(value || `[${field}]`);
                                }
                                return match;
                              })}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            placeholder="Test phone number"
                            value={testPhoneNumber}
                            onChange={(e) => setTestPhoneNumber(e.target.value)}
                            disabled={isTestSending}
                            className="flex-1 h-8 text-xs"
                          />
                          <Button
                            onClick={handleTestSend}
                            disabled={isTestSending || !message.trim() || !testPhoneNumber.trim()}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            {isTestSending ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Test (₹5)'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scheduledDateTime">Schedule Message (Optional)</Label>
                <Input
                  id="scheduledDateTime"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {scheduledDateTime 
                    ? `Message will be sent on ${new Date(scheduledDateTime).toLocaleString()}`
                    : 'Leave empty to send immediately'}
                </p>
              </div>

              {(!forceQuickSMS || selectedPlatform === 'msg91') && (
              <div className="space-y-3">
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-900 dark:text-red-100">DLT Approval Required</AlertTitle>
                  <AlertDescription className="text-red-800 dark:text-red-200 text-sm">
                    In India, <strong>ALL SMS messages (both promotional AND transactional) MUST use DLT-approved templates</strong>. This is a TRAI requirement. Select a template below or enter your DLT Template ID.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label>Approved Templates</Label>
                      <div className="flex items-center gap-2">
                        {selectedPlatform === 'msg91' && appUser?.idToken && (
                          <AddTemplateDialog 
                            idToken={appUser.idToken} 
                            onTemplateAdded={loadTemplates}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSyncTemplates}
                          disabled={isSyncingTemplates || isLoadingTemplates}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1.5 ${isSyncingTemplates ? 'animate-spin' : ''}`} />
                          Sync Templates
                        </Button>
                      </div>
                    </div>

                    {templates.length > 0 ? (
                      <Select value={selectedTemplate?.id || ''} onValueChange={(templateId) => {
                        const t = templates.find(t => t.id === templateId);
                        if (t) handleSelectTemplate(t);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an approved template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => {
                            // Safely get variable count
                            const varCount = typeof template.variables === 'number' 
                              ? template.variables 
                              : Array.isArray(template.variables) 
                              ? template.variables.length 
                              : 0;
                            return (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2">
                                  <span>{template.name || `Template ${template.templateId.substring(0, 8)}`}</span>
                                  <Badge variant="secondary" className="text-xs">{varCount} var</Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        {isLoadingTemplates ? 'Loading templates...' : 'No templates found. Click "Sync Templates" to fetch your approved templates from ' + selectedPlatform.toUpperCase()}
                      </div>
                    )}

                    {selectedTemplate && (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Template Message:</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{selectedTemplate.text}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Auto-Fetched Template IDs</Label>
                          
                          <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">DLT Template ID (TRAI Approval)</p>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                readOnly 
                                value={dltTemplateId} 
                                className="flex-1 px-2 py-1.5 text-sm font-mono bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded text-green-900 dark:text-green-100"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(dltTemplateId);
                                  toast({ title: 'Copied DLT ID', description: dltTemplateId });
                                }}
                                className="px-2 py-1.5 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-200 text-xs font-medium rounded"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                              {selectedPlatform === 'msg91' ? 'MSG91 Template ID' : 'Fast2SMS Template ID'}
                            </p>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                readOnly 
                                value={templateId} 
                                className="flex-1 px-2 py-1.5 text-sm font-mono bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded text-purple-900 dark:text-purple-100"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(templateId);
                                  toast({ title: `Copied ${selectedPlatform.toUpperCase()} ID`, description: templateId });
                                }}
                                className="px-2 py-1.5 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 text-xs font-medium rounded"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>

                        <VariableMapping
                          template={selectedTemplate}
                          provider={selectedPlatform}
                          contacts={loadedContacts.map(c => ({ 
                            name: c.name, 
                            phone: c.phoneNumber
                          }))}
                          onMappingsChange={setVariableMappings}
                        />

                        <div className={`mt-4 p-3 rounded-lg border space-y-3 ${
                          selectedPlatform === 'fast2sms' && forceQuickSMS
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        }`}>
                          <p className={`text-xs font-medium ${
                            selectedPlatform === 'fast2sms' && forceQuickSMS
                              ? 'text-red-900 dark:text-red-100'
                              : 'text-blue-900 dark:text-blue-100'
                          }`}>
                            Test Send Before Campaign
                            {selectedPlatform === 'fast2sms' && forceQuickSMS && ' - ₹5 charge'}
                            {selectedPlatform === 'fast2sms' && !forceQuickSMS && dltTemplateId && ' - DLT'}
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Phone number (e.g., 9876543210)"
                              value={testPhoneNumber}
                              onChange={(e) => setTestPhoneNumber(e.target.value)}
                              disabled={isTestSending}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleTestSend}
                              disabled={isTestSending || !message.trim()}
                              size="sm"
                              variant={selectedPlatform === 'fast2sms' && forceQuickSMS ? 'destructive' : 'outline'}
                            >
                              {isTestSending ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Send Test'
                              )}
                            </Button>
                          </div>
                          <p className={`text-xs ${
                            selectedPlatform === 'fast2sms' && forceQuickSMS
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-muted-foreground'
                          }`}>
                            {selectedPlatform === 'fast2sms' && forceQuickSMS
                              ? 'Quick SMS charges ₹5 per message. This test will deduct ₹5 from your balance. Verify variables are correct before bulk send!'
                              : 'Test your message with a single phone number before sending to the entire list.'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="contactList">Select Contact List</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger id="contactList">
                    <SelectValue placeholder="Select a contact list" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLists ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : contactLists.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        No contact lists found. Create one in WhatsApp Marketing first.
                      </div>
                    ) : (
                      contactLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          <div className="flex items-center gap-2">
                            <span>{list.name}</span>
                            <Badge variant="secondary" className="text-xs">{list.contactCount} contacts</Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* HIDDEN: Pricing display disabled (affiliate model - no markup shown)
              {estimatedCost !== null && selectedPlatform === 'msg91' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Estimated Cost: ₹{estimatedCost.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {contactLists.find(l => l.id === selectedListId)?.contactCount || 0} recipients × {smsCount} SMS each
                      </p>
                    </div>
                  </div>
                </div>
              )}
              */}

              <Button
                onClick={handleCreateCampaign}
                disabled={isSending || !campaignName || !message || !selectedListId}
                className="w-full"
                size="lg"
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
