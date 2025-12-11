"use client";

import { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Sparkles,
  Users,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import SendSmsForm from '@/components/sms/SendSmsForm';
import dynamic from 'next/dynamic';

// Dynamically import the bulk SMS component to keep it separate and avoid loading everything at once
const BulkSMSCampaigns = dynamic(
  () => import('@/components/sms/bulk-sms-campaigns'),
  { loading: () => <div className="p-4">Loading bulk SMS...</div> }
);

type SMSProvider = 'fast2sms' | 'msg91' | 'twilio' | 'none';

export default function UnifiedSmsPage() {
  const { company } = useAuth();
  const [defaultProvider, setDefaultProvider] = useState<SMSProvider>('none');
  const [activeTab, setActiveTab] = useState<'ai' | 'bulk'>('bulk');

  // Auto-detect which SMS provider is configured
  useEffect(() => {
    if (!company?.apiKeys) {
      setDefaultProvider('none');
      return;
    }

    // Priority order: Fast2SMS > MSG91 > Twilio
    if (company.apiKeys.fast2sms) {
      setDefaultProvider('fast2sms');
    } else if (company.apiKeys.msg91) {
      setDefaultProvider('msg91');
    } else if (company.apiKeys.twilio) {
      setDefaultProvider('twilio');
    } else {
      setDefaultProvider('none');
    }
  }, [company?.apiKeys]);

  const getProviderBadge = () => {
    switch (defaultProvider) {
      case 'fast2sms':
        return (
          <Badge variant="default" className="bg-blue-600 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Fast2SMS Active
          </Badge>
        );
      case 'msg91':
        return (
          <Badge variant="default" className="bg-purple-600 flex items-center gap-1">
            <Zap className="h-3 w-3" /> MSG91 Active
          </Badge>
        );
      case 'twilio':
        return (
          <Badge variant="default" className="bg-green-600 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Twilio Active
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> No Provider Configured
          </Badge>
        );
    }
  };

  const getProviderDescription = () => {
    switch (defaultProvider) {
      case 'fast2sms':
        return "Fast2SMS is configured and will be used automatically for all bulk SMS campaigns.";
      case 'msg91':
        return "MSG91 is configured and will be used automatically for all bulk SMS campaigns.";
      case 'twilio':
        return "Twilio is configured and will be used automatically for all bulk SMS campaigns.";
      default:
        return "No SMS provider is configured. Please add an API key in Settings → API Integrations → SMS Providers to get started.";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <PageTitle 
          title="Bulk SMS Marketing" 
          description="Create and send SMS campaigns to multiple contacts with automatic provider routing."
        />
        <div className="flex items-center gap-2">
          {getProviderBadge()}
        </div>
        <p className="text-sm text-muted-foreground">{getProviderDescription()}</p>
      </div>

      {/* Alert if no provider is configured */}
      {defaultProvider === 'none' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">SMS Provider Not Configured</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  To send bulk SMS campaigns, please configure at least one SMS provider (Fast2SMS, MSG91, or Twilio) in your Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      {defaultProvider !== 'none' && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ai' | 'bulk')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Create with AI</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Send Campaign</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Create with AI */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate SMS Message with AI
                </CardTitle>
                <CardDescription>
                  Use AI to help draft your bulk SMS message. Using {defaultProvider.toUpperCase()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SendSmsForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Bulk Campaigns */}
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Send Bulk SMS Campaign
                </CardTitle>
                <CardDescription>
                  Send SMS campaigns to multiple contacts at once with personalization. Test individual messages before sending. Using {defaultProvider.toUpperCase()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkSMSCampaigns defaultProvider={defaultProvider as 'fast2sms' | 'msg91' | 'twilio'} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
