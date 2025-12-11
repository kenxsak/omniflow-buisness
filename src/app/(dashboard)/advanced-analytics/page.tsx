"use client";

/**
 * Advanced Analytics Dashboard Page
 * 
 * Comprehensive business intelligence, conversion tracking, and ROI calculations
 * for marketing efforts.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, RefreshCw, TrendingUp, Info, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type {
  AnalyticsPeriod,
  ConversionFunnel,
  CampaignROI,
  PredictiveAnalytics,
  RevenueAttribution,
  AdvancedMetrics,
} from '@/types/analytics';
import {
  getConversionFunnelData,
  calculateCampaignROI,
  getPredictiveInsights,
  getRevenueAttribution,
  getAdvancedMetrics,
  getHistoricalLeadCounts,
} from '@/app/actions/advanced-analytics-actions';
import ConversionFunnelChart from '@/components/analytics/conversion-funnel-chart';
import ROICalculator from '@/components/analytics/roi-calculator';
import PredictiveChart from '@/components/analytics/predictive-chart';
import AttributionBreakdown from '@/components/analytics/attribution-breakdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/analytics-service';
import { format } from 'date-fns';

export default function AdvancedAnalyticsPage() {
  const { appUser, company } = useAuth();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<AnalyticsPeriod>('30days');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([]);
  const [predictive, setPredictive] = useState<PredictiveAnalytics | null>(null);
  const [attribution, setAttribution] = useState<RevenueAttribution | null>(null);
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [historicalLeads, setHistoricalLeads] = useState<number[]>([]);
  
  const loadAnalytics = useCallback(async () => {
    if (!appUser?.companyId || !company) {
      setIsLoading(false);
      return;
    }
    
    try {
      const apiKeys = company.apiKeys || {};
      const brevoKey = apiKeys.brevo?.apiKey;
      const twilioSid = apiKeys.twilio?.accountSid;
      const twilioToken = apiKeys.twilio?.authToken;
      
      // Load all analytics data in parallel
      const [
        funnelResult,
        campaignsResult,
        predictiveResult,
        attributionResult,
        metricsResult,
      ] = await Promise.all([
        getConversionFunnelData(appUser.companyId, period),
        calculateCampaignROI(appUser.companyId, period, brevoKey, twilioSid, twilioToken),
        getPredictiveInsights(appUser.companyId),
        getRevenueAttribution(appUser.companyId, period),
        getAdvancedMetrics(appUser.companyId, period, brevoKey, twilioSid, twilioToken),
      ]);
      
      if (funnelResult.success && funnelResult.data) {
        setFunnel(funnelResult.data);
      }
      
      if (campaignsResult.success && campaignsResult.data) {
        setCampaigns(campaignsResult.data);
      }
      
      if (predictiveResult.success && predictiveResult.data) {
        setPredictive(predictiveResult.data);
      }
      
      if (attributionResult.success && attributionResult.data) {
        setAttribution(attributionResult.data);
      }
      
      if (metricsResult.success && metricsResult.data) {
        setMetrics(metricsResult.data);
      }
      
      // Get historical leads for chart
      const historicalResult = await getHistoricalLeadCounts(appUser.companyId);
      if (historicalResult.success && historicalResult.data) {
        setHistoricalLeads(historicalResult.data);
      }
      
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [appUser, company, period, toast]);
  
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    toast({
      title: 'Refreshed',
      description: 'Analytics data has been updated',
    });
  };
  
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod as AnalyticsPeriod);
  };
  
  const handleExport = async () => {
    if (!metrics) return;
    
    try {
      const XLSX = await import('xlsx');
      // Prepare data for export
      const exportData = [
        ['Advanced Analytics Report'],
        ['Period', period],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Key Metrics'],
        ['Total Leads', metrics.kpis.totalLeads],
        ['Total Revenue', formatCurrency(metrics.kpis.totalRevenue)],
        ['Marketing Spend', formatCurrency(metrics.kpis.totalMarketingSpend)],
        ['Overall ROI', formatPercentage(metrics.kpis.overallROI)],
        [],
        ['Conversion Rates'],
        ['View to Lead', formatPercentage(metrics.conversions.viewToLead)],
        ['Lead to Customer', formatPercentage(metrics.conversions.leadToCustomer)],
        ['Overall Conversion', formatPercentage(metrics.conversions.overallConversion)],
        [],
        ['Channel Performance'],
        ['Channel', 'Leads', 'Revenue', 'ROI'],
        ...metrics.channelPerformance.map(ch => [
          ch.channel,
          ch.leads,
          formatCurrency(ch.revenue),
          formatPercentage(ch.roi),
        ]),
      ];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
      
      const filename = `analytics-${period}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast({
        title: 'Exported',
        description: `Analytics data exported to ${filename}`,
      });
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'Failed to export analytics data',
        variant: 'destructive',
      });
    }
  };
  
  if (!appUser || !company) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Please log in to view analytics</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <PageTitle
            title="Advanced Analytics"
            description="Business intelligence, conversion tracking, and ROI calculations"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={handleExport} variant="default" disabled={!metrics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Alerts */}
      {metrics && metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.map((alert, idx) => (
            <Alert key={idx} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
              <AlertDescription>
                <strong>{alert.message}</strong>
                {alert.action && <p className="text-sm mt-1">→ {alert.action}</p>}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      
      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="funnel">Funnel</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="attribution">Attribution</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Cards */}
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Total Leads</CardDescription>
                      <CardTitle className="text-3xl">{metrics.kpis.totalLeads}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metrics.periodComparison.leadsGrowth !== 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className={`h-4 w-4 ${metrics.periodComparison.leadsGrowth > 0 ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={metrics.periodComparison.leadsGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {metrics.periodComparison.leadsGrowth > 0 ? '+' : ''}{metrics.periodComparison.leadsGrowth.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Total Revenue</CardDescription>
                      <CardTitle className="text-3xl">{formatCurrency(metrics.kpis.totalRevenue)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metrics.periodComparison.revenueGrowth !== 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className={`h-4 w-4 ${metrics.periodComparison.revenueGrowth > 0 ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={metrics.periodComparison.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {metrics.periodComparison.revenueGrowth > 0 ? '+' : ''}{metrics.periodComparison.revenueGrowth.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Overall ROI</CardDescription>
                      <CardTitle className="text-3xl">{formatPercentage(metrics.kpis.overallROI, 0)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={metrics.kpis.overallROI >= 200 ? 'default' : 'secondary'}>
                        {metrics.kpis.overallROI >= 200 ? 'Excellent' : 'Good'}
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Marketing Spend</CardDescription>
                      <CardTitle className="text-3xl">{formatCurrency(metrics.kpis.totalMarketingSpend)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        CPL: {formatCurrency(metrics.costs.costPerLead)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Funnel + ROI Calculator */}
              <div className="grid md:grid-cols-2 gap-6">
                {funnel && <ConversionFunnelChart funnel={funnel} />}
                <ROICalculator />
              </div>
            </TabsContent>
            
            {/* Funnel Tab */}
            <TabsContent value="funnel" className="space-y-6">
              {funnel ? (
                <ConversionFunnelChart funnel={funnel} />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>No funnel data available for this period</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance & ROI</CardTitle>
                  <CardDescription>Detailed ROI analysis for your marketing campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Customers</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Spend</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.campaignId}>
                            <TableCell className="font-medium">
                              {campaign.campaignName}
                              <div className="text-xs text-muted-foreground capitalize">
                                {campaign.campaignType}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{campaign.leadsGenerated}</TableCell>
                            <TableCell className="text-right">{campaign.customersAcquired}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(campaign.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(campaign.marketingSpend + campaign.aiCostsUsed)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={campaign.roi >= 200 ? 'default' : campaign.roi >= 100 ? 'secondary' : 'outline'}>
                                {formatPercentage(campaign.roi, 0)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={
                                campaign.performanceRating === 'excellent' ? 'default' :
                                campaign.performanceRating === 'good' ? 'secondary' : 'outline'
                              }>
                                {campaign.performanceRating}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No campaign data available. Connect Brevo or Twilio to track campaign ROI.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              <ROICalculator />
            </TabsContent>
            
            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-6">
              {predictive ? (
                <PredictiveChart analytics={predictive} historicalLeads={historicalLeads} />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient data for predictions. Need at least 3 months of historical data.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            {/* Attribution Tab */}
            <TabsContent value="attribution" className="space-y-6">
              {attribution ? (
                <AttributionBreakdown attribution={attribution} />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>No attribution data available for this period</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
