
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowLeft, Users, CheckCircle, BarChartHorizontal, MailOpen, MousePointerClick, RefreshCw, Edit, Trash2, Send, Loader2, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { EmailCampaign } from '@/lib/mock-data';
import { getStoredEmailCampaigns, deleteStoredEmailCampaign, updateStoredEmailCampaign } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { sendBrevoCampaignAction, type SendBrevoCampaignActionResponse } from '@/actions/brevo-campaigns'; 
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { useAuth } from '@/hooks/use-auth';
import { fetchCampaignAnalytics, type CampaignAnalytics } from '@/app/actions/campaign-analytics-actions';

// Helper for campaign status styling
const getCampaignStatusClass = (status: EmailCampaign['status']) => {
  switch (status) {
    case 'Sent via Brevo':
    case 'Sent':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'Sending via Brevo':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 animate-pulse';
    case 'Failed via Brevo':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

interface StatItemProps {
    icon: React.ElementType;
    label: string;
    value: string;
    percentage?: number;
}

function StatItem({ icon: Icon, label, value, percentage }: StatItemProps) {
    return (
        <div className="p-4 bg-card border rounded-lg flex items-start space-x-3">
            <Icon className="h-6 w-6 text-primary mt-1"/>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold text-foreground">{value}
                  {typeof percentage === 'number' && !isNaN(percentage) && <span className="text-sm font-normal text-muted-foreground ml-1">({percentage.toFixed(1)}%)</span>}
                </p>
            </div>
        </div>
    );
}


export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const campaignId = typeof params.id === 'string' ? params.id : '';
  const { apiKeys } = useCompanyApiKeys();
  const { appUser } = useAuth();

  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!campaignId || !appUser?.companyId) {
      setCampaign(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const storedCampaigns = await getStoredEmailCampaigns(appUser.companyId);
    const foundCampaign = storedCampaigns.find(c => c.id === campaignId);
    setCampaign(foundCampaign || null);
    setIsLoading(false);
  }, [campaignId, appUser?.companyId]);

  const fetchAnalytics = useCallback(async () => {
    if (!campaign || !appUser?.companyId) return;

    const provider = campaign.provider || 'brevo';
    
    let campaignIdForAnalytics: string | number | undefined;
    if (provider === 'brevo') {
      campaignIdForAnalytics = campaign.brevoCampaignId;
    } else if (provider === 'sender') {
      campaignIdForAnalytics = campaign.senderCampaignId;
    } else if (provider === 'smtp') {
      setAnalyticsError('SMTP campaigns do not have analytics support from provider');
      setAnalytics(null);
      return;
    }

    if (!campaignIdForAnalytics) {
      setAnalyticsError(`No ${provider} campaign ID found`);
      return;
    }

    const isActuallySent = campaign.status === 'Sent' || campaign.status === 'Sent via Brevo' || campaign.status === 'Sent via Sender.net';
    
    if (!isActuallySent) {
      return;
    }

    setIsLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      const result = await fetchCampaignAnalytics(appUser.companyId, provider as 'brevo' | 'sender' | 'smtp', campaignIdForAnalytics);
      
      if (result.success && result.stats) {
        setAnalytics(result);
        setAnalyticsError(null);
      } else {
        setAnalyticsError(result.error || 'Failed to fetch analytics');
        setAnalytics(null);
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setAnalyticsError(error.message || 'Failed to fetch analytics');
      setAnalytics(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [campaign, appUser?.companyId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (campaign) {
      fetchAnalytics();
    }
  }, [campaign, fetchAnalytics]);

  useEffect(() => {
    if (!campaign) return;

    const isActuallySent = campaign.status === 'Sent' || campaign.status === 'Sent via Brevo' || campaign.status === 'Sent via Sender.net';
    
    if (!isActuallySent) return;

    const intervalId = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [campaign, fetchAnalytics]);

  const handleDeleteCampaign = () => {
    if (campaign) {
      deleteStoredEmailCampaign(campaign.id);
      toast({
        title: "Campaign Deleted",
        description: `Campaign "${campaign.name}" has been removed from local storage.`,
      });
      router.push('/email-marketing');
    }
  };

  const handleRetrySend = async () => {
    if (!campaign || !campaign.brevoCampaignId) {
        toast({ title: "Error", description: "Brevo Campaign ID missing. Cannot retry.", variant: "destructive" });
        return;
    }

    const brevoApiKey = apiKeys?.brevo?.apiKey;

    if (!brevoApiKey) {
        toast({ title: "API Key Missing", description: "Brevo API Key not found in Settings. Please configure it to send campaigns.", variant: "destructive" });
        return;
    }

    setIsSending(true);
    try {
        const sendingCampaignState = { ...campaign, status: 'Sending via Brevo' as const };
        updateStoredEmailCampaign(sendingCampaignState);
        setCampaign(sendingCampaignState);

        let brevoIdNumber: number | null = null;
        try {
            brevoIdNumber = parseInt(campaign.brevoCampaignId, 10);
            if (isNaN(brevoIdNumber)) {
                throw new Error("Brevo Campaign ID is not a valid number");
            }
        } catch (parseError: any) {
            toast({ title: "Error", description: parseError.message || "Invalid Brevo Campaign ID format.", variant: "destructive" });
            setIsSending(false);
            if (appUser?.companyId) {
                const storedCampaigns = await getStoredEmailCampaigns(appUser.companyId);
                const originalCampaignState = storedCampaigns.find(c => c.id === campaign.id);
                if (originalCampaignState) {
                    setCampaign(originalCampaignState); // Revert to original state from storage
                } else { // Fallback if somehow original is gone
                    const revertCampaign = { ...campaign, status: 'Failed via Brevo' as const };
                    updateStoredEmailCampaign(revertCampaign);
                    setCampaign(revertCampaign);
                }
            }
            return;
        }

        const result: SendBrevoCampaignActionResponse = await sendBrevoCampaignAction(brevoApiKey, brevoIdNumber);
        
        if (result.success) {
            toast({ title: "Campaign Resent", description: result.message || "Campaign successfully resent via Brevo."});
            const finalCampaign = { ...campaign, status: 'Sent via Brevo' as const, sentDate: new Date().toISOString() };
            updateStoredEmailCampaign(finalCampaign);
            setCampaign(finalCampaign);
        } else {
            toast({ title: "Resend Failed", description: result.error || "Could not resend campaign.", variant: "destructive"});
            const finalCampaign = { ...campaign, status: 'Failed via Brevo' as const };
            updateStoredEmailCampaign(finalCampaign);
            setCampaign(finalCampaign);
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to retry sending.", variant: "destructive" });
        if(campaign) {
          const finalCampaignOnError = { ...campaign, status: 'Failed via Brevo' as const };
          updateStoredEmailCampaign(finalCampaignOnError);
          setCampaign(finalCampaignOnError);
        }
    } finally {
        setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/email-marketing"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <PageTitle title="Loading Campaign..." />
        </div>
        <Card>
          <CardContent className="pt-6 h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/email-marketing">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Email Marketing</span>
              </Link>
            </Button>
            <PageTitle title="Campaign Not Found" description={`Could not find campaign with ID: ${campaignId} in local storage.`} />
        </div>
        <Card>
            <CardContent className="pt-6">
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitleComponent>Campaign Not Found</AlertTitleComponent>
                    <AlertDescription>
                        The campaign you are looking for does not exist or could not be loaded from local storage.
                    </AlertDescription>
                </Alert>
                 <div className="mt-4 text-center">
                    <Button onClick={loadCampaign}><RefreshCw className="mr-2 h-4 w-4"/> Try Reloading</Button>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  const isActuallySent = campaign.status === 'Sent' || campaign.status === 'Sent via Brevo' || campaign.status === 'Sent via Sender.net';
  const provider = campaign.provider || 'brevo';
  
  const sent = analytics?.stats?.sent || 0;
  const delivered = analytics?.stats?.delivered || 0;
  const opened = analytics?.stats?.opened || 0;
  const clicked = analytics?.stats?.clicked || 0;
  const unsubscribed = analytics?.stats?.unsubscribed || 0;
  const bounced = analytics?.stats?.bounced || 0;
  const openRate = analytics?.stats?.openRate || 0;
  const clickRate = analytics?.stats?.clickRate || 0;
  const uniqueOpens = analytics?.stats?.uniqueOpens || 0;
  const uniqueClicks = analytics?.stats?.uniqueClicks || 0;
  
  const deliveredPercentage = sent > 0 ? (delivered / sent * 100) : 0;


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/email-marketing">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Email Marketing</span>
            </Link>
          </Button>
          <PageTitle title={campaign.name} description={`Details for campaign ID: ${campaign.id} (Loaded from local storage)`} />
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <Button variant="outline" onClick={() => { loadCampaign(); fetchAnalytics(); }} disabled={isLoadingAnalytics}>
            {isLoadingAnalytics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4"/>}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p><strong className="text-foreground">Status:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${getCampaignStatusClass(campaign.status)}`}>{campaign.status}</span></p>
            <p><strong className="text-foreground">Subject:</strong> <span className="text-muted-foreground">{campaign.subject}</span></p>
            <p><strong className="text-foreground">Provider:</strong> <span className="text-muted-foreground capitalize">{provider}</span></p>
            {campaign.brevoCampaignId && <p><strong className="text-foreground">Brevo Campaign ID:</strong> <span className="text-muted-foreground">{campaign.brevoCampaignId}</span></p>}
            {campaign.senderCampaignId && <p><strong className="text-foreground">Sender.net Campaign ID:</strong> <span className="text-muted-foreground">{campaign.senderCampaignId}</span></p>}
            {campaign.sentDate && <p><strong className="text-foreground">Sent/Scheduled Date:</strong> <span className="text-muted-foreground">{new Date(campaign.sentDate).toLocaleString()}</span></p>}
            <p><strong className="text-foreground">Sender:</strong> <span className="text-muted-foreground">{campaign.senderName} ({campaign.senderEmail})</span></p>
          </div>
           {isActuallySent && (
            <div className="space-y-2">
                {isLoadingAnalytics ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading analytics...</span>
                  </div>
                ) : analyticsError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitleComponent>Analytics Error</AlertTitleComponent>
                    <AlertDescription>{analyticsError}</AlertDescription>
                  </Alert>
                ) : analytics?.stats ? (
                  <>
                    <p><strong className="text-foreground">Sent:</strong> <span className="text-muted-foreground">{sent.toLocaleString()}</span></p>
                    <p><strong className="text-foreground">Delivered:</strong> <span className="text-muted-foreground">{delivered.toLocaleString()} ({deliveredPercentage.toFixed(1)}%)</span></p>
                    <p><strong className="text-foreground">Open Rate:</strong> <span className="text-muted-foreground">{openRate.toFixed(1)}%</span></p>
                    <p><strong className="text-foreground">Click Rate:</strong> <span className="text-muted-foreground">{clickRate.toFixed(1)}%</span></p>
                    <p><strong className="text-foreground">Unsubscribes:</strong> <span className="text-muted-foreground">{unsubscribed.toLocaleString()}</span></p>
                    <p><strong className="text-foreground">Bounces:</strong> <span className="text-muted-foreground">{bounced.toLocaleString()}</span></p>
                  </>
                ) : provider === 'smtp' ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitleComponent>SMTP Campaign</AlertTitleComponent>
                    <AlertDescription>Analytics are not available for SMTP campaigns</AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">No analytics data available yet. The campaign may have just been sent.</p>
                )}
            </div>
           )}
        </CardContent>
      </Card>

      {isActuallySent && provider !== 'smtp' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Real-time analytics from {provider === 'brevo' ? 'Brevo' : 'Sender.net'}.
              {isLoadingAnalytics && ' Refreshing...'}
              {!isLoadingAnalytics && analytics?.stats && ' Auto-refreshes every 30 seconds.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics && !analytics?.stats ? (
              <div className="h-32 flex items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading analytics from {provider === 'brevo' ? 'Brevo' : 'Sender.net'}...</span>
                </div>
              </div>
            ) : analyticsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitleComponent>Failed to Load Analytics</AlertTitleComponent>
                <AlertDescription>
                  {analyticsError}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : analytics?.stats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatItem icon={Users} label="Total Sent" value={sent.toLocaleString()} />
                <StatItem icon={CheckCircle} label="Delivered" value={delivered.toLocaleString()} percentage={deliveredPercentage} />
                <StatItem icon={MailOpen} label="Opened (Unique)" value={uniqueOpens.toLocaleString()} percentage={openRate} />
                <StatItem icon={MousePointerClick} label="Clicked (Unique)" value={uniqueClicks.toLocaleString()} percentage={clickRate} />
                <StatItem icon={BarChartHorizontal} label="Unsubscribed" value={unsubscribed.toLocaleString()} />
                <StatItem icon={BarChartHorizontal} label="Bounced" value={bounced.toLocaleString()} />
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitleComponent>No Analytics Yet</AlertTitleComponent>
                <AlertDescription>
                  Analytics data is not available yet. The campaign may have just been sent. Please check back in a few minutes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Content Preview (HTML)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-auto">
                {campaign.content ? (
                    <div dangerouslySetInnerHTML={{ __html: campaign.content }} />
                ) : (
                    <p className="text-sm text-muted-foreground">(No content specified for this campaign)</p>
                )}
            </div>
             <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3"/> Note: This preview might not render exactly as in all email clients. Brevo personalization tags like {`{{ contact.FIRSTNAME }}`} will only resolve during actual sending by Brevo.
            </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {(campaign.status === 'Draft' || campaign.status === 'Failed via Brevo') && (
          <Button asChild>
            <Link href={`/email-marketing/create-campaign?edit=${campaign.id}`}><Edit className="mr-2 h-4 w-4" /> Edit Campaign</Link>
          </Button>
        )}
         {(campaign.status === 'Draft' || campaign.status === 'Failed via Brevo') && campaign.brevoCampaignId && (
            <Button variant="default" onClick={handleRetrySend} disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4"/> {campaign.status === 'Failed via Brevo' ? 'Retry Send via Brevo' : 'Send via Brevo Now'}
            </Button>
        )}
        {isActuallySent && campaign.brevoCampaignId && <Button variant="outline" asChild><a href={`https://app.brevo.com/camp/emails/reports/${campaign.brevoCampaignId}`} target="_blank" rel="noopener noreferrer">View Full Report in Brevo</a></Button>}

        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Campaign</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the campaign "{campaign.name}" from local storage.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCampaign} className={buttonVariants({variant: "destructive"})}>
                    Yes, delete campaign
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
