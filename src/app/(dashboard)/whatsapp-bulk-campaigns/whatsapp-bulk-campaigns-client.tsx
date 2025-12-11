"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/ui/page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  MessageCircle,
  Plus,
  Loader2,
  Users,
  RefreshCw,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { WhatsAppCampaign, WhatsAppRecipient } from '@/types/messaging';
import { getWhatsAppCampaigns, getWhatsAppCampaignRecipients, deleteWhatsAppCampaign } from '@/lib/messaging-campaigns-data';
import { getWhatsAppLists } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList } from '@/types/whatsapp';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';
import Link from 'next/link';

const CampaignDetailsDialog = dynamic(
  () => import('./components/campaign-details-dialog'),
  { 
    ssr: false,
    loading: () => null 
  }
);

const CreateCampaignForm = dynamic(
  () => import('./components/create-campaign-form'),
  { 
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
);

const CampaignsTable = dynamic(
  () => import('./components/campaigns-table'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

export default function WhatsAppBulkCampaignsClient() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create'>('campaigns');
  
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  const [whatsappLists, setWhatsappLists] = useState<WhatsAppList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<WhatsAppRecipient[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  useEffect(() => {
    if (appUser?.companyId) {
      loadCampaigns();
      loadWhatsAppLists();
    }
  }, [appUser?.companyId]);

  const loadCampaigns = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingCampaigns(true);
    try {
      const campaignsList = await getWhatsAppCampaigns(appUser.companyId);
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

  const loadWhatsAppLists = async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    try {
      const lists = await getWhatsAppLists(appUser.companyId);
      setWhatsappLists(lists);
    } catch (error) {
      console.error('Error loading WhatsApp lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!appUser?.companyId) return;
    
    try {
      await deleteWhatsAppCampaign(appUser.companyId, campaignId);
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

  const handleViewCampaign = async (campaign: WhatsAppCampaign) => {
    if (!appUser?.companyId) return;
    
    setSelectedCampaign(campaign);
    setShowDetailsDialog(true);
    setIsLoadingRecipients(true);
    
    try {
      const recipients = await getWhatsAppCampaignRecipients(appUser.companyId, campaign.id);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle
          title="Send to Many People"
          subtitle="Send WhatsApp messages to hundreds or thousands of contacts at once"
          icon={MessageCircle}
        />
        <Button asChild>
          <Link href="/ai-campaigns?channel=whatsapp">
            <Sparkles className="mr-2 h-4 w-4" /> Create with AI
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 && !isLoadingCampaigns && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Quick Start Guide</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2 mt-2">
              <p className="text-sm">To send your first WhatsApp message to many people:</p>
              <ol className="text-sm space-y-1 ml-4 list-decimal">
                <li>Choose your platform (Meta, WMart CPaaS, AiSensy, or WATI) and connect it in Settings</li>
                <li>Create a list of contacts in WhatsApp Marketing</li>
                <li>Come back here and click "Create Campaign" to send</li>
              </ol>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button asChild className="min-h-11" variant="outline">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Set Up Connection
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
                    View and manage your WhatsApp bulk campaigns
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadCampaigns} disabled={isLoadingCampaigns}>
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
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first WhatsApp bulk campaign to get started
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <CampaignsTable
                  campaigns={campaigns}
                  onView={handleViewCampaign}
                  onDelete={handleDeleteCampaign}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {activeTab === 'create' && (
          <TabsContent value="create" className="space-y-4" forceMount>
            <CreateCampaignForm
              whatsappLists={whatsappLists}
              onCampaignCreated={loadCampaigns}
              onTabChange={(tab) => setActiveTab(tab as 'campaigns' | 'create')}
            />
          </TabsContent>
        )}
      </Tabs>

      {showDetailsDialog && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          recipients={campaignRecipients}
          isLoadingRecipients={isLoadingRecipients}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}

      <ContextualHelpButton pageId="whatsapp-bulk-campaigns" />
    </div>
  );
}
