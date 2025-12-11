
"use client";

import React, { type ChangeEvent } from 'react'; 
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Eye, EyeOff, Trash2, ExternalLink, CheckCircle, AlertTriangle, Loader2, Copy, Check, Bot, MessageSquare, Smartphone, Mail, Building2, Globe, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiServiceIntegration, StoredApiKeys } from '@/types/integrations';
import { Badge } from "@/components/ui/badge"; 
import { useAuth } from '@/contexts/auth-context';
import { getCompany, updateCompanyApiKeys } from '@/lib/saas-data';
import { getVoiceChatConfig, saveVoiceChatConfig, disableVoiceChatConfig } from '@/app/actions/voice-chat-actions';
import type { CompanyVoiceChatConfig } from '@/lib/voice-chat-types';
import { getFriendlyLabel } from '@/lib/friendly-labels';
import { getFriendlyError, getFriendlySuccess } from '@/lib/friendly-messages';
import { validateAiSensyConnectionAction } from '@/app/actions/aisensy-actions';
import { validateGupshupConnectionAction } from '@/app/actions/gupshup-actions';
import { validateMetaWhatsAppConnectionAction } from '@/app/actions/meta-whatsapp-actions';
import { validateAuthkeyConnectionAction } from '@/app/actions/authkey-actions';
import { validateMSG91WhatsAppConnectionAction } from '@/app/actions/msg91-whatsapp-actions';
import { validateFast2SMSWhatsAppConnectionAction } from '@/app/actions/fast2sms-whatsapp-actions';

const apiKeyLabel = getFriendlyLabel('api_key');
const authTokenLabel = getFriendlyLabel('auth_token');
const accountSidLabel = getFriendlyLabel('account_sid');
const senderEmailLabel = getFriendlyLabel('sender_email');
const senderNameLabel = getFriendlyLabel('sender_name');
const phoneNumberLabel = getFriendlyLabel('phone_number');
const accessTokenLabel = getFriendlyLabel('access_token');
const portalIdLabel = getFriendlyLabel('portal_id');
const webhookUrlLabel = getFriendlyLabel('webhook_url');

const initialServices: ApiServiceIntegration[] = [
  {
    id: 'calcom',
    name: 'Cal.com',
    description: '📅 Appointment booking & calendar sync for meetings and consultations. Connect your calendar and auto-sync bookings.',
    fields: [
      { id: 'apiKey', label: 'Cal.com API Key', value: '', isProtected: true, placeholder: 'cal_...', helperText: 'Get your API key from Cal.com Settings → Developer → API Keys. This enables appointment booking integration.' },
    ],
    documentationLink: 'https://cal.com/docs/getting-started/api',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'googleAi',
    name: 'Google AI (Gemini) - BYOK',
    description: '💎 Bring Your Own API Key for unlimited AI usage (Starter/Pro/Enterprise only). Use the platform key included in your plan or add your own for unlimited operations at Google\'s direct cost.',
    fields: [
      { id: 'apiKey', label: apiKeyLabel.label, value: '', isProtected: true, placeholder: apiKeyLabel.placeholder, helperText: "🚀 BYOK: Add your own Gemini API key for unlimited AI operations. You'll pay Google directly (~$0.001/request) with no markup. Only available on paid plans." },
    ],
    documentationLink: 'https://aistudio.google.com/app/apikey',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'brevo',
    name: 'Brevo',
    description: 'For sending email campaigns and transactional emails.',
    fields: [
      { id: 'apiKey', label: apiKeyLabel.label, value: '', isProtected: true, placeholder: apiKeyLabel.placeholder, helperText: apiKeyLabel.helpText },
      { id: 'senderEmail', label: senderEmailLabel.label, value: '', isProtected: false, placeholder: senderEmailLabel.placeholder, helperText: 'REQUIRED for automated invitations: This email must be verified in your Brevo account.'},
      { id: 'senderName', label: senderNameLabel.label, value: '', isProtected: false, placeholder: senderNameLabel.placeholder, helperText: 'REQUIRED for automated invitations: How you want to appear in invitation emails.'},
      { id: 'defaultListId', label: 'Default Contact Group (Optional)', value: '', isProtected: false, placeholder: 'e.g., 2', helperText: 'If not set, a system default will be used. Find this in your Brevo account (Contacts > Lists).'},
    ],
    documentationLink: 'https://developers.brevo.com/docs/getting-started',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'sender',
    name: 'Sender.net',
    description: '🎯 Alternative email provider with generous free tier (15,000 emails/month). Better deliverability in Europe and lower costs than Brevo. Great backup option.',
    fields: [
      { id: 'apiKey', label: apiKeyLabel.label, value: '', isProtected: true, placeholder: apiKeyLabel.placeholder, helperText: 'Get your API key from Sender.net Dashboard → Settings → API Tokens' },
      { id: 'senderEmail', label: senderEmailLabel.label, value: '', isProtected: false, placeholder: senderEmailLabel.placeholder, helperText: 'REQUIRED: This email must be verified in your Sender.net account.'},
      { id: 'senderName', label: senderNameLabel.label, value: '', isProtected: false, placeholder: senderNameLabel.placeholder, helperText: 'REQUIRED: How you want to appear in emails.'},
    ],
    documentationLink: 'https://api.sender.net/v2/docs',
    affiliateLink: 'https://www.sender.net',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'For sending SMS notifications and managing SMS logs.',
    fields: [
      { id: 'accountSid', label: accountSidLabel.label, value: '', placeholder: accountSidLabel.placeholder, helperText: accountSidLabel.helpText },
      { id: 'authToken', label: authTokenLabel.label, value: '', isProtected: true, placeholder: authTokenLabel.placeholder, helperText: authTokenLabel.helpText },
      { id: 'phoneNumber', label: phoneNumberLabel.label, value: '', placeholder: phoneNumberLabel.placeholder, helperText: phoneNumberLabel.helpText},
    ],
    documentationLink: 'https://www.twilio.com/docs/usage/secure-credentials',
    isConfigured: false,
     authType: 'apiKey',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'For accessing CRM data like contacts and companies.',
    fields: [
      { id: 'apiKey', label: accessTokenLabel.label, value: '', isProtected: true, placeholder: accessTokenLabel.placeholder, helperText: "Create a Private App in your HubSpot settings. " + accessTokenLabel.helpText },
      { id: 'portalId', label: portalIdLabel.label, value: '', isProtected: false, placeholder: portalIdLabel.placeholder, helperText: portalIdLabel.helpText },
    ],
    documentationLink: 'https://developers.hubspot.com/docs/api/private-apps',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'For interacting with Zoho CRM data (Requires Server-Side Setup for OAuth).',
    fields: [
      { id: 'clientId', label: 'Client ID', value: '', placeholder: 'Zoho Client ID (Requires OAuth setup)', helperText: 'OAuth 2.0 needed for full integration.' },
      { id: 'clientSecret', label: 'Client Secret', value: '', isProtected: true, placeholder: 'Zoho Client Secret (Requires OAuth setup)' },
      { id: 'refreshToken', label: 'Refresh Token (Manual/Backend)', value: '', isProtected: true, placeholder: 'Requires backend OAuth flow' },
      { id: 'domain', label: 'API Domain', value: '', placeholder: 'e.g., www.zohoapis.com or www.zohoapis.eu', helperText: 'Find in Zoho API docs (e.g., .com, .eu, .in)'},
    ],
    documentationLink: 'https://www.zoho.com/crm/developer/docs/api/v2/oauth-overview.html',
    isConfigured: false,
    authType: 'oauth',
  },
  {
    id: 'bitrix24',
    name: 'Bitrix24',
    description: 'For accessing Bitrix24 CRM data (Requires Webhook/App Setup).',
    fields: [
      { id: 'webhookUrl', label: webhookUrlLabel.label, value: '', isProtected: true, placeholder: webhookUrlLabel.placeholder, helperText: 'Create an Inbound Webhook in Bitrix24 Developer Resources.' },
       { id: 'userId', label: 'User ID (for Webhook)', value: '', placeholder: 'e.g., 1 (optional for this demo)', helperText: 'User ID associated with the webhook (optional for basic contact list demo).' },
    ],
    documentationLink: 'https://training.bitrix24.com/rest_help/rest_sum/preface.php',
    isConfigured: false,
    authType: 'other',
  },
  {
    id: 'aisensy',
    name: 'AiSensy (WhatsApp Business)',
    description: '💡 Smart WhatsApp automation with AI-powered chatbots. Send bulk campaigns with advanced features like automated responses, workflow builder, and analytics. Great for SMEs.',
    fields: [
      { id: 'apiKey', label: 'AiSensy API Key', value: '', isProtected: true, placeholder: 'Enter your AiSensy API key', helperText: 'Get this from AiSensy Dashboard → Project → Manage Page → Copy API Key' },
      { id: 'campaignName', label: 'Default Campaign Name (Optional)', value: '', isProtected: false, placeholder: 'e.g., Marketing Campaign', helperText: 'Create an API campaign in AiSensy dashboard first, then enter its name here. If not set, we\'ll use "OmniFlow Campaign".' },
    ],
    documentationLink: 'https://wiki.aisensy.com/en/articles/11501889-api-reference-docs',
    affiliateLink: 'https://aisensy.com',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'msg91',
    name: 'MSG91 (Bulk SMS)',
    description: '📱 Powerful bulk SMS platform for India and global markets. DLT compliance built-in, OTP services, SMS templates, and detailed analytics. Excellent deliverability rates.',
    fields: [
      { id: 'authKey', label: 'MSG91 Auth Key', value: '', isProtected: true, placeholder: 'Enter your MSG91 Auth Key', helperText: 'Get this from your MSG91 dashboard (Settings → API Keys)' },
      { id: 'senderId', label: 'Sender ID', value: '', isProtected: false, placeholder: 'e.g., TXTIND', helperText: 'Your registered sender ID for SMS (6 characters for promotional, or your brand name)' },
    ],
    documentationLink: 'https://docs.msg91.com',
    affiliateLink: 'https://msg91.com',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'metaWhatsApp',
    name: 'Meta WhatsApp Cloud API (RECOMMENDED)',
    description: '⭐ Official WhatsApp Business Platform by Meta. Direct integration with full control over your messaging. Enterprise-grade reliability, global reach, and comprehensive features. Best for businesses wanting direct Meta integration.',
    fields: [
      { id: 'phoneNumberId', label: 'Phone Number ID (Required)', value: '', isProtected: false, placeholder: 'Your WhatsApp Business Phone Number ID', helperText: 'Get this from Meta Business Manager → WhatsApp → API Setup. This is NOT your phone number, but the Phone Number ID from Meta.' },
      { id: 'accessToken', label: 'Access Token (Required)', value: '', isProtected: true, placeholder: 'Permanent access token from Meta', helperText: 'Create a permanent access token in Meta Business Manager. Never expires unless manually revoked.' },
      { id: 'wabaId', label: 'WABA ID (Only for templates)', value: '', isProtected: false, placeholder: 'WhatsApp Business Account ID (optional)', helperText: 'Only required if you want to fetch message templates from Meta. You can send messages without this. Find in Meta Business Manager.' },
    ],
    documentationLink: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    affiliateLink: 'https://business.facebook.com/wa/manage/home/',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'msg91WhatsApp',
    name: 'MSG91 WhatsApp 🇮🇳',
    description: '🇮🇳 RECOMMENDED FOR INDIA: Zero markup pricing - Only Meta\'s official rates (₹0.785/msg). Unified SMS + WhatsApp platform. Easier onboarding than Meta Cloud API, with local Indian support and DLT expertise built-in.',
    fields: [
      { id: 'authKey', label: 'MSG91 Auth Key', value: '', isProtected: true, placeholder: 'Enter your MSG91 Auth Key', helperText: 'Get this from your MSG91 dashboard (Settings → API Keys)' },
      { id: 'integratedNumber', label: 'WhatsApp Business Number', value: '', isProtected: false, placeholder: 'Your registered WhatsApp number', helperText: 'Your WhatsApp Business number registered with MSG91 (e.g., 919876543210)' },
    ],
    documentationLink: 'https://docs.msg91.com/whatsapp',
    affiliateLink: 'https://msg91.com/in/whatsapp',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'fast2smsWhatsApp',
    name: 'Fast2SMS WhatsApp 🇮🇳',
    description: '🇮🇳 RECOMMENDED FOR INDIA: Zero setup fee, pay only for delivered messages (₹0.785-₹0.882/msg). Simple pay-per-delivery model. No monthly fees, unified SMS + WhatsApp platform. Perfect for Indian SMEs.',
    fields: [
      { id: 'apiKey', label: 'Fast2SMS API Key', value: '', isProtected: true, placeholder: 'Enter your Fast2SMS API key', helperText: 'Get this from your Fast2SMS dashboard (Dev API → API Keys). Same key works for SMS and WhatsApp!' },
    ],
    documentationLink: 'https://www.fast2sms.com/whatsapp',
    affiliateLink: 'https://www.fast2sms.com/whatsapp',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'authkey',
    name: 'WMart CPaaS (Multi-Channel)',
    description: '🌐 Our all-in-one communication platform. Single API for WhatsApp, SMS, Email, and Voice calls. Pay-as-you-go model with no commitments. Free trial credits available. Perfect for multi-channel campaigns.',
    fields: [
      { id: 'apiKey', label: 'WMart CPaaS API Key', value: '', isProtected: true, placeholder: 'Enter your WMart CPaaS API key', helperText: 'Get free trial credits when you sign up at wmart.in/cpaas. Same API key works for WhatsApp, SMS, Email, and Voice!' },
    ],
    documentationLink: 'https://wmart.in/cpaas/',
    affiliateLink: 'https://wmart.in/cpaas/',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'gupshup',
    name: 'Gupshup (WhatsApp Business)',
    description: '💬 Enterprise-grade WhatsApp platform with advanced automation. Rich interactive templates, chatbot flows, and global reach. Trusted by Fortune 500 companies.',
    fields: [
      { id: 'apiKey', label: 'Gupshup API Key', value: '', isProtected: true, placeholder: 'Enter your Gupshup API key', helperText: 'Get this from your Gupshup dashboard (Settings → API Keys)' },
      { id: 'appName', label: 'App ID (or App Name)', value: '', isProtected: false, placeholder: 'b6eb9204-70fd-45c5-89d3-250adcfe3ac9', helperText: 'For 2024 API: Enter the long "App ID" from Gupshup dashboard (UUID format like b6eb9204-70fd...). For legacy API: Use the short App Name instead.' },
      { id: 'srcName', label: 'App Name (for sending)', value: '', isProtected: false, placeholder: 'PosiblePos', helperText: 'REQUIRED for message delivery: Enter your App Name exactly as shown in Gupshup dashboard (e.g., "PosiblePos"). This is different from the App ID above.' },
      { id: 'phoneNumber', label: 'Business WhatsApp Number', value: '', isProtected: false, placeholder: '+918169123261', helperText: 'Your WhatsApp Business phone number with country code (e.g., +918169123261)' },
    ],
    documentationLink: 'https://docs.gupshup.io/docs/whatsapp-api-documentation',
    affiliateLink: 'https://www.gupshup.io',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'fast2sms',
    name: 'Fast2SMS',
    description: '⚡ Lightning-fast bulk SMS delivery in India. DLT approved, OTP services, and instant delivery. Simple API with great deliverability rates.',
    fields: [
      { id: 'apiKey', label: 'Fast2SMS API Key', value: '', isProtected: true, placeholder: 'Enter your Fast2SMS API key', helperText: 'Get this from your Fast2SMS dashboard (Dev API → API Keys)' },
      { id: 'senderId', label: 'Sender ID (Optional)', value: '', isProtected: false, placeholder: 'e.g., FSTSMS', helperText: 'Your 6-character sender ID for promotional SMS (optional for transactional)' },
    ],
    documentationLink: 'https://docs.fast2sms.com',
    affiliateLink: 'https://www.fast2sms.com',
    isConfigured: false,
    authType: 'apiKey',
  },
  {
    id: 'smtp',
    name: 'Custom SMTP (Email)',
    description: '📧 Connect your own SMTP server or email service. Works with Gmail, Outlook, SendGrid, or any SMTP provider. Full control over your email delivery.',
    fields: [
      { id: 'host', label: 'SMTP Host', value: '', isProtected: false, placeholder: 'e.g., smtp.gmail.com', helperText: 'Your SMTP server hostname' },
      { id: 'port', label: 'SMTP Port', value: '', isProtected: false, placeholder: 'e.g., 587 or 465', helperText: 'Usually 587 for TLS or 465 for SSL' },
      { id: 'username', label: 'Username/Email', value: '', isProtected: false, placeholder: 'your-email@domain.com', helperText: 'Your email address or SMTP username' },
      { id: 'password', label: 'Password', value: '', isProtected: true, placeholder: 'Your SMTP password or app password', helperText: 'For Gmail, use App Password instead of your regular password' },
      { id: 'fromEmail', label: 'From Email', value: '', isProtected: false, placeholder: 'noreply@yourdomain.com', helperText: 'The email address to send from' },
      { id: 'fromName', label: 'From Name', value: '', isProtected: false, placeholder: 'Your Company Name', helperText: 'The name that will appear as the sender' },
    ],
    documentationLink: 'https://nodemailer.com/smtp/',
    isConfigured: false,
    authType: 'apiKey',
  },
];

const serviceCategories = [
  {
    id: 'ai',
    name: 'Smart Tools',
    icon: Bot,
    description: 'Smart features and chatbot tools',
    serviceIds: ['googleAi'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageSquare,
    description: 'Send messages on WhatsApp',
    serviceIds: ['metaWhatsApp', 'msg91WhatsApp', 'fast2smsWhatsApp', 'aisensy', 'gupshup', 'authkey'],
  },
  {
    id: 'sms',
    name: 'Text Messages',
    icon: Smartphone,
    description: 'Send text messages to phones',
    serviceIds: ['twilio', 'msg91', 'fast2sms'],
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    description: 'Send emails to your contacts',
    serviceIds: ['brevo', 'smtp', 'sender'],
  },
  {
    id: 'crm',
    name: 'Contact Tools',
    icon: Building2,
    description: 'Apps for managing your contacts',
    serviceIds: ['hubspot', 'zoho', 'bitrix24'],
  },
  {
    id: 'multichannel',
    name: 'All-in-One Tools',
    icon: Globe,
    description: 'Tools that do multiple things at once',
    serviceIds: ['authkey'],
  },
];


export default function ApiKeyManager() {
  const [services, setServices] = useState<ApiServiceIntegration[]>(initialServices);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [showProtected, setShowProtected] = useState<Record<string, Record<string, boolean>>>({});
  const [voiceChatConfig, setVoiceChatConfig] = useState<CompanyVoiceChatConfig | undefined>();
  const [voiceChatWidgetScript, setVoiceChatWidgetScript] = useState('');
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedWebhookToken, setCopiedWebhookToken] = useState(false);
  const { toast } = useToast();
  const { appUser } = useAuth();

  const loadKeysFromDb = useCallback(async () => {
    if (!appUser?.companyId) {
      if(appUser) setIsClientLoading(false);
      return;
    }
    
    setIsClientLoading(true);
    const companyData = await getCompany(appUser.companyId);
    const storedKeys = companyData?.apiKeys;

    const initialShowProtectedState: Record<string, Record<string, boolean>> = {};

    const updatedServices = initialServices.map(service => {
      initialShowProtectedState[service.id] = {};
      service.fields.forEach(field => {
        if (field.isProtected) {
          initialShowProtectedState[service.id][field.id] = false;
        }
      });

      let serviceIsConfigured = false;
      let fieldsWithValues = service.fields.map(field => ({ ...field, value: '' })); // Reset values first
      
      if (storedKeys) {
        const serviceKeys = storedKeys[service.id];
        if (serviceKeys) {
             const essentialFields = service.fields.filter(f => !f.label.includes('(Optional)') && f.id !== 'userId' && f.id !== 'defaultListId' && f.id !== 'portalId' && f.id !== 'senderEmail'); 
             serviceIsConfigured = essentialFields.every(field => !!serviceKeys[field.id] && serviceKeys[field.id].trim() !== '');

            fieldsWithValues = service.fields.map(field => ({
              ...field,
              value: serviceKeys[field.id] || '',
            }));
        }
      }
      return { ...service, fields: fieldsWithValues, isConfigured: serviceIsConfigured };
    });

    setServices(updatedServices);
    setShowProtected(initialShowProtectedState);

    const voiceChatResult = await getVoiceChatConfig(appUser.companyId);
    if (voiceChatResult?.success && voiceChatResult.config) {
      setVoiceChatConfig(voiceChatResult.config);
      setVoiceChatWidgetScript(voiceChatResult.config.widgetScript);
    }

    setIsClientLoading(false);
  }, [appUser]);

  useEffect(() => {
    loadKeysFromDb();
  }, [loadKeysFromDb]);


  const handleInputChange = (serviceId: string, fieldId: string, value: string) => {
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === serviceId
          ? {
              ...service,
              fields: service.fields.map(field =>
                field.id === fieldId ? { ...field, value } : field
              ),
            }
          : service
      )
    );
  };

  const handleSaveKeys = async (serviceId: string) => {
    const serviceToSave = services.find(s => s.id === serviceId);
    if (!serviceToSave || !appUser?.companyId) return;

    setIsSaving(prev => ({...prev, [serviceId]: true}));
    
    try {
      const companyData = await getCompany(appUser.companyId);
      const currentApiKeys = companyData?.apiKeys || {};
      
      const newServiceKeys: Record<string, string> = {};
      serviceToSave.fields.forEach(field => {
        newServiceKeys[field.id] = field.value.trim();
      });
      
      const updatedApiKeys = { ...currentApiKeys, [serviceId]: newServiceKeys };
      
      await updateCompanyApiKeys(appUser.companyId, updatedApiKeys);

      // Refresh local state to show correct configured status
      await loadKeysFromDb();

      const successMsg = getFriendlySuccess('save/success', `${serviceToSave.name} connection saved`);
      toast({ title: successMsg.title, description: successMsg.description });
    } catch (error) {
      console.error(`Failed to save API keys for ${serviceId}`, error);
      const errorMsg = getFriendlyError('data/save-failed');
      toast({ title: errorMsg.title, description: `We couldn't save your ${serviceToSave.name} connection. Please try again.`, variant: 'destructive' });
    } finally {
        setIsSaving(prev => ({...prev, [serviceId]: false}));
    }
  };

  const handleClearKeys = async (serviceId: string) => {
     if (!appUser?.companyId) return;
     setIsSaving(prev => ({...prev, [serviceId]: true}));

     try {
        const companyData = await getCompany(appUser.companyId);
        const currentApiKeys = companyData?.apiKeys || {};
        const updatedApiKeys = { ...currentApiKeys };
        delete (updatedApiKeys as Record<string, any>)[serviceId];
        
        await updateCompanyApiKeys(appUser.companyId, updatedApiKeys);

        // Refresh local state
        await loadKeysFromDb();

        const serviceName = services.find(s => s.id === serviceId)?.name || 'Service';
        const successMsg = getFriendlySuccess('delete/success', `${serviceName} connection removed`);
        toast({ title: successMsg.title, description: successMsg.description });
    } catch (error) {
        console.error(`Failed to clear API keys for ${serviceId}`, error);
        const errorMsg = getFriendlyError('data/save-failed');
        toast({ title: errorMsg.title, description: `We couldn't remove the ${services.find(s=>s.id === serviceId)?.name} connection.`, variant: 'destructive' });
    } finally {
        setIsSaving(prev => ({...prev, [serviceId]: false}));
    }
  };

  const handleTestConnection = async (serviceId: string) => {
    if (!appUser?.idToken) {
      toast({ title: 'Authentication Required', description: 'Please log in to test connection', variant: 'destructive' });
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    setIsTesting(prev => ({ ...prev, [serviceId]: true }));
    setTestResults(prev => ({ ...prev, [serviceId]: null }));

    try {
      let result: { success: boolean; error?: string; balance?: number; details?: any } = { success: false };

      // Get field values for validation
      const getFieldValue = (fieldId: string) => service.fields.find(f => f.id === fieldId)?.value || '';

      switch (serviceId) {
        case 'aisensy':
          result = await validateAiSensyConnectionAction({
            apiKey: getFieldValue('apiKey'),
            campaignName: getFieldValue('campaignName')
          });
          break;

        case 'gupshup':
          result = await validateGupshupConnectionAction(appUser.idToken);
          break;

        case 'metaWhatsApp':
          result = await validateMetaWhatsAppConnectionAction(appUser.idToken);
          break;

        case 'authkey':
          result = await validateAuthkeyConnectionAction(appUser.idToken);
          break;

        case 'msg91WhatsApp':
          result = await validateMSG91WhatsAppConnectionAction(appUser.idToken);
          break;

        case 'fast2smsWhatsApp':
          result = await validateFast2SMSWhatsAppConnectionAction(appUser.idToken);
          break;

        default:
          result = { success: false, error: 'Testing not available for this provider' };
      }

      if (result.success) {
        let successMessage = 'Connection successful! ✓';
        if (result.balance !== undefined) {
          successMessage += ` Balance: ${result.balance}`;
        }
        if (result.details) {
          successMessage += ` ${result.details.displayPhoneNumber || ''}`;
        }

        setTestResults(prev => ({ ...prev, [serviceId]: { success: true, message: successMessage } }));
        toast({ 
          title: '✅ Connection Successful', 
          description: successMessage,
        });
      } else {
        const errorMessage = result.error || 'Connection failed';
        setTestResults(prev => ({ ...prev, [serviceId]: { success: false, message: errorMessage } }));
        toast({ 
          title: '❌ Connection Failed', 
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResults(prev => ({ ...prev, [serviceId]: { success: false, message: errorMessage } }));
      toast({ 
        title: '❌ Test Failed', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsTesting(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const toggleShowProtected = (serviceId: string, fieldId: string) => {
    setShowProtected(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [fieldId]: !prev[serviceId]?.[fieldId],
      },
    }));
  };

  const handleSaveVoiceChat = async () => {
    if (!appUser?.companyId || !voiceChatWidgetScript.trim()) {
      const errorMsg = getFriendlyError('validation/required-field');
      toast({ title: errorMsg.title, description: 'Please paste your widget code first', variant: 'destructive' });
      return;
    }

    setIsSaving(prev => ({...prev, voiceChat: true}));

    try {
      const result = await saveVoiceChatConfig(appUser.companyId, voiceChatWidgetScript);
      
      if (result.success) {
        setVoiceChatConfig(result.config);
        const successMsg = getFriendlySuccess('save/success', 'Your voice chat widget is ready!');
        toast({ title: successMsg.title, description: successMsg.description });
      } else {
        const errorMsg = getFriendlyError('data/save-failed');
        toast({ title: errorMsg.title, description: result.message || errorMsg.description, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving Voice Chat config:', error);
      const errorMsg = getFriendlyError('data/save-failed');
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' });
    } finally {
      setIsSaving(prev => ({...prev, voiceChat: false}));
    }
  };

  const handleDisableVoiceChat = async () => {
    if (!appUser?.companyId) return;

    setIsSaving(prev => ({...prev, voiceChat: true}));

    try {
      const result = await disableVoiceChatConfig(appUser.companyId);
      
      if (result.success) {
        setVoiceChatConfig(undefined);
        setVoiceChatWidgetScript('');
        const successMsg = getFriendlySuccess('delete/success', 'Voice chat widget removed from all cards');
        toast({ title: successMsg.title, description: successMsg.description });
      } else {
        const errorMsg = getFriendlyError('data/save-failed');
        toast({ title: errorMsg.title, description: result.message || errorMsg.description, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error disabling Voice Chat:', error);
      const errorMsg = getFriendlyError('data/save-failed');
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' });
    } finally {
      setIsSaving(prev => ({...prev, voiceChat: false}));
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'token' | 'complete') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedWebhookUrl(true);
        setTimeout(() => setCopiedWebhookUrl(false), 2000);
      } else if (type === 'token') {
        setCopiedWebhookToken(true);
        setTimeout(() => setCopiedWebhookToken(false), 2000);
      } else {
        setCopiedWebhookUrl(true);
        setTimeout(() => setCopiedWebhookUrl(false), 2000);
      }
      const successMsg = getFriendlySuccess('save/success', type === 'complete' ? 'Complete webhook URL copied!' : `Webhook ${type === 'url' ? 'URL' : 'token'} copied`);
      toast({ title: 'Copied! 📋', description: successMsg.description });
    } catch (error) {
      const errorMsg = getFriendlyError('generic/unknown');
      toast({ title: errorMsg.title, description: 'We couldn\'t copy that. Please try selecting and copying manually.', variant: 'destructive' });
    }
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/voice-chat`
    : 'https://your-domain.com/api/webhooks/voice-chat';

  const completeWebhookUrl = voiceChatConfig?.webhookToken 
    ? `${webhookUrl}?token=${voiceChatConfig.webhookToken}`
    : webhookUrl;

  const renderServiceCard = (service: ApiServiceIntegration) => (
    <Card key={service.id} className="overflow-hidden shadow-md">
      <CardHeader className="flex flex-row items-start justify-between bg-muted/50 p-4 border-b">
        <div className="flex-1">
          <CardTitle className="text-lg flex items-center gap-2">
            {service.name}
            {service.isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" aria-label="Configured" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-400" aria-label="Not Configured" />
            )}
          </CardTitle>
          {service.description && <CardDescription className="text-xs mt-1 pr-4">{service.description}</CardDescription>}
          {service.authType === 'oauth' && <Badge variant="outline" className="mt-1 text-xs">OAuth 2.0 Required</Badge>}
          {service.authType === 'other' && <Badge variant="outline" className="mt-1 text-xs">Webhook/App Setup</Badge>}
        </div>
        {service.documentationLink && (
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <a href={service.documentationLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" /> API Docs
            </a>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {service.fields.map(field => (
          <div key={field.id} className="space-y-1">
            <Label htmlFor={`${service.id}-${field.id}`}>{field.label}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${service.id}-${field.id}`}
                type={field.isProtected && !showProtected[service.id]?.[field.id] ? 'password' : 'text'}
                value={field.value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(service.id, field.id, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="flex-grow"
                disabled={isSaving[service.id]}
              />
              {field.isProtected && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleShowProtected(service.id, field.id)}
                  aria-label={showProtected[service.id]?.[field.id] ? 'Hide key' : 'Show key'}
                  disabled={isSaving[service.id]}
                >
                  {showProtected[service.id]?.[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {field.helperText && <p className="text-xs text-muted-foreground mt-1">{field.helperText}</p>}
          </div>
        ))}

        {testResults[service.id] && (
          <Alert className={testResults[service.id]?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <div className="flex items-start gap-2">
              {testResults[service.id]?.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${testResults[service.id]?.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResults[service.id]?.success ? 'Test Successful' : 'Test Failed'}
                </p>
                <p className={`text-xs ${testResults[service.id]?.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults[service.id]?.message}
                </p>
              </div>
            </div>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {['aisensy', 'gupshup', 'metaWhatsApp', 'authkey', 'msg91WhatsApp', 'fast2smsWhatsApp'].includes(service.id) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTestConnection(service.id)}
              disabled={isTesting[service.id] || isSaving[service.id]}
              title="Test connection with current credentials"
            >
              {isTesting[service.id] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearKeys(service.id)}
            disabled={isSaving[service.id] || !service.isConfigured}
            title={!service.isConfigured ? "No keys to clear" : `Clear saved ${service.name} keys`}
          >
            {isSaving[service.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => handleSaveKeys(service.id)}
            disabled={isSaving[service.id]}
            title={`Save ${service.name} keys to database`}
          >
            {isSaving[service.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save {service.name} Keys
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderVoiceChatWidget = () => (
    <Card className="overflow-hidden shadow-md border-2 border-purple-200 dark:border-purple-800">
      <CardHeader className="flex flex-row items-start justify-between bg-purple-50/50 dark:bg-purple-900/20 p-4 border-b border-purple-200 dark:border-purple-800">
        <div className="flex-1">
          <CardTitle className="text-lg flex items-center gap-2">
            Voice Chat AI Widget
            {voiceChatConfig?.enabled ? (
              <CheckCircle className="h-5 w-5 text-green-500" aria-label="Configured" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-400" aria-label="Not Configured" />
            )}
          </CardTitle>
          <CardDescription className="text-xs mt-1 pr-4">
            Add Voice Chat AI widget to all your digital cards. Paste your widget code once and it will be available on all cards company-wide.
          </CardDescription>
          <Badge variant="outline" className="mt-1 text-xs">Widget Integration</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="voiceChat-widgetScript">Paste Your Widget Code</Label>
          <Textarea
            id="voiceChat-widgetScript"
            value={voiceChatWidgetScript}
            onChange={(e) => setVoiceChatWidgetScript(e.target.value)}
            placeholder='<script src="https://voicechat.ai/widget.js" data-chatbot-id="your-id"></script>'
            className="min-h-[100px] font-mono text-xs"
            disabled={isSaving.voiceChat}
          />
          <p className="text-xs text-muted-foreground">
            📋 Copy this from your Voice Chat AI dashboard (Settings → Widget Code). The chatbot ID will be automatically detected.
          </p>
          {voiceChatConfig?.chatbotId && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Chatbot ID detected: <code className="bg-muted px-1 py-0.5 rounded">{voiceChatConfig.chatbotId}</code>
              </span>
            </div>
          )}
        </div>

        {voiceChatConfig?.enabled && (
          <>
            <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300 dark:from-purple-900/20 dark:to-blue-900/20 dark:border-purple-700">
              <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertTitle className="text-purple-700 dark:text-purple-300 font-semibold">📋 Copy This to Voice Chat AI Dashboard</AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Paste this <strong>complete webhook URL</strong> in your Voice Chat AI dashboard (Settings → Integrations → Lead Notification Webhook URL):
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={completeWebhookUrl}
                    readOnly
                    className="flex-grow font-mono text-xs bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => copyToClipboard(completeWebhookUrl, 'complete')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {copiedWebhookUrl ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-start gap-2">
                  <span className="font-semibold">ℹ️ Note:</span>
                  <span>This URL includes your authentication token. Just paste it in the webhook field - no need to add the token separately!</span>
                </p>
              </AlertDescription>
            </Alert>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                🔧 Advanced: View URL and Token Separately
              </summary>
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="space-y-1">
                  <Label htmlFor="voiceChat-webhookUrl" className="text-xs">Webhook URL (Base)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="voiceChat-webhookUrl"
                      value={webhookUrl}
                      readOnly
                      className="flex-grow font-mono text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl, 'url')}
                      title="Copy webhook URL"
                    >
                      {copiedWebhookUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="voiceChat-webhookToken" className="text-xs">Authentication Token</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="voiceChat-webhookToken"
                      value={voiceChatConfig.webhookToken}
                      readOnly
                      className="flex-grow font-mono text-xs bg-muted"
                      type="password"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(voiceChatConfig.webhookToken, 'token')}
                      title="Copy webhook token"
                    >
                      {copiedWebhookToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only needed if your platform requires URL and token in separate fields
                  </p>
                </div>
              </div>
            </details>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-700 dark:text-blue-300">Widget Active</AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
                Voice Chat AI widget is now live on all your digital cards! Conversations will automatically create leads in your CRM.
              </AlertDescription>
            </Alert>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {voiceChatConfig?.enabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableVoiceChat}
              disabled={isSaving.voiceChat}
              title="Remove Voice Chat widget from all cards"
            >
              {isSaving.voiceChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Disable Widget
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveVoiceChat}
            disabled={isSaving.voiceChat || !voiceChatWidgetScript.trim()}
            title="Save Voice Chat widget configuration"
          >
            {isSaving.voiceChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {voiceChatConfig?.enabled ? 'Update Widget' : 'Enable Widget'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isClientLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Integrations</CardTitle>
          <CardDescription>Manage API keys for connected services.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading API key settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Integrations & Connected Services</CardTitle>
        <CardDescription>
          Manage API keys and connection details for external services. Keys are stored securely in the database for your company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700">
          <AlertTriangle className="h-4 w-4 !text-yellow-600 dark:!text-yellow-400" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-300">IMPORTANT: API Key Security</AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            Handle your API keys with care. They provide direct access to your accounts on external services. Never share them publicly.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 h-auto p-2">
            {serviceCategories.map((category) => {
              const Icon = category.icon;
              const categoryServices = services.filter(s => category.serviceIds.includes(s.id));
              let configuredCount = categoryServices.filter(s => s.isConfigured).length;
              let totalCount = categoryServices.length;
              
              if (category.id === 'ai') {
                totalCount += 1;
                if (voiceChatConfig?.enabled) {
                  configuredCount += 1;
                }
              }
              
              return (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex flex-col items-center gap-1 h-auto py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium text-center leading-tight">{category.name}</span>
                  <Badge variant={configuredCount > 0 ? "default" : "secondary"} className="text-[10px] h-4 px-1.5 mt-0.5">
                    {configuredCount}/{totalCount}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {serviceCategories.map((category) => {
            const categoryServices = services.filter(s => category.serviceIds.includes(s.id));
            
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    {React.createElement(category.icon, { className: "h-5 w-5 text-primary" })}
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">— {category.description}</p>
                </div>

                {category.id === 'ai' && renderVoiceChatWidget()}

                {categoryServices.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No integrations in this category</AlertTitle>
                    <AlertDescription>
                      There are currently no services available in this category.
                    </AlertDescription>
                  </Alert>
                ) : (
                  categoryServices.map(service => renderServiceCard(service))
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Reminder on API Key Usage</AlertTitle>
          <AlertDescription>
            Keys entered here are stored in the database and scoped to your company. The global Google AI key in the app's `.env` file is used as a fallback if a company-specific key is not provided here.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
