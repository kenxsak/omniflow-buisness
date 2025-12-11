'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import PageTitle from '@/components/ui/page-title';
import StatCard from '@/components/dashboard/stat-card';
import QuickActionsPanel from '@/components/dashboard/quick-actions-panel';
import SuperAdminDashboard from '@/components/admin/superadmin-dashboard';
import OnboardingChecklist from '@/components/onboarding/onboarding-checklist';
import { CrmWelcomeModal } from '@/components/onboarding/crm-welcome-modal';
import { NextStepsPanel } from '@/components/onboarding/next-steps-panel';
import { QuickTips, CRM_PAGE_TIPS } from '@/components/onboarding/quick-tips';
import { WeekOverWeekCard } from '@/components/dashboard/week-over-week-card';
import { PipelineConversionChart } from '@/components/dashboard/pipeline-conversion-chart';
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart';
import { TopPerformersCard } from '@/components/dashboard/top-performers-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Users, DollarSign, Zap, TrendingUp, AlertCircle, 
  Target, Percent, ArrowUpRight, Sparkles, Rocket, CalendarDays, ClipboardCheck, Users2
} from 'lucide-react';
import Link from 'next/link';
import { getStoredLeads } from '@/lib/mock-data';
import { getCompanyAIAnalyticsAction } from '@/app/actions/company-ai-analytics-actions';
import { getDealStats } from '@/app/actions/deal-actions';
import { getDashboardAnalytics } from '@/app/actions/analytics-dashboard-actions';
import { skipOnboardingAction, completeOnboardingAction } from '@/app/actions/onboarding-client-actions';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';
import { UpcomingAppointmentsCard } from '@/components/dashboard/upcoming-appointments-card';
import { MyTasksCard } from '@/components/dashboard/my-tasks-card';
import { EnterpriseActivityCard } from '@/components/dashboard/enterprise-activity-card';
import type { DealStats } from '@/types/crm';
import type { WeekOverWeekStats, PipelineStageConversion, SalesTrendData, TeamPerformer } from '@/app/actions/analytics-dashboard-actions';

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export default function DashboardPage() {
  const { appUser, company, isSuperAdmin, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [leadCount, setLeadCount] = useState(0);
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0);
  const [aiCreditsLimit, setAiCreditsLimit] = useState(0);
  const [dealStats, setDealStats] = useState<DealStats | null>(null);
  const [weekOverWeek, setWeekOverWeek] = useState<WeekOverWeekStats | null>(null);
  const [pipelineConversion, setPipelineConversion] = useState<PipelineStageConversion[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TeamPerformer[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!company?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [leads, aiAnalytics, stats, analytics] = await Promise.all([
          getStoredLeads(company.id),
          getCompanyAIAnalyticsAction(company.id),
          getDealStats(company.id),
          getDashboardAnalytics(company.id),
        ]);

        setLeadCount(leads.length);
        setDealStats(stats);

        if (aiAnalytics?.success && aiAnalytics.data) {
          setAiCreditsUsed(aiAnalytics.data.currentMonth.creditsUsed);
          setAiCreditsLimit(aiAnalytics.data.currentMonth.creditsLimit);
        }

        if (analytics) {
          setWeekOverWeek(analytics.weekOverWeek);
          setPipelineConversion(analytics.pipelineConversion);
          setSalesTrend(analytics.salesTrend);
          setTopPerformers(analytics.topPerformers);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [company]);

  const handleDismissOnboarding = async () => {
    if (company?.id) {
      await skipOnboardingAction(company.id);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (company?.id) {
      await completeOnboardingAction(company.id);
    }
  };

  if (authLoading || !appUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  const aiUsagePercent = aiCreditsLimit > 0 ? (aiCreditsUsed / aiCreditsLimit) * 100 : 0;
  const showAiWarning = aiUsagePercent >= 80;
  const pipelineValue = dealStats?.totalPipelineValue || 0;
  const conversionRate = dealStats?.conversionRate || 0;
  const wonRevenue = dealStats?.wonValue || 0;

  return (
    <div className="space-y-6">
      <CrmWelcomeModal 
        company={company} 
        onDismiss={handleDismissOnboarding}
        onComplete={handleCompleteOnboarding}
      />

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {appUser.name?.split(' ')[0] || 'there'}!
            </h1>
            {wonRevenue > 0 && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <TrendingUp className="h-3 w-3 mr-1" />
                {formatCurrency(wonRevenue)} won
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Here's what's happening with your business today.
          </p>
        </div>
        <ContextualHelpButton pageId="dashboard" />
      </div>

      <QuickTips pageId="dashboard" tips={CRM_PAGE_TIPS.dashboard} />

      <OnboardingChecklist />

      {showAiWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Smart Tools Running Low</AlertTitle>
          <AlertDescription>
            You've used {aiUsagePercent.toFixed(0)}% of your smart tools quota. Consider upgrading your plan to keep using smart features.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(pipelineValue)}
                </div>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {dealStats?.openDeals || 0} open deals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Won Revenue</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(wonRevenue)}
                </div>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {dealStats?.wonDeals || 0} deals closed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                  Deals won vs closed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadCount}</div>
                <p className="text-xs text-muted-foreground">
                  {leadCount > 0 ? 'In your CRM' : 'Add contacts to get started'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <UpcomingAppointmentsCard />
            <MyTasksCard />
            <EnterpriseActivityCard />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <WeekOverWeekCard stats={weekOverWeek} />
            <TopPerformersCard performers={topPerformers} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SalesTrendChart data={salesTrend} chartType="area" />
            <PipelineConversionChart data={pipelineConversion} />
          </div>

          {(leadCount < 10 || !dealStats || dealStats.totalDeals === 0) && (
            <NextStepsPanel 
              contactCount={leadCount} 
              dealStats={dealStats || undefined}
              hasSentCampaign={false}
              hasUsedAI={aiCreditsUsed > 0}
            />
          )}

          {aiCreditsLimit > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Smart Tools This Month
                </CardTitle>
                <CardDescription>
                  Track how much you're using our AI-powered features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {aiCreditsUsed.toLocaleString()} of {aiCreditsLimit.toLocaleString()} uses
                    </span>
                    <span className="font-medium">{aiUsagePercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={aiUsagePercent} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          <QuickActionsPanel companyId={company?.id} />
        </>
      )}
    </div>
  );
}
