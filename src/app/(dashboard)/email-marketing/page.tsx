
"use client";

import { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, ListChecks, BarChart2, Send, Settings2, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { EmailCampaign } from '@/lib/mock-data';
import { getStoredEmailCampaigns } from '@/lib/mock-data';
import BrevoCampaignList from '@/components/email/BrevoCampaignList'; // Import the new component
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import EmailPerformanceChart, { type EmailChartData } from '@/components/email/email-performance-chart';
import { useAuth } from '@/hooks/use-auth';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';


// Helper for campaign status styling
const getCampaignStatusClass = (status: EmailCampaign['status']) => {
  switch (status) {
    case 'Sent via Brevo':
    case 'Sent via Sender.net':
    case 'Sent':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'Sending via Brevo':
    case 'Sending via Sender.net':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 animate-pulse';
    case 'Failed via Brevo':
    case 'Failed via Sender.net':
    case 'Failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};


export default function EmailMarketingPage() {
  const [localCampaigns, setLocalCampaigns] = useState<EmailCampaign[]>([]);
  const [emailChartData, setEmailChartData] = useState<EmailChartData[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const { isFeatureEnabled } = useFeatureFlag();
  const [canShowAutomations, setCanShowAutomations] = useState(false);
  const { appUser } = useAuth();


  const loadLocalCampaigns = useCallback(async () => {
    if (!appUser?.companyId) {
        setIsLoadingLocal(false);
        return;
    }
    setIsLoadingLocal(true);
    const storedCampaigns = await getStoredEmailCampaigns(appUser.companyId);
    
    // Use safe date conversion for sorting
    const sortedCampaigns = storedCampaigns.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
    });
    setLocalCampaigns(sortedCampaigns);

    const getValidDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate();
        if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp);
        return null;
    };

    const sentCampaigns = storedCampaigns
        .filter(c => (c.status === 'Sent' || c.status === 'Sent via Brevo' || c.status === 'Sent via Sender.net') && c.recipientCount && c.recipientCount > 0 && getValidDate(c.sentDate))
        .sort((a, b) => (getValidDate(a.sentDate)?.getTime() || 0) - (getValidDate(b.sentDate)?.getTime() || 0))
        .slice(-5);

    const chartData: EmailChartData[] = sentCampaigns.map(campaign => {
        const recipientCount = campaign.recipientCount || 0;
        const opened = Math.round(recipientCount * ((campaign.openRate || 0) / 100));
        const clicked = Math.round(recipientCount * ((campaign.clickRate || 0) / 100));
        return {
            name: campaign.name,
            sent: recipientCount,
            opened: opened,
            clicked: clicked,
        }
    });
    setEmailChartData(chartData);

    setIsLoadingLocal(false);
  }, [appUser]);

  useEffect(() => {
    loadLocalCampaigns();
     const checkFeatureFlag = async () => {
      const enabled = await isFeatureEnabled('feat_email_workflows');
      setCanShowAutomations(enabled);
    };
    checkFeatureFlag();
  }, [loadLocalCampaigns, isFeatureEnabled]);

  // Aggregate stats from loaded local campaigns (simplified)
  const totalSubscribers = localCampaigns.reduce((sum, camp) => sum + (camp.recipientCount || 0), 0);
  const sentLocalCampaigns = localCampaigns.filter(c => c.status === 'Sent' || c.status === 'Sent via Brevo' || c.status === 'Sent via Sender.net');
  const avgOpenRate = sentLocalCampaigns.length > 0
    ? sentLocalCampaigns.reduce((sum, camp) => sum + (camp.openRate || 0), 0) / sentLocalCampaigns.length
    : 0;
  const avgClickRate = sentLocalCampaigns.length > 0
    ? sentLocalCampaigns.reduce((sum, camp) => sum + (camp.clickRate || 0), 0) / sentLocalCampaigns.length
    : 0;


  if (isLoadingLocal) {
    return (
       <div className="space-y-6">
        <PageTitle title="Email Campaigns" description="Loading campaigns..." />
         <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle title="Email Campaigns" description="Send emails to your contacts. Local campaigns are saved on your device. Brevo campaigns are live from your email service." />
        <div className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/campaigns/ai-email">
              <Sparkles className="mr-2 h-4 w-4" /> Create with AI
            </Link>
          </Button>
          <Button variant="outline" onClick={loadLocalCampaigns} title="Refresh local campaigns">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Local
          </Button>
          <Button asChild variant="accent">
            <Link href="/email-marketing/create-campaign">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Local Campaign
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Section for Brevo Campaigns */}
      <BrevoCampaignList />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Local Campaigns</CardTitle>
            <CardDescription>Overview of your latest email campaigns stored locally.</CardDescription>
          </CardHeader>
          <CardContent>
            {localCampaigns.length > 0 ? (
              <ul className="space-y-4">
                {localCampaigns.slice(0, 5).map(campaign => (
                  <li key={campaign.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCampaignStatusClass(campaign.status)}`}>{campaign.status}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Recipients: {campaign.recipientCount || 'N/A'}</span> | <span>Open: {campaign.openRate?.toFixed(1) || 'N/A'}%</span> | <span>Click: {campaign.clickRate?.toFixed(1) || 'N/A'}%</span>
                       {campaign.brevoCampaignId && <span className="ml-2 text-xs">(Local Brevo ID: {campaign.brevoCampaignId})</span>}
                    </div>
                     <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary" asChild>
                        <Link href={`/email-marketing/campaigns/${campaign.id}`}>View Details</Link>
                     </Button>
                  </li>
                ))}
                 {localCampaigns.length > 5 && <p className="text-sm text-muted-foreground mt-4 text-center">And {localCampaigns.length - 5} more...</p>}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-8">No local campaigns found. Create one to get started!</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Stats (Local Data)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>Total Local Campaigns:</span> <span className="font-semibold">{localCampaigns.length}</span></div>
              <div className="flex justify-between text-sm"><span>Avg. Open Rate (Sent Local):</span> <span className="font-semibold">{avgOpenRate.toFixed(1)}%</span></div>
              <div className="flex justify-between text-sm"><span>Avg. Click Rate (Sent Local):</span> <span className="font-semibold">{avgClickRate.toFixed(1)}%</span></div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/email-marketing/subscribers"><ListChecks className="mr-2 h-4 w-4"/> Contact Lists</Link>
                </Button>
                {canShowAutomations && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/email-marketing/automations"><Send className="mr-2 h-4 w-4"/> Auto-Send Emails</Link>
                    </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/settings?tab=integrations"><Settings2 className="mr-2 h-4 w-4"/> Email Settings</Link>
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Email Performance Analytics</CardTitle>
          <CardDescription>Performance of your last 5 sent campaigns from local data.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] p-2">
            <EmailPerformanceChart data={emailChartData} />
        </CardContent>
      </Card>
      <ContextualHelpButton pageId="email-campaigns" />
    </div>
  );
}
