'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, GitBranch, DollarSign, Mail, Target, Sparkles,
  ArrowRight, CheckCircle2, Circle, TrendingUp, Send
} from 'lucide-react';
import Link from 'next/link';
import type { DealStats } from '@/types/crm';

interface NextStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  actionLabel: string;
  priority: 'high' | 'medium' | 'low';
  condition: (data: NextStepsData) => boolean;
  completed: (data: NextStepsData) => boolean;
}

interface NextStepsData {
  contactCount: number;
  dealStats?: DealStats;
  hasSentCampaign: boolean;
  hasUsedAI: boolean;
}

const NEXT_STEPS: NextStep[] = [
  {
    id: 'add-contacts',
    title: 'Add more contacts',
    description: 'Build your contact list to grow your sales pipeline',
    icon: Users,
    href: '/crm',
    actionLabel: 'Add Contacts',
    priority: 'high',
    condition: (data) => data.contactCount < 10,
    completed: (data) => data.contactCount >= 10,
  },
  {
    id: 'create-deal',
    title: 'Create your first deal',
    description: 'Track opportunities and forecast revenue',
    icon: DollarSign,
    href: '/crm/pipeline',
    actionLabel: 'Create Deal',
    priority: 'high',
    condition: (data) => !data.dealStats || data.dealStats.totalDeals === 0,
    completed: (data) => data.dealStats ? data.dealStats.totalDeals > 0 : false,
  },
  {
    id: 'view-pipeline',
    title: 'Review your pipeline',
    description: 'Visualize deals across stages',
    icon: GitBranch,
    href: '/crm/pipeline',
    actionLabel: 'View Pipeline',
    priority: 'medium',
    condition: (data) => data.dealStats ? data.dealStats.totalDeals > 0 && data.dealStats.openDeals > 0 : false,
    completed: () => false,
  },
  {
    id: 'send-campaign',
    title: 'Send a marketing campaign',
    description: 'Reach your contacts with email, SMS, or WhatsApp',
    icon: Send,
    href: '/campaigns',
    actionLabel: 'Create Campaign',
    priority: 'medium',
    condition: (data) => !data.hasSentCampaign && data.contactCount >= 5,
    completed: (data) => data.hasSentCampaign,
  },
  {
    id: 'try-ai',
    title: 'Try AI content generation',
    description: 'Let AI write compelling marketing messages',
    icon: Sparkles,
    href: '/ai-assistant',
    actionLabel: 'Try AI',
    priority: 'low',
    condition: (data) => !data.hasUsedAI,
    completed: (data) => data.hasUsedAI,
  },
  {
    id: 'close-deal',
    title: 'Close a deal',
    description: 'Mark a deal as won to track revenue',
    icon: Target,
    href: '/crm/pipeline',
    actionLabel: 'View Deals',
    priority: 'high',
    condition: (data) => data.dealStats ? data.dealStats.openDeals > 0 && data.dealStats.wonDeals === 0 : false,
    completed: (data) => data.dealStats ? data.dealStats.wonDeals > 0 : false,
  },
  {
    id: 'grow-revenue',
    title: 'Grow your pipeline',
    description: 'Add more high-value opportunities',
    icon: TrendingUp,
    href: '/crm/pipeline',
    actionLabel: 'Add Deals',
    priority: 'medium',
    condition: (data) => data.dealStats ? data.dealStats.wonDeals > 0 && data.dealStats.openDeals < 5 : false,
    completed: (data) => data.dealStats ? data.dealStats.openDeals >= 5 : false,
  },
];

const priorityColors = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

interface NextStepsPanelProps {
  contactCount: number;
  dealStats?: DealStats;
  hasSentCampaign?: boolean;
  hasUsedAI?: boolean;
  maxSteps?: number;
}

export function NextStepsPanel({
  contactCount,
  dealStats,
  hasSentCampaign = false,
  hasUsedAI = false,
  maxSteps = 3,
}: NextStepsPanelProps) {
  const data: NextStepsData = {
    contactCount,
    dealStats,
    hasSentCampaign,
    hasUsedAI,
  };

  const activeSteps = NEXT_STEPS
    .filter(step => step.condition(data) && !step.completed(data))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, maxSteps);

  const completedCount = NEXT_STEPS.filter(step => step.completed(data)).length;
  const progressPercent = (completedCount / NEXT_STEPS.length) * 100;

  if (activeSteps.length === 0) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 dark:border-green-800/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">
                You're all set!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You've completed the essential setup steps. Keep growing your business!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Next Steps
            </CardTitle>
            <CardDescription>
              Recommended actions to grow your business
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {completedCount}/{NEXT_STEPS.length} done
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeSteps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.completed(data);
            
            return (
              <div
                key={step.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className={`p-2 rounded-full ${priorityColors[step.priority]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.title}</span>
                    {step.priority === 'high' && (
                      <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                        Priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>
                    {step.actionLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
