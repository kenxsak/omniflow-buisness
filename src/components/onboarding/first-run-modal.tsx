'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, GitBranch, DollarSign, Mail, Sparkles, 
  CheckCircle, Circle, ArrowRight, X, Rocket
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { Company } from '@/types/saas';

const onboardingSteps = [
  {
    id: 'addedContacts',
    title: 'Add Your Contacts',
    description: 'Import or add your first 10+ contacts to get started',
    icon: Users,
    action: 'Add Contacts',
    href: '/crm',
  },
  {
    id: 'setupPipeline',
    title: 'Review Your Pipeline',
    description: 'Check out your sales pipeline and customize stages',
    icon: GitBranch,
    action: 'View Pipeline',
    href: '/crm/pipeline',
  },
  {
    id: 'sentFirstCampaign',
    title: 'Send Your First Campaign',
    description: 'Reach out to contacts with email, SMS, or WhatsApp',
    icon: Mail,
    action: 'Create Campaign',
    href: '/campaigns',
  },
  {
    id: 'triedAI',
    title: 'Try AI Content Generation',
    description: 'Let AI help you create compelling marketing content',
    icon: Sparkles,
    action: 'Try AI Tools',
    href: '/ai-assistant',
  },
];

interface FirstRunModalProps {
  company: Company | null;
  onDismiss: () => void;
  onComplete: () => void;
}

export function FirstRunModal({ company, onDismiss, onComplete }: FirstRunModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (company && !company.onboardingProgress?.completed && !company.onboardingProgress?.skippedAt) {
      setOpen(true);
    }
  }, [company]);

  const checklist = company?.onboardingProgress?.checklist || {
    addedContacts: false,
    sentFirstCampaign: false,
    createdDigitalCard: false,
    invitedTeamMember: false,
    triedAI: false,
    setupAutomation: false,
    launchedMultiChannel: false,
  };

  const completedSteps = onboardingSteps.filter(step => 
    checklist[step.id as keyof typeof checklist]
  ).length;

  const progressPercentage = (completedSteps / onboardingSteps.length) * 100;

  const handleSkip = () => {
    setOpen(false);
    onDismiss();
  };

  const handleComplete = () => {
    setOpen(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Welcome to OmniFlow!</DialogTitle>
                <DialogDescription>
                  Let&apos;s get you set up for success
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Setup Progress</span>
            <span className="text-sm font-medium">{completedSteps}/{onboardingSteps.length} completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-3">
          {onboardingSteps.map((step, index) => {
            const isCompleted = checklist[step.id as keyof typeof checklist];
            const Icon = step.icon;
            
            return (
              <Card 
                key={step.id} 
                className={`transition-colors ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : ''}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'}`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-300' : ''}`}>
                      {step.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {!isCompleted && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={step.href}>
                        {step.action}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleComplete} disabled={completedSteps < 2}>
            {completedSteps >= onboardingSteps.length ? 'Complete Setup' : 'Continue Later'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
