"use client";

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, Info, Image, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { WhatsAppList } from '@/types/whatsapp';
import { getWhatsAppContacts } from '@/lib/whatsapp-marketing-data';
import { addWhatsAppCampaign } from '@/lib/messaging-campaigns-data';
import { Checkbox } from '@/components/ui/checkbox';

const getWATITemplatesAction = async (idToken: string) => {
  const { getWATITemplatesAction: action } = await import('@/app/actions/wati-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaWATIAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaWATIAction: action } = await import('@/app/actions/wati-actions');
  return action(...args);
};

const sendBulkWhatsAppViaAiSensyAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaAiSensyAction: action } = await import('@/app/actions/aisensy-actions');
  return action(...args);
};

const getMetaWhatsAppTemplatesAction = async (idToken: string) => {
  const { getMetaWhatsAppTemplatesAction: action } = await import('@/app/actions/meta-whatsapp-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaMetaAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaMetaAction: action } = await import('@/app/actions/meta-whatsapp-actions');
  return action(...args);
};

const getAuthkeyTemplatesAction = async (idToken: string) => {
  const { getAuthkeyTemplatesAction: action } = await import('@/app/actions/authkey-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaAuthkeyAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaAuthkeyAction: action } = await import('@/app/actions/authkey-actions');
  return action(...args);
};

const saveTemplateMediaUrlAction = async (idToken: string, templateId: string, mediaUrl: string) => {
  const { saveTemplateMediaUrlAction: action } = await import('@/app/actions/authkey-actions');
  return action(idToken, templateId, mediaUrl);
};

const getTemplateMediaUrlsAction = async (idToken: string) => {
  const { getTemplateMediaUrlsAction: action } = await import('@/app/actions/authkey-actions');
  return action(idToken);
};

const getGupshupTemplatesAction = async (idToken: string) => {
  const { getGupshupTemplatesAction: action } = await import('@/app/actions/gupshup-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaGupshupAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaGupshupAction: action } = await import('@/app/actions/gupshup-actions');
  return action(...args);
};

const getMSG91WhatsAppTemplatesAction = async (idToken: string) => {
  const { getMSG91WhatsAppTemplatesAction: action } = await import('@/app/actions/msg91-whatsapp-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaMSG91Action = async (...args: any[]) => {
  const { sendBulkWhatsAppViaMSG91Action: action } = await import('@/app/actions/msg91-whatsapp-actions');
  return action(...args);
};

const getFast2SMSWhatsAppTemplatesAction = async (idToken: string) => {
  const { getFast2SMSWhatsAppTemplatesAction: action } = await import('@/app/actions/fast2sms-whatsapp-actions');
  return action(idToken);
};

const sendBulkWhatsAppViaFast2SMSAction = async (...args: any[]) => {
  const { sendBulkWhatsAppViaFast2SMSAction: action } = await import('@/app/actions/fast2sms-whatsapp-actions');
  return action(...args);
};

const triggerConfetti = async () => {
  const confetti = (await import('canvas-confetti')).default;
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

interface CreateCampaignFormProps {
  whatsappLists: WhatsAppList[];
  onCampaignCreated: () => void;
  onTabChange: (tab: string) => void;
}

export default function CreateCampaignForm({
  whatsappLists,
  onCampaignCreated,
  onTabChange,
}: CreateCampaignFormProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'wati' | 'aisensy' | 'meta' | 'authkey' | 'gupshup' | 'msg91WhatsApp' | 'fast2smsWhatsApp'>('authkey');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [isMediaTemplate, setIsMediaTemplate] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [savedMediaUrls, setSavedMediaUrls] = useState<Record<string, string>>({});
  const [isSavingMediaUrl, setIsSavingMediaUrl] = useState(false);
  const [mediaUrlSaved, setMediaUrlSaved] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const loadTemplates = async () => {
    if (!appUser?.idToken) return;
    setIsLoadingTemplates(true);
    try {
      let result: any;
      
      if (selectedPlatform === 'wati') {
        result = await getWATITemplatesAction(appUser.idToken);
      } else if (selectedPlatform === 'meta') {
        result = await getMetaWhatsAppTemplatesAction(appUser.idToken);
      } else if (selectedPlatform === 'authkey') {
        result = await getAuthkeyTemplatesAction(appUser.idToken);
        // Also load saved media URLs for Authkey templates
        const mediaUrlsResult = await getTemplateMediaUrlsAction(appUser.idToken);
        if (mediaUrlsResult.success && mediaUrlsResult.mediaUrls) {
          setSavedMediaUrls(mediaUrlsResult.mediaUrls);
        }
      } else if (selectedPlatform === 'gupshup') {
        result = await getGupshupTemplatesAction(appUser.idToken);
      } else if (selectedPlatform === 'msg91WhatsApp') {
        result = await getMSG91WhatsAppTemplatesAction(appUser.idToken);
      } else if (selectedPlatform === 'fast2smsWhatsApp') {
        result = await getFast2SMSWhatsAppTemplatesAction(appUser.idToken);
      }
      
      if (result?.success && result.templates) {
        const approvedTemplates = result.templates.filter((t: any) => 
          t.status === 'APPROVED' || !t.status
        );
        setTemplates(approvedTemplates);
        
        // Show helpful toast for WMart CPaaS
        if (selectedPlatform === 'authkey' && approvedTemplates.length > 0) {
          const mediaTemplates = approvedTemplates.filter((t: any) => 
            t.temp_header_type === 'IMAGE' || t.temp_header_type === 'VIDEO' || t.temp_header_type === 'DOCUMENT'
          );
          toast({
            title: `${approvedTemplates.length} Template(s) Loaded`,
            description: mediaTemplates.length > 0 
              ? `Found ${mediaTemplates.length} media template(s). Use {{1}} for contact name. Paste media URL from cpaas.wmart.in once - it will be saved!`
              : `Use {{1}} for contact name variable. OmniFlow auto-fills with each contact's name.`,
            variant: 'default',
          });
        } else if (approvedTemplates.length === 0) {
          toast({
            title: 'No Templates Found',
            description: selectedPlatform === 'authkey' 
              ? 'Create templates at cpaas.wmart.in → WhatsApp → Templates. Use {{1}} for contact name.'
              : 'No approved templates found. Please create and approve templates in your dashboard first.',
            variant: 'default',
          });
        }
      } else {
        setTemplates([]);
        const isNotConfigured = result?.error?.includes('not configured') || 
                                result?.error?.includes('Please add') ||
                                result?.error?.includes('API Key');
        
        if (selectedPlatform === 'authkey' && isNotConfigured) {
          toast({
            title: 'WMart CPaaS Setup Required',
            description: 'Connect your account in Settings. Get your API key from cpaas.wmart.in',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Connection Issue',
            description: result?.error || 'Could not load templates. Please check your API credentials.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const getTemplateId = (template: any): string => {
    return template.id || template.wid?.toString() || template.elementName || template.name || '';
  };

  const findTemplateById = (templateId: string) => {
    return templates.find((t: any) => getTemplateId(t) === templateId);
  };

  const checkIfMediaTemplate = (templateId: string) => {
    const template = findTemplateById(templateId);
    if (!template) return false;
    
    // Check if template has media header component
    if (template.components && Array.isArray(template.components)) {
      return template.components.some((c: any) => 
        c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format)
      );
    }
    
    // Check for header type field
    const headerType = (template.headerType || template.header_type || template.temp_header_type || '').toUpperCase();
    return ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setMediaUrlSaved(false);
    setImageLoadError(false);
    
    const isMedia = checkIfMediaTemplate(templateId);
    setIsMediaTemplate(isMedia);
    
    // Auto-populate saved media URL if available
    if (isMedia && savedMediaUrls[templateId]) {
      setMediaUrl(savedMediaUrls[templateId]);
      setMediaUrlSaved(true);
    } else {
      setMediaUrl('');
    }
  };

  const handleSaveMediaUrl = async () => {
    if (!appUser?.idToken || !selectedTemplate || !mediaUrl) return;
    
    setIsSavingMediaUrl(true);
    try {
      const result = await saveTemplateMediaUrlAction(appUser.idToken, selectedTemplate, mediaUrl);
      if (result.success) {
        setSavedMediaUrls(prev => ({ ...prev, [selectedTemplate]: mediaUrl }));
        setMediaUrlSaved(true);
        toast({
          title: 'Media URL Saved',
          description: 'This URL will be auto-filled next time you use this template.',
        });
      } else {
        toast({
          title: 'Failed to Save',
          description: result.error || 'Could not save media URL',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving media URL:', error);
    } finally {
      setIsSavingMediaUrl(false);
    }
  };

  useEffect(() => {
    if (appUser?.idToken && selectedPlatform) {
      setSelectedTemplate('');
      setTemplates([]);
      setMediaUrl('');
      setIsMediaTemplate(false);
      setMediaUrlSaved(false);
      setSavedMediaUrls({});
      if (selectedPlatform !== 'aisensy') {
        loadTemplates();
      }
    }
  }, [selectedPlatform, appUser?.idToken]);

  const handleSendCampaign = async () => {
    if (!appUser?.companyId || !appUser?.idToken) return;
    if (!campaignName.trim()) {
      toast({ title: 'Error', description: 'Please enter a campaign name', variant: 'destructive' });
      return;
    }
    if (!selectedTemplate.trim()) {
      toast({ title: 'Error', description: 'Please select or enter a template', variant: 'destructive' });
      return;
    }
    if (!selectedListId) {
      toast({ title: 'Error', description: 'Please select a recipient list', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const contacts = await getWhatsAppContacts(appUser.companyId, selectedListId);
      if (!contacts || contacts.length === 0) {
        toast({ title: 'Error', description: 'Selected list has no contacts', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      const recipients = contacts.map(c => ({
        phone: c.phoneNumber.startsWith('+') ? c.phoneNumber : `+${c.phoneNumber}`,
        name: c.name,
        parameters: [c.name.split(' ')[0]],
      }));

      let result: any;
      if (selectedPlatform === 'wati') {
        result = await sendBulkWhatsAppViaWATIAction({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            variables: { '1': r.name.split(' ')[0] }
          })),
          broadcastName: campaignName
        });
      } else if (selectedPlatform === 'aisensy') {
        result = await sendBulkWhatsAppViaAiSensyAction({
          idToken: appUser.idToken,
          campaignName: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            variables: { '1': r.name.split(' ')[0] }
          }))
        });
      } else if (selectedPlatform === 'meta') {
        result = await sendBulkWhatsAppViaMetaAction(appUser.idToken, {
          templateName: selectedTemplate,
          languageCode: 'en',
          recipients: recipients.map(r => ({
            phone: r.phone,
            parameters: r.parameters
          }))
        });
      } else if (selectedPlatform === 'authkey') {
        result = await sendBulkWhatsAppViaAuthkeyAction(appUser.idToken, {
          templateName: selectedTemplate,
          templateType: isMediaTemplate ? 'media' : 'text',
          headerImageUrl: isMediaTemplate && mediaUrl ? mediaUrl : undefined,
          recipients: recipients.map(r => ({
            phone: r.phone,
            parameters: r.parameters
          }))
        });
      } else if (selectedPlatform === 'gupshup') {
        result = await sendBulkWhatsAppViaGupshupAction({
          idToken: appUser.idToken,
          source: '',
          templateId: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            params: r.parameters
          }))
        });
      } else if (selectedPlatform === 'msg91WhatsApp') {
        result = await sendBulkWhatsAppViaMSG91Action({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          languageCode: 'en',
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            parameters: r.parameters
          }))
        });
      } else if (selectedPlatform === 'fast2smsWhatsApp') {
        result = await sendBulkWhatsAppViaFast2SMSAction({
          idToken: appUser.idToken,
          templateName: selectedTemplate,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
            parameters: r.parameters
          }))
        });
      }

      if (result?.success) {
        await addWhatsAppCampaign(appUser.companyId, {
          name: campaignName,
          platform: selectedPlatform,
          templateName: selectedTemplate,
          listId: selectedListId,
          status: 'completed',
          recipientCount: recipients.length,
          successCount: result.successCount || recipients.length,
          failureCount: result.failureCount || 0,
        });

        await triggerConfetti();
        
        toast({
          title: 'Campaign Sent!',
          description: `Successfully sent to ${result.successCount || recipients.length} contacts`,
        });
        
        setCampaignName('');
        setSelectedTemplate('');
        setSelectedListId('');
        setMediaUrl('');
        setIsMediaTemplate(false);
        setMediaUrlSaved(false);
        onTabChange('campaigns');
        onCampaignCreated();
      } else {
        throw new Error(result?.error || 'Campaign send failed');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Campaign</CardTitle>
        <CardDescription>Send WhatsApp messages to your contact list</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">WhatsApp Platform</Label>
          <Select value={selectedPlatform} onValueChange={(v: any) => setSelectedPlatform(v)}>
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="authkey">WMart CPaaS (Recommended)</SelectItem>
              <SelectItem value="meta">Meta WhatsApp Business</SelectItem>
              <SelectItem value="gupshup">Gupshup</SelectItem>
              <SelectItem value="wati">WATI</SelectItem>
              <SelectItem value="aisensy">AiSensy</SelectItem>
              <SelectItem value="msg91WhatsApp">MSG91</SelectItem>
              <SelectItem value="fast2smsWhatsApp">Fast2SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaignName">Campaign Name</Label>
          <Input
            id="campaignName"
            placeholder="e.g., Summer Sale 2025"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">
            {selectedPlatform === 'aisensy' ? 'AiSensy Campaign Name' : 'Template'}
          </Label>
          {selectedPlatform === 'wati' || selectedPlatform === 'meta' || selectedPlatform === 'gupshup' || (selectedPlatform === 'authkey' && templates.length > 0) ? (
            <Select value={selectedTemplate} onValueChange={selectedPlatform === 'authkey' ? handleTemplateChange : setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                ) : templates.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No templates found. Please check your platform settings.
                  </div>
                ) : (
                  templates.map((template) => {
                    const templateId = getTemplateId(template);
                    const displayName = template.elementName || template.name;
                    const hasMediaHeader = template.components?.some((c: any) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
                    return (
                      <SelectItem key={templateId} value={templateId}>
                        {displayName}
                        {hasMediaHeader && ' (Media)'}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="template"
              placeholder={selectedPlatform === 'aisensy' ? 'Enter AiSensy campaign name' : 'Enter template name'}
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            />
          )}
        </div>

        {selectedPlatform === 'authkey' && selectedTemplate && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isMediaTemplate"
                checked={isMediaTemplate}
                onCheckedChange={(checked) => {
                  setIsMediaTemplate(checked === true);
                  if (!checked) {
                    setMediaUrl('');
                  }
                }}
              />
              <Label htmlFor="isMediaTemplate" className="text-sm font-normal cursor-pointer">
                This template has an image/video/document header
              </Label>
            </div>
          </div>
        )}

        {selectedPlatform === 'authkey' && isMediaTemplate && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <Label htmlFor="mediaUrl" className="font-medium">Media URL</Label>
              {mediaUrlSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Paste the image/video/document URL from your CPaaS panel. It will be saved for this template so you won't need to paste it again.
            </p>
            <div className="text-xs space-y-2 p-2 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700">
              <p className="font-semibold text-amber-900 dark:text-amber-100">⚠️ Media Requirements:</p>
              <ul className="list-disc ml-4 space-y-1 text-amber-800 dark:text-amber-200">
                <li><strong>Use WMart CPaaS URLs only</strong> - External URLs won't work</li>
                <li>Image: Max <strong>5 MB</strong> (JPEG/PNG)</li>
                <li>Video: Max <strong>16 MB</strong> (MP4 only)</li>
                <li>Document: Max <strong>100 MB</strong> (PDF)</li>
                <li>URL must start with: <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">https://wpgallery.s3...</code></li>
              </ul>
              <p className="text-amber-700 dark:text-amber-300 pt-1">
                Get your media URL from: <a href="https://cpaas.wmart.in" target="_blank" className="underline hover:text-amber-600">WMart CPaaS Dashboard</a> → WhatsApp → Templates → Click template → Copy Header Media URL
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                id="mediaUrl"
                placeholder="https://wpgallery.s3.ap-south-1.amazonaws.com/gallery/..."
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value);
                  setMediaUrlSaved(false);
                  setImageLoadError(false);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveMediaUrl}
                disabled={!mediaUrl || isSavingMediaUrl || mediaUrlSaved}
              >
                {isSavingMediaUrl ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mediaUrlSaved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {mediaUrl && !imageLoadError && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="relative w-32 h-32 border rounded overflow-hidden bg-white">
                  <img
                    src={mediaUrl}
                    alt="Media preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageLoadError(true)}
                  />
                </div>
              </div>
            )}
            
            {imageLoadError && (
              <p className="text-xs text-amber-600">
                Could not load preview. The URL may be for a video/document or the image is not publicly accessible. Campaign will still work.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="recipientList">Recipient List</Label>
          <Select value={selectedListId} onValueChange={setSelectedListId}>
            <SelectTrigger id="recipientList">
              <SelectValue placeholder="Select a contact list" />
            </SelectTrigger>
            <SelectContent>
              {whatsappLists.length === 0 ? (
                <div className="p-4 text-sm">
                  <p className="text-muted-foreground mb-2">No contact lists found.</p>
                  <p className="text-xs text-muted-foreground">Create a contact list in WhatsApp Marketing.</p>
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

        {selectedListId && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Ready to send to {whatsappLists.find(l => l.id === selectedListId)?.contactCount || 0} contacts
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendCampaign} 
          disabled={isSending || !campaignName || !selectedTemplate || !selectedListId}
          className="w-full"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
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
  );
}
