'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  Mail, 
  CreditCard, 
  Sparkles, 
  Workflow, 
  Send,
  UserPlus,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { getOnboardingProgressAction, updateChecklistItemAction, skipOnboardingAction } from '@/app/actions/onboarding-client-actions';
import type { ChecklistItem } from '@/app/actions/onboarding-actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ChecklistItemConfig {
  key: ChecklistItem;
  label: string;
  description: string;
  icon: React.ElementType;
  actionLabel: string;
  actionLink: string;
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  {
    key: 'addedContacts',
    label: 'Add Your First Contacts',
    description: 'Import or add 10+ contacts to get started',
    icon: Users,
    actionLabel: 'Go to Contacts',
    actionLink: '/crm',
  },
  {
    key: 'sentFirstCampaign',
    label: 'Send Your First Email Campaign',
    description: 'Create and send an email to your contacts',
    icon: Mail,
    actionLabel: 'Create Campaign',
    actionLink: '/email-marketing/create-campaign',
  },
  {
    key: 'createdDigitalCard',
    label: 'Create Your Digital Business Card',
    description: 'Build a professional digital presence',
    icon: CreditCard,
    actionLabel: 'Create Card',
    actionLink: '/digital-card/create',
  },
  {
    key: 'invitedTeamMember',
    label: 'Invite Your First Team Member',
    description: 'Add team members to collaborate and track attendance',
    icon: UserPlus,
    actionLabel: 'Manage Team',
    actionLink: '/team-management',
  },
  {
    key: 'triedAI',
    label: 'Try AI Content Generation',
    description: 'Let AI write marketing content for you',
    icon: Sparkles,
    actionLabel: 'Use AI Writer',
    actionLink: '/ai-content-writer',
  },
  {
    key: 'setupAutomation',
    label: 'Set Up Email Automation',
    description: 'Automate your follow-up emails',
    icon: Workflow,
    actionLabel: 'View Automations',
    actionLink: '/email-marketing/automations',
  },
  {
    key: 'launchedMultiChannel',
    label: 'Launch Multi-Channel Campaign',
    description: 'Send campaigns across email, SMS, and WhatsApp',
    icon: Send,
    actionLabel: 'AI Campaign Studio',
    actionLink: '/ai-campaign-manager',
  },
];

export default function OnboardingChecklist() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<Record<ChecklistItem, boolean>>({
    addedContacts: false,
    sentFirstCampaign: false,
    createdDigitalCard: false,
    invitedTeamMember: false,
    triedAI: false,
    setupAutomation: false,
    launchedMultiChannel: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (appUser?.companyId) {
      loadProgress();
    }
  }, [appUser?.companyId]);

  const loadProgress = async () => {
    if (!appUser?.companyId) return;
    
    setIsLoading(true);
    try {
      const progress = await getOnboardingProgressAction(appUser.companyId);
      if (progress && progress.checklist) {
        setChecklist(progress.checklist);
        setIsCompleted(progress.completed || false);
        setIsDismissed(progress.completed || !!progress.skippedAt);
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!appUser?.companyId) return;
    
    try {
      const result = await skipOnboardingAction(appUser.companyId);
      if (result.success) {
        setIsDismissed(true);
        toast({
          title: 'Checklist Hidden',
          description: 'You can always come back to complete these steps later.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to dismiss checklist',
        variant: 'destructive',
      });
    }
  };

  const completedCount = checklist ? Object.values(checklist).filter(Boolean).length : 0;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  if (isLoading) {
    return null;
  }

  if (isDismissed || isCompleted) {
    return null;
  }

  if (completedCount === totalCount) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-700 dark:text-green-300">
                  Congratulations! 🎉
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  You've completed all onboarding steps!
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="text-green-700 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl">Get Started with OmniFlow</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Complete these steps to unlock the full power of your marketing platform
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">
              {completedCount} of {totalCount} completed
            </span>
            <span className="text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCompleted = checklist[item.key];
            
            return (
              <div
                key={item.key}
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border transition-all",
                  isCompleted
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isCompleted ? "text-green-600" : "text-primary"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-xs sm:text-sm",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                {!isCompleted && (
                  <Link href={item.actionLink} className="flex-shrink-0">
                    <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs sm:text-sm h-8 sm:h-9">
                      <span className="hidden sm:inline">{item.actionLabel}</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
