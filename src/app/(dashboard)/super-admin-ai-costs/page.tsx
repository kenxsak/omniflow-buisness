'use client';

/**
 * Super Admin AI Cost Monitoring Dashboard
 * 
 * This page provides platform-wide visibility into:
 * - Total AI operations and costs
 * - Revenue and profit margins
 * - Company-level usage breakdown
 * - Top consumers
 * - Monthly trends
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageTitle from '@/components/ui/page-title';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2, DollarSign, TrendingUp, Users, Activity, BarChart3, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getPlatformAIStatisticsAction,
  getAllCompaniesAIUsageAction,
  getHistoricalAIStatisticsAction,
  type PlatformAIOverview,
  type CompanyAIUsageDetail,
} from '@/app/actions/super-admin-ai-stats-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminAICostsPage() {
  const { appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<PlatformAIOverview | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyAIUsageDetail[]>([]);
  const [historicalData, setHistoricalData] = useState<Array<{
    month: string;
    totalOperations: number;
    totalRevenue: number;
    totalProfit: number;
    totalGoogleCost: number;
  }>>([]);

  // Redirect if not Super Admin
  useEffect(() => {
    if (!authLoading && (!appUser || appUser.role !== 'superadmin')) {
      toast({
        title: 'Access Denied',
        description: 'This page is only accessible to Super Admins.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [appUser, authLoading, router, toast]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsResult, companiesResult, historyResult] = await Promise.all([
        getPlatformAIStatisticsAction(),
        getAllCompaniesAIUsageAction(),
        getHistoricalAIStatisticsAction(6),
      ]);

      if (statsResult.success && statsResult.data) {
        setPlatformStats(statsResult.data);
      }

      if (companiesResult.success && companiesResult.data) {
        setCompanyDetails(companiesResult.data);
      }

      if (historyResult.success && historyResult.data) {
        setHistoricalData(historyResult.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load AI cost statistics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appUser?.role === 'superadmin') {
      loadData();
    }
  }, [appUser]);

  if (authLoading || !appUser || appUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <PageTitle title="AI Cost Monitoring" />
          <p className="text-muted-foreground">Platform-wide AI usage, costs, and profitability</p>
        </div>
        <Button onClick={loadData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(platformStats?.currentMonth.totalOperations || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {platformStats?.currentMonth.activeCompaniesCount || 0} active companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Costs</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(platformStats?.currentMonth.totalGoogleCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Paid to Google APIs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(platformStats?.currentMonth.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Charged to users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(platformStats?.currentMonth.totalProfit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {platformStats?.currentMonth.profitMarginPercent.toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="companies" className="w-full">
            <TabsList>
              <TabsTrigger value="companies">All Companies</TabsTrigger>
              <TabsTrigger value="top-consumers">Top Consumers</TabsTrigger>
              <TabsTrigger value="breakdown">Operation Breakdown</TabsTrigger>
            </TabsList>

            {/* All Companies Table */}
            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>Company AI Usage Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of AI usage by company (sorted by revenue)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Operations</TableHead>
                        <TableHead className="text-right">Credits Used</TableHead>
                        <TableHead className="text-right">Our Cost</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead>API Key</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No AI usage data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        companyDetails.map((company) => (
                          <TableRow key={company.companyId}>
                            <TableCell className="font-medium">{company.companyName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{company.planName}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(company.currentMonth.operations)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(company.currentMonth.creditsUsed)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(company.currentMonth.estimatedCost)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(company.currentMonth.platformRevenue)}
                            </TableCell>
                            <TableCell className="text-right text-blue-600">
                              {formatCurrency(company.currentMonth.platformProfit)}
                            </TableCell>
                            <TableCell>
                              {company.usingOwnApiKey ? (
                                <Badge variant="secondary">Own Key</Badge>
                              ) : (
                                <Badge variant="default">Platform</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Top Consumers */}
            <TabsContent value="top-consumers">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 AI Consumers</CardTitle>
                  <CardDescription>Companies with highest AI usage this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Operations</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platformStats?.topConsumers.map((company, index) => (
                        <TableRow key={company.companyId}>
                          <TableCell>
                            <Badge variant={index < 3 ? 'default' : 'outline'}>#{index + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{company.companyName}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(company.operations)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(company.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(company.profit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operation Breakdown */}
            <TabsContent value="breakdown">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Operations by Type</CardTitle>
                    <CardDescription>Distribution of AI operations this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Text Generation</span>
                      <span className="text-sm font-medium">
                        {formatNumber(platformStats?.operationBreakdown.textGeneration || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Image Generation</span>
                      <span className="text-sm font-medium">
                        {formatNumber(platformStats?.operationBreakdown.imageGeneration || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Text-to-Speech</span>
                      <span className="text-sm font-medium">
                        {formatNumber(platformStats?.operationBreakdown.textToSpeech || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-bold">Total</span>
                      <span className="text-sm font-bold">
                        {formatNumber(platformStats?.operationBreakdown.total || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Key Distribution</CardTitle>
                    <CardDescription>Companies by API key usage</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Using Platform API</span>
                      <Badge variant="default">
                        {platformStats?.apiKeyDistribution.usingPlatformAPI || 0} companies
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Using Own API Key</span>
                      <Badge variant="secondary">
                        {platformStats?.apiKeyDistribution.usingOwnAPI || 0} companies
                      </Badge>
                    </div>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Companies using their own API keys save 100% on our markup but still
                        contribute to platform usage statistics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Historical Trend (Simple Table View) */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends (Last 6 Months)</CardTitle>
              <CardDescription>Monthly AI usage and financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Operations</TableHead>
                    <TableHead className="text-right">Our Cost</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalData.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(month.totalOperations)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(month.totalGoogleCost)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(month.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(month.totalProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
