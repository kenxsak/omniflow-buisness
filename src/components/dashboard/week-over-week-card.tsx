'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import type { WeekOverWeekStats } from '@/app/actions/analytics-dashboard-actions';

interface WeekOverWeekCardProps {
  stats: WeekOverWeekStats | null;
  loading?: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function ChangeIndicator({ change, label }: { change: number; label: string }) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  return (
    <div className="flex items-center gap-1">
      {isNeutral ? (
        <Minus className="h-3 w-3 text-muted-foreground" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3 w-3 text-green-600" />
      ) : (
        <ArrowDownRight className="h-3 w-3 text-red-600" />
      )}
      <span className={`text-xs font-medium ${
        isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {isNeutral ? 'No change' : `${Math.abs(change).toFixed(0)}%`}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function WeekOverWeekCard({ stats, loading }: WeekOverWeekCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            This Week vs Last Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Week over Week
          </CardTitle>
          <CardDescription>Compare your performance to last week</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No data available yet. Start tracking your sales!
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'New Contacts',
      icon: Users,
      current: stats.currentWeek.newContacts,
      previous: stats.previousWeek.newContacts,
      change: stats.changes.newContacts,
      format: (v: number) => v.toString(),
    },
    {
      label: 'Deals Created',
      icon: Target,
      current: stats.currentWeek.dealsCreated,
      previous: stats.previousWeek.dealsCreated,
      change: stats.changes.dealsCreated,
      format: (v: number) => v.toString(),
    },
    {
      label: 'Deals Won',
      icon: Target,
      current: stats.currentWeek.dealsWon,
      previous: stats.previousWeek.dealsWon,
      change: stats.changes.dealsWon,
      format: (v: number) => v.toString(),
    },
    {
      label: 'Revenue Won',
      icon: DollarSign,
      current: stats.currentWeek.revenueWon,
      previous: stats.previousWeek.revenueWon,
      change: stats.changes.revenueWon,
      format: formatCurrency,
    },
  ];

  const overallTrend = metrics.reduce((sum, m) => sum + m.change, 0) / metrics.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Week over Week
            </CardTitle>
            <CardDescription>Compare your performance to last week</CardDescription>
          </div>
          <Badge 
            variant={overallTrend >= 0 ? 'default' : 'destructive'}
            className={overallTrend >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
          >
            {overallTrend >= 0 ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {overallTrend >= 0 ? 'Improving' : 'Declining'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isPositive = metric.change > 0;
            const isNeutral = metric.change === 0;
            
            return (
              <div 
                key={metric.label}
                className={`p-3 rounded-lg border ${
                  isPositive 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50' 
                    : isNeutral
                      ? 'bg-muted/50 border-muted'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${
                    isPositive ? 'text-green-600' : isNeutral ? 'text-muted-foreground' : 'text-red-600'
                  }`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{metric.format(metric.current)}</span>
                  <span className="text-xs text-muted-foreground">
                    vs {metric.format(metric.previous)}
                  </span>
                </div>
                <ChangeIndicator change={metric.change} label="from last week" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
