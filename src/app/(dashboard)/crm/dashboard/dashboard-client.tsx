"use client";

import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ContactUsageIndicator } from '@/components/crm/contact-usage-indicator';
import { TeamPerformanceDashboard } from '@/components/crm/team-performance-dashboard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, CheckCircle, Target, DollarSign, Percent, Activity, ArrowUpRight, ArrowDownRight, UsersRound } from 'lucide-react';
import type { DealStats, Activity as ActivityType } from '@/types/crm';
import { ACTIVITY_TYPE_LABELS } from '@/types/crm';
import type { Role, AppUser } from '@/types/saas';
import type { Lead } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/currency-context';

interface DashboardStats {
  total: number;
  new: number;
  synced: number;
  won: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: string;
}

interface DashboardClientProps {
  stats: DashboardStats;
  statusDistribution: StatusDistribution[];
  planMetadata: {
    planId: string;
    planName: string;
    maxContacts: number | null;
  } | null;
  dealStats?: DealStats;
  weightedPipeline?: number;
  recentActivities?: ActivityType[];
  userRole?: Role;
  teamMembers?: AppUser[];
  leads?: Lead[];
}

export function DashboardClient({ 
  stats, 
  statusDistribution, 
  planMetadata,
  dealStats,
  weightedPipeline = 0,
  recentActivities = [],
  userRole,
  teamMembers = [],
  leads = [],
}: DashboardClientProps) {
  const { formatCurrency } = useCurrency();
  const conversionRate = dealStats?.conversionRate || 0;
  const pipelineValue = dealStats?.totalPipelineValue || 0;
  const wonValue = dealStats?.wonValue || 0;
  
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'superadmin';
  const hasTeamMembers = teamMembers.length > 1;

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" description="Overview of your CRM performance" />

      {planMetadata && (
        <ContactUsageIndicator
          currentContactCount={stats.total}
          maxContacts={planMetadata.maxContacts}
          planName={planMetadata.planName}
          compact={true}
        />
      )}
      
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
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
              Weighted: {formatCurrency(weightedPipeline)}
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
              {formatCurrency(wonValue)}
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
              {dealStats?.openDeals || 0} deals in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.new} new this period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest interactions with your contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activities. Start engaging with your contacts!
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.occurredAt as string), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Status Distribution</CardTitle>
            <CardDescription>Breakdown of contacts by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusDistribution.map(({ status, count, percentage }) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.new}</div>
            <p className="text-xs text-muted-foreground">Awaiting first contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.synced}</div>
            <p className="text-xs text-muted-foreground">Synced to platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(dealStats?.avgDealSize || 0)}</div>
            <p className="text-xs text-muted-foreground">Per opportunity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{dealStats?.openDeals || 0}</div>
            <p className="text-xs text-muted-foreground">In active pipeline</p>
          </CardContent>
        </Card>
      </div>

      {isManagerOrAdmin && hasTeamMembers && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <UsersRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Team Performance</h2>
              <p className="text-sm text-muted-foreground">Manager view: Per-rep performance metrics</p>
            </div>
          </div>
          <TeamPerformanceDashboard leads={leads} teamMembers={teamMembers} />
        </div>
      )}
    </div>
  );
}
