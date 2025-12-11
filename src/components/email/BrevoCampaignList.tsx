
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchBrevoCampaignsAction, sendBrevoCampaignAction, type SendBrevoCampaignActionResponse } from '@/actions/brevo-campaigns';
import type { BrevoAPICampaign } from '@/types/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Send, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from '@/components/ui/alert';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

const getBrevoCampaignStatusClass = (status: BrevoAPICampaign['status']) => {
  switch (status?.toLowerCase()) {
    case 'sent':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'queued':
    case 'inprocess': 
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse';
    case 'suspended':
    case 'archive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default: 
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'; 
  }
};


export default function BrevoCampaignList() {
  const [campaigns, setCampaigns] = useState<BrevoAPICampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null);
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [campaignsPerPage, setCampaignsPerPage] = useState(10);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  useEffect(() => {
    if (!appUser || !company) {
      if (!company && appUser) {
        setError("Could not load company data. API keys are unavailable.");
        setIsLoading(false);
      }
      return;
    }

    const loadCampaigns = async () => {
      setIsLoading(true);
      setError(null);
      
      const brevoApiKey = company.apiKeys?.brevo?.apiKey;

      if (!brevoApiKey) {
          setError("Brevo API Key not configured. Please add it in the Settings page.");
          setIsLoading(false);
          setCampaigns([]);
          return;
      }

      try {
        const result = await fetchBrevoCampaignsAction(brevoApiKey, 50, 0, 'desc'); 
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
          setCurrentPage(1);
        } else {
          const errorMessage = result.error || 'Failed to load campaigns from Brevo.';
          setError(errorMessage);
          setCampaigns([]);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCampaigns();
  }, [refreshTrigger, appUser, company]);
  
  const handleSendCampaign = async (campaignId: number, campaignName: string) => {
    if (!company) return;
    setSendingCampaignId(campaignId);

    const brevoApiKey = company.apiKeys?.brevo?.apiKey;

    if (!brevoApiKey) {
        toast({ title: "API Key Missing", description: "Cannot send campaign without a Brevo API key.", variant: "destructive" });
        setSendingCampaignId(null);
        return;
    }

    try {
      const result: SendBrevoCampaignActionResponse = await sendBrevoCampaignAction(brevoApiKey, campaignId);
      if (result.success) {
        toast({ title: 'Campaign Sent', description: result.message || `Campaign "${campaignName}" is being sent via Brevo.` });
        setTimeout(handleRefresh, 3000); 
      } else {
        toast({ title: 'Send Failed', description: result.error || `Could not send campaign "${campaignName}".`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error Sending Campaign', description: err.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setSendingCampaignId(null);
    }
  };

  const indexOfLastCampaign = currentPage * campaignsPerPage;
  const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
  const currentCampaignsToDisplay = campaigns.slice(indexOfFirstCampaign, indexOfLastCampaign);
  const totalPages = Math.ceil(campaigns.length / campaignsPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
    }
  };

  const handleCampaignsPerPageChange = (value: string) => {
    setCampaignsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Brevo Email Campaigns</CardTitle>
          <CardDescription>View and manage your email campaigns directly from Brevo.</CardDescription>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading && campaigns.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && campaigns.length === 0 && (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading Brevo campaigns...</p>
          </div>
        )}
        {error && !isLoading && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitleComponent>Could Not Load Brevo Campaigns</AlertTitleComponent>
                <AlertDescription>
                    {error}
                    {error.includes("API Key not configured") && (
                        <p className="mt-2 text-xs">
                           Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add your Brevo API key.
                        </p>
                    )}
                </AlertDescription>
            </Alert>
        )}
        {!isLoading && !error && campaigns.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No campaigns found in Brevo. If this is unexpected, check your API key in Settings.</p>
        )}
        {campaigns.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCampaignsToDisplay.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={campaign.name}>{campaign.name}</TableCell>
                      <TableCell className="max-w-xs truncate" title={campaign.subject}>{campaign.subject}</TableCell>
                      <TableCell>
                        <Badge className={`${getBrevoCampaignStatusClass(campaign.status)} text-xs`} variant="outline">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(campaign.createdAt), 'PPp')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                          disabled={sendingCampaignId === campaign.id || campaign.status.toLowerCase() === 'sent' || campaign.status.toLowerCase() === 'inprocess' || campaign.status.toLowerCase() === 'queued'}
                          title={campaign.status.toLowerCase() === 'sent' ? 'Already sent' : (campaign.status.toLowerCase() === 'inprocess' || campaign.status.toLowerCase() === 'queued' ? 'Sending...' : 'Send Campaign')}
                        >
                          {sendingCampaignId === campaign.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            campaign.status.toLowerCase() === 'sent' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />
                          )}
                          {campaign.status.toLowerCase() === 'sent' ? 'Sent' : (campaign.status.toLowerCase() === 'inprocess' || campaign.status.toLowerCase() === 'queued' ? 'Sending...' : 'Send Now')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select value={campaignsPerPage.toString()} onValueChange={handleCampaignsPerPageChange}>
                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map(val => <SelectItem key={val} value={val.toString()}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
