
'use client';

/**
 * Company AI Usage Analytics Page
 * 
 * Allows company users (Admin, Manager, User) to view their AI usage,
 * costs, credits, and optimization recommendations.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageTitle from '@/components/ui/page-title';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Zap, TrendingUp, DollarSign, AlertTriangle, Key, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getCompanyAIAnalyticsAction,
  getCompanyHistoricalUsageAction,
  type CompanyAIAnalytics,
} from '@/app/actions/company-ai-analytics-actions';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AIUsagePage() {
  const { appUser, company, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CompanyAIAnalytics | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{
    month: string;
    operations: number;
    creditsUsed: number;
    cost: number;
  }>>([]);

  const loadData = async () => {
    if (!company) return;
    
    setIsLoading(true);
    try {
      const [analyticsResult, historyResult] = await Promise.all([
        getCompanyAIAnalyticsAction(company.id),
        getCompanyHistoricalUsageAction(company.id, 6),
      ]);

      if (analyticsResult.success && analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      } else {
        toast({
          title: 'Error',
          description: analyticsResult.error || 'Failed to load AI usage analytics',
          variant: 'destructive',
        });
      }

      if (historyResult.success && historyResult.data) {
        setHistoricalData(historyResult.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load AI usage data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (company) {
      loadData();
    }
  }, [company]);

  if (authLoading || !appUser || !company) {
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

  const creditsUsagePercent = analytics
    ? (analytics.currentMonth.creditsUsed / (analytics.currentMonth.creditsLimit || 1)) * 100
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <PageTitle title="AI Usage Analytics" />
          <p className="text-muted-foreground">Monitor your AI usage, costs, and credits</p>
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
          {/* Recommendations / Alerts */}
          {analytics && analytics.recommendations.length > 0 && (
            <div className="space-y-3">
              {analytics.recommendations.map((rec, index) => (
                <Alert key={index} variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                  {rec.priority === 'high' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{rec.title}</AlertTitle>
                  <AlertDescription>
                    {rec.description}
                    {rec.potentialSavings && (
                      <span className="font-semibold ml-1">
                        Save {formatCurrency(rec.potentialSavings)}/month!
                      </span>
                    )}
                    {rec.actionRequired && (
                      <div className="mt-2">
                        <Button size="sm" asChild>
                          <Link href="/settings?tab=integrations">
                            {rec.actionRequired}
                          </Link>
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Credits</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.currentMonth.creditsRemaining || 0)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  of {formatNumber(analytics?.currentMonth.creditsLimit || 0)} remaining
                </p>
                <Progress value={creditsUsagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {creditsUsagePercent.toFixed(1)}% used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.currentMonth.operations || 0)}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.currentMonth.estimatedCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.apiKeyInfo.usingOwnKey ? 'Using own API key' : 'Using platform API'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.plan.name}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(analytics?.plan.monthlyCreditsLimit || 0)} credits/month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quota Status */}
          {analytics?.currentMonth.quotaExceeded && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Quota Exceeded</AlertTitle>
              <AlertDescription>
                You have exceeded your monthly AI quota. Please upgrade your plan or wait until{' '}
                {new Date(analytics.currentMonth.resetDate).toLocaleDateString()} when your quota resets.
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Breakdown</CardTitle>
              <CardDescription>AI operations by type this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="font-medium">Text Generation</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(analytics?.breakdown.textGeneration?.calls || 0)} calls •{' '}
                    {formatNumber(analytics?.breakdown.textGeneration?.tokens || 0)} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(analytics?.breakdown.textGeneration?.cost || 0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="font-medium">Image Generation</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(analytics?.breakdown.imageGeneration?.images || 0)} images
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(analytics?.breakdown.imageGeneration?.cost || 0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2">
                <div>
                  <p className="font-medium">Text-to-Speech</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(analytics?.breakdown.textToSpeech?.calls || 0)} calls •{' '}
                    {formatNumber(analytics?.breakdown.textToSpeech?.characters || 0)} characters
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(analytics?.breakdown.textToSpeech?.cost || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key Savings Info */}
          {!analytics?.apiKeyInfo.usingOwnKey && analytics?.apiKeyInfo.savingsIfOwnKey && analytics.apiKeyInfo.savingsIfOwnKey > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Save Money with Your Own API Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  You could save <span className="font-bold text-lg">{formatCurrency(analytics.apiKeyInfo.savingsIfOwnKey)}</span> per month
                  by adding your own Gemini API key. You'll only pay Google's cost with no platform markup.
                </p>
                <Button asChild>
                  <Link href="/settings?tab=integrations">
                    <Key className="mr-2 h-4 w-4" />
                    Add Your API Key
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Historical Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Usage (Last 6 Months)</CardTitle>
              <CardDescription>Monthly AI operations and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Operations</TableHead>
                      <TableHead className="text-right">Credits Used</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalData.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right">{formatNumber(month.operations)}</TableCell>
                        <TableCell className="text-right">{formatNumber(month.creditsUsed)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
