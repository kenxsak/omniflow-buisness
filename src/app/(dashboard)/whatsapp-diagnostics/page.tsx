"use client";

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
  Settings,
  Send,
  MessageSquare,
} from 'lucide-react';
import { getWATITemplatesAction, validateWATIConnectionAction } from '@/app/actions/wati-actions';
import { validateAiSensyConnectionAction } from '@/app/actions/aisensy-actions';
import { validateGupshupConnectionAction } from '@/app/actions/gupshup-actions';
import { validateMetaWhatsAppConnectionAction } from '@/app/actions/meta-whatsapp-actions';
import { validateAuthkeyConnectionAction } from '@/app/actions/authkey-actions';
import { validateMSG91WhatsAppConnectionAction } from '@/app/actions/msg91-whatsapp-actions';
import { validateFast2SMSWhatsAppConnectionAction } from '@/app/actions/fast2sms-whatsapp-actions';
import { getMSG91WhatsAppTemplatesAction } from '@/app/actions/msg91-whatsapp-actions';
import { getFast2SMSWhatsAppTemplatesAction } from '@/app/actions/fast2sms-whatsapp-actions';
import Link from 'next/link';

interface DiagnosticResult {
  status: 'success' | 'error' | 'warning' | 'pending' | 'info';
  message: string;
  details?: string;
  actionable?: {
    text: string;
    link?: string;
  };
}

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  dashboardUrl?: string;
  configKeys: string[];
  hasTemplates?: boolean;
}

const providers: ProviderConfig[] = [
  {
    id: 'wati',
    name: 'WATI',
    description: 'WhatsApp Business API with template management',
    docsUrl: 'https://docs.wati.io',
    dashboardUrl: 'https://app.wati.io',
    configKeys: ['apiKey', 'accountUrl'],
    hasTemplates: true,
  },
  {
    id: 'aisensy',
    name: 'AiSensy',
    description: '42% cheaper than WATI with API campaigns',
    docsUrl: 'https://wiki.aisensy.com',
    dashboardUrl: 'https://app.aisensy.com',
    configKeys: ['apiKey'],
  },
  {
    id: 'gupshup',
    name: 'Gupshup',
    description: 'Enterprise-grade messaging platform',
    docsUrl: 'https://docs.gupshup.io',
    dashboardUrl: 'https://www.gupshup.io/developer/home',
    configKeys: ['apiKey', 'appName', 'phoneNumber'],
  },
  {
    id: 'metaWhatsApp',
    name: 'Meta WhatsApp',
    description: 'Direct integration with Meta WhatsApp Business API',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    dashboardUrl: 'https://business.facebook.com',
    configKeys: ['phoneNumberId', 'accessToken'],
  },
  {
    id: 'authkey',
    name: 'WMart CPaaS',
    description: 'Our multi-channel communication platform - WhatsApp, SMS, Email, Voice',
    docsUrl: 'https://wmart.in/cpaas/',
    configKeys: ['apiKey'],
  },
  {
    id: 'msg91WhatsApp',
    name: 'MSG91 WhatsApp',
    description: 'Zero markup pricing for Indian SMEs',
    docsUrl: 'https://docs.msg91.com/p/tf9GTextgHlljxnewARGg/e/d-Qf4PQiQzm-1W9kzAhTA',
    configKeys: ['authKey', 'integratedNumber'],
    hasTemplates: true,
  },
  {
    id: 'fast2smsWhatsApp',
    name: 'Fast2SMS WhatsApp',
    description: 'Zero setup fee, pay per delivered message',
    docsUrl: 'https://docs.fast2sms.com/whatsapp',
    configKeys: ['apiKey'],
    hasTemplates: true,
  },
];

export default function WhatsAppDiagnosticsPage() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [activeProvider, setActiveProvider] = useState(providers[0].id);
  const [testingStates, setTestingStates] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, DiagnosticResult[]>>({});
  const [templates, setTemplates] = useState<Record<string, any[]>>({});

  const testProvider = async (providerId: string) => {
    if (!appUser?.idToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to test connection',
        variant: 'destructive',
      });
      return;
    }

    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    setTestingStates(prev => ({ ...prev, [providerId]: true }));
    const diagResults: DiagnosticResult[] = [];

    try {
      diagResults.push({
        status: 'success',
        message: '✓ User authenticated',
        details: `Logged in as ${appUser.email}`,
      });

      const apiKeys = company?.apiKeys?.[providerId];
      const hasConfig = provider.configKeys.every(key => apiKeys?.[key]);

      if (!hasConfig) {
        diagResults.push({
          status: 'error',
          message: `✗ ${provider.name} not configured`,
          details: `Missing required keys: ${provider.configKeys.join(', ')}`,
          actionable: {
            text: `Go to Settings to configure ${provider.name}`,
            link: '/settings',
          },
        });
        setResults(prev => ({ ...prev, [providerId]: diagResults }));
        setTestingStates(prev => ({ ...prev, [providerId]: false }));
        return;
      }

      diagResults.push({
        status: 'success',
        message: `✓ ${provider.name} credentials found`,
        details: 'All required configuration keys are present',
      });

      let validationResult: { success: boolean; error?: string; balance?: number; details?: any } = { success: false };

      switch (providerId) {
        case 'wati':
          validationResult = await validateWATIConnectionAction({
            apiKey: apiKeys.apiKey,
            accountUrl: apiKeys.accountUrl,
          });
          
          if (validationResult.success) {
            const templatesResult = await getWATITemplatesAction(appUser.idToken);
            if (templatesResult.success && templatesResult.templates) {
              setTemplates(prev => ({ ...prev, [providerId]: templatesResult.templates || [] }));
              const approved = templatesResult.templates.filter((t: any) => t.status === 'APPROVED');
              const pending = templatesResult.templates.filter((t: any) => t.status === 'PENDING');
              const rejected = templatesResult.templates.filter((t: any) => t.status === 'REJECTED');

              if (approved.length > 0) {
                diagResults.push({
                  status: 'success',
                  message: `✓ Found ${approved.length} approved template(s)`,
                  details: `Ready to send: ${approved.map((t: any) => t.name).slice(0, 3).join(', ')}${approved.length > 3 ? '...' : ''}`,
                });
              } else {
                diagResults.push({
                  status: 'warning',
                  message: '⚠ No approved templates',
                  details: `${pending.length} pending, ${rejected.length} rejected. Need approved templates to send campaigns.`,
                });
              }
            }
          }
          break;

        case 'aisensy':
          validationResult = await validateAiSensyConnectionAction({
            apiKey: apiKeys.apiKey,
            campaignName: apiKeys.campaignName,
          });
          break;

        case 'gupshup':
          validationResult = await validateGupshupConnectionAction(appUser.idToken);
          break;

        case 'metaWhatsApp':
          validationResult = await validateMetaWhatsAppConnectionAction(appUser.idToken);
          break;

        case 'authkey':
          validationResult = await validateAuthkeyConnectionAction(appUser.idToken);
          if (validationResult.success) {
            diagResults.push({
              status: 'info',
              message: 'ℹ Manual template entry required',
              details: 'WMart CPaaS does not provide template fetching API. You will need to manually enter template names when creating campaigns.',
            });
          }
          break;

        case 'msg91WhatsApp':
          validationResult = await validateMSG91WhatsAppConnectionAction(appUser.idToken);
          if (validationResult.success) {
            const templatesResult = await getMSG91WhatsAppTemplatesAction(appUser.idToken);
            if (templatesResult.success && templatesResult.templates) {
              setTemplates(prev => ({ ...prev, [providerId]: templatesResult.templates || [] }));
              diagResults.push({
                status: 'success',
                message: `✓ Found ${templatesResult.templates.length} template(s)`,
                details: templatesResult.templates.length > 0 
                  ? `Templates: ${templatesResult.templates.map((t: any) => t.name).slice(0, 3).join(', ')}${templatesResult.templates.length > 3 ? '...' : ''}`
                  : 'No templates found',
              });
            }
          }
          break;

        case 'fast2smsWhatsApp':
          validationResult = await validateFast2SMSWhatsAppConnectionAction(appUser.idToken);
          if (validationResult.success) {
            const templatesResult = await getFast2SMSWhatsAppTemplatesAction(appUser.idToken);
            if (templatesResult.success && templatesResult.templates) {
              setTemplates(prev => ({ ...prev, [providerId]: templatesResult.templates || [] }));
              diagResults.push({
                status: 'success',
                message: `✓ Found ${templatesResult.templates.length} template(s)`,
                details: templatesResult.templates.length > 0 
                  ? `Templates: ${templatesResult.templates.map((t: any) => t.name).slice(0, 3).join(', ')}${templatesResult.templates.length > 3 ? '...' : ''}`
                  : 'No templates found',
              });
            }
          }
          break;
      }

      if (validationResult.success) {
        let successMsg = `✓ Successfully connected to ${provider.name}`;
        let details = 'API connection verified';
        
        if (validationResult.balance !== undefined) {
          details += ` | Balance: ₹${validationResult.balance}`;
        }
        if (validationResult.details?.displayPhoneNumber) {
          details += ` | Phone: ${validationResult.details.displayPhoneNumber}`;
        }

        diagResults.push({
          status: 'success',
          message: successMsg,
          details,
        });

        diagResults.push({
          status: 'success',
          message: `✓ ${provider.name} is ready to use!`,
          details: 'You can now send bulk campaigns using this provider',
        });
      } else {
        diagResults.push({
          status: 'error',
          message: `✗ Connection failed`,
          details: validationResult.error || 'Unknown error occurred',
          actionable: {
            text: `Check your ${provider.name} credentials and try again`,
            link: '/settings',
          },
        });
      }

    } catch (error: any) {
      diagResults.push({
        status: 'error',
        message: '✗ Unexpected error',
        details: error.message || 'An error occurred during testing',
      });
    } finally {
      setResults(prev => ({ ...prev, [providerId]: diagResults }));
      setTestingStates(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const testAllProviders = async () => {
    for (const provider of providers) {
      await testProvider(provider.id);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getProviderStatus = (providerId: string) => {
    const providerResults = results[providerId];
    if (!providerResults || providerResults.length === 0) return 'pending';
    
    const hasError = providerResults.some(r => r.status === 'error');
    const hasWarning = providerResults.some(r => r.status === 'warning');
    const allSuccess = providerResults.every(r => r.status === 'success' || r.status === 'info');
    
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    if (allSuccess) return 'success';
    return 'pending';
  };

  const renderProviderCard = (provider: ProviderConfig) => {
    const providerResults = results[provider.id] || [];
    const isTesting = testingStates[provider.id];
    const providerTemplates = templates[provider.id] || [];
    const status = getProviderStatus(provider.id);

    return (
      <Card key={provider.id}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {provider.name}
              {status === 'success' && <Badge variant="default" className="bg-green-600">✓ Working</Badge>}
              {status === 'error' && <Badge variant="destructive">✗ Error</Badge>}
              {status === 'warning' && <Badge variant="secondary" className="bg-yellow-600">⚠ Warning</Badge>}
            </div>
            <Link href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Docs
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>{provider.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => testProvider(provider.id)}
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {providerResults.length > 0 ? 'Re-run' : 'Run'} Diagnostics
              </>
            )}
          </Button>

          {providerResults.length > 0 && (
            <div className="space-y-3">
              {providerResults.map((result, index) => (
                <Alert key={index} className={getStatusColor(result.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{result.message}</div>
                      {result.details && (
                        <div className="text-sm opacity-90">{result.details}</div>
                      )}
                      {result.actionable && (
                        <div className="mt-2">
                          {result.actionable.link ? (
                            <Link
                              href={result.actionable.link}
                              target={result.actionable.link.startsWith('http') ? '_blank' : undefined}
                              rel={result.actionable.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                              <Button variant="outline" size="sm">
                                {result.actionable.text}
                                {result.actionable.link.startsWith('http') && (
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                )}
                              </Button>
                            </Link>
                          ) : (
                            <p className="text-sm font-medium">{result.actionable.text}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {providerTemplates.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Templates ({providerTemplates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {providerTemplates.slice(0, 5).map((template: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{template.name || template.elementName}</span>
                      {template.status && (
                        <Badge
                          variant={
                            template.status === 'APPROVED' || template.status === 'approved'
                              ? 'default'
                              : template.status === 'PENDING' || template.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {template.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {providerTemplates.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {providerTemplates.length - 5} more templates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {provider.dashboardUrl && (
            <Link href={provider.dashboardUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open {provider.name} Dashboard
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="WhatsApp Provider Diagnostics"
        description="Test all 7 WhatsApp provider integrations and troubleshoot connection issues"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About This Tool</AlertTitle>
        <AlertDescription>
          Test your WhatsApp provider configurations, verify API connections, check template availability,
          and identify any issues before sending bulk campaigns. Each provider has unique requirements.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button onClick={testAllProviders} disabled={Object.values(testingStates).some(v => v)} className="flex-1">
          <MessageSquare className="mr-2 h-4 w-4" />
          Test All Providers
        </Button>
        <Link href="/settings" className="flex-1">
          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Configure Providers
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={activeProvider} onValueChange={setActiveProvider}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2 h-auto">
          {providers.map(provider => {
            const status = getProviderStatus(provider.id);
            return (
              <TabsTrigger
                key={provider.id}
                value={provider.id}
                className="flex flex-col gap-1 h-auto py-2 relative"
              >
                <span className="text-xs font-medium">{provider.name}</span>
                {status === 'success' && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                )}
                {status === 'error' && (
                  <div className="absolute top-1 right-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                  </div>
                )}
                {status === 'warning' && (
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  </div>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {providers.map(provider => (
          <TabsContent key={provider.id} value={provider.id} className="space-y-4">
            {renderProviderCard(provider)}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage WhatsApp integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Link href="/settings">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Configure API Keys
            </Button>
          </Link>
          <Link href="/whatsapp-bulk-campaigns">
            <Button variant="outline" className="w-full justify-start">
              <Send className="mr-2 h-4 w-4" />
              WhatsApp Campaigns
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Provider Comparison</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-sm">
            <strong>WATI & AiSensy:</strong> Full template management with approval tracking
            <br />
            <strong>Gupshup & Meta:</strong> Enterprise-grade with advanced features
            <br />
            <strong>MSG91 & Fast2SMS:</strong> Indian providers with competitive pricing
            <br />
            <strong>WMart CPaaS:</strong> Manual template entry - most affordable option
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
