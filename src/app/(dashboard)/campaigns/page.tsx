"use client";

import { useState, useEffect, useMemo } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlusCircle, Mail, MessageSquare, MessageCircle, 
  Calendar, Users, Send, Clock, CheckCircle, XCircle,
  Eye, Loader2, ChevronDown, FileText, Sparkles, Edit3
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { EmailCampaign } from '@/lib/mock-data';
import { getStoredEmailCampaigns } from '@/lib/mock-data';
import { getSMSCampaigns, getWhatsAppCampaigns } from '@/lib/messaging-campaigns-data';
import type { SMSCampaign, WhatsAppCampaign } from '@/types/messaging';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';

const INITIAL_DISPLAY_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export default function CampaignsPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all');
  
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<SMSCampaign[]>([]);
  const [whatsappCampaigns, setWhatsAppCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  useEffect(() => {
    if (appUser?.companyId) {
      loadAllCampaigns();
    }
  }, [appUser?.companyId]);

  const loadAllCampaigns = async () => {
    if (!appUser?.companyId) return;
    setIsLoading(true);
    try {
      const [emails, sms, whatsapp] = await Promise.all([
        getStoredEmailCampaigns(appUser.companyId),
        getSMSCampaigns(appUser.companyId),
        getWhatsAppCampaigns(appUser.companyId),
      ]);
      setEmailCampaigns(emails);
      setSmsCampaigns(sms);
      setWhatsAppCampaigns(whatsapp);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'sending':
      case 'processing':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Sending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const allCampaigns = useMemo(() => {
    return [
      ...emailCampaigns.map(c => ({ ...c, type: 'email' as const, icon: Mail })),
      ...smsCampaigns.map(c => ({ ...c, type: 'sms' as const, icon: MessageSquare })),
      ...whatsappCampaigns.map(c => ({ ...c, type: 'whatsapp' as const, icon: MessageCircle })),
    ].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [emailCampaigns, smsCampaigns, whatsappCampaigns]);

  const loadMoreCampaigns = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  const renderCampaignTable = (campaigns: typeof allCampaigns) => {
    if (campaigns.length === 0) {
      return (
        <div className="text-center py-12">
          <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No campaigns yet. Create your first campaign!</p>
          <Button asChild className="mt-4" variant="accent">
            <Link href="/campaigns/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </div>
      );
    }

    const displayedCampaigns = campaigns.slice(0, displayCount);
    const hasMore = campaigns.length > displayCount;

    return (
      <>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Sent Via</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedCampaigns.map((campaign, index) => {
              const Icon = campaign.icon;
              const createdDate = campaign.createdAt?.toDate 
                ? campaign.createdAt.toDate() 
                : new Date(campaign.createdAt || Date.now());
              
              return (
                <TableRow key={`${campaign.type}-${campaign.id || index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="capitalize">{campaign.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {campaign.name}
                      {campaign.type === 'email' && (campaign as any).isAIGenerated && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {campaign.recipientCount || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.type === 'email' && (
                      <Badge variant="outline" className="text-xs">
                        {(campaign as any).provider === 'brevo' ? 'Brevo' : 
                         (campaign as any).provider === 'sender' ? 'Sender.net' : 
                         campaign.status?.includes('Brevo') ? 'Brevo' :
                         campaign.status?.includes('Sender') ? 'Sender.net' : '-'}
                      </Badge>
                    )}
                    {campaign.type !== 'email' && '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{format(createdDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center py-4 border-t">
            <Button variant="outline" onClick={loadMoreCampaigns}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Load More ({campaigns.length - displayCount} remaining)
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle 
          title="Campaigns" 
          description="Send messages to your contacts via Email, SMS, or WhatsApp"
        />
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline" size="lg">
            <Link href="/campaigns/compose-email">
              <Edit3 className="mr-2 h-4 w-4" />
              Compose Email
            </Link>
          </Button>
          <Button asChild variant="accent" size="lg">
            <Link href="/campaigns/ai-email">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Email Studio
            </Link>
          </Button>
        </div>
      </div>
      <ContextualHelpButton pageId="email-campaigns" />

      <div className="grid gap-3 md:grid-cols-4 mb-2">
        <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-1">
          <Link href="/campaigns/compose-email">
            <Edit3 className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Write Email</span>
            <span className="text-xs text-muted-foreground">No AI credits needed</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-1">
          <Link href="/campaigns/ai-email">
            <Sparkles className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">AI Email Studio</span>
            <span className="text-xs text-muted-foreground">Generate with AI</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-1">
          <Link href="/campaigns/templates">
            <FileText className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Templates</span>
            <span className="text-xs text-muted-foreground">Ready-to-use designs</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-1">
          <Link href="/campaigns/ai-email/saved-templates">
            <Mail className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Saved Templates</span>
            <span className="text-xs text-muted-foreground">Your saved emails</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS + WhatsApp</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{smsCampaigns.length + whatsappCampaigns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Campaigns</CardTitle>
              <CardDescription>View and manage all your messaging campaigns</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/campaign-jobs">
                <Clock className="mr-2 h-4 w-4" />
                View Delivery Status
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="all">All ({allCampaigns.length})</TabsTrigger>
              <TabsTrigger value="email">Email ({emailCampaigns.length})</TabsTrigger>
              <TabsTrigger value="sms">SMS ({smsCampaigns.length})</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp ({whatsappCampaigns.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCampaignTable(allCampaigns)
              )}
            </TabsContent>
            
            <TabsContent value="email" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCampaignTable(allCampaigns.filter(c => c.type === 'email'))
              )}
            </TabsContent>
            
            <TabsContent value="sms" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCampaignTable(allCampaigns.filter(c => c.type === 'sms'))
              )}
            </TabsContent>
            
            <TabsContent value="whatsapp" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                renderCampaignTable(allCampaigns.filter(c => c.type === 'whatsapp'))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
