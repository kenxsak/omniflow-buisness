'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, GitBranch, DollarSign, Rocket, Sparkles,
  CheckCircle, ArrowRight, X, Play, Target, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { seedDemoDataAction, checkDemoDataSeeded } from '@/app/actions/demo-data-actions';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/types/saas';
import confetti from 'canvas-confetti';

const CRM_ONBOARDING_STEPS = [
  {
    id: 'step1',
    stepNumber: 1,
    title: 'Import Your Contacts',
    description: 'Add your leads and customers to start building your sales pipeline',
    icon: Users,
    action: 'View Contacts',
    href: '/crm',
    tips: ['Import from CSV or add manually', 'We\'ve added 5 demo contacts to help you explore'],
    color: 'blue',
  },
  {
    id: 'step2',
    stepNumber: 2,
    title: 'Set Up Your Pipeline',
    description: 'Visualize your sales process and track deals through stages',
    icon: GitBranch,
    action: 'View Pipeline',
    href: '/crm/pipeline',
    tips: ['Drag deals between stages', 'See your total pipeline value at a glance'],
    color: 'purple',
  },
  {
    id: 'step3',
    stepNumber: 3,
    title: 'Start Selling',
    description: 'Create deals, track opportunities, and close more business',
    icon: Target,
    action: 'View Pipeline',
    href: '/crm/pipeline',
    tips: ['Link deals to contacts', 'Track expected revenue and close dates'],
    color: 'green',
  },
];

interface CrmWelcomeModalProps {
  company: Company | null;
  onDismiss: () => void;
  onComplete: () => void;
}

export function CrmWelcomeModal({ company, onDismiss, onComplete }: CrmWelcomeModalProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);

  useEffect(() => {
    const checkAndOpen = async () => {
      if (company && !company.onboardingProgress?.completed && !company.onboardingProgress?.skippedAt) {
        setOpen(true);
        const seeded = await checkDemoDataSeeded(company.id);
        setDemoSeeded(seeded);
      }
    };
    checkAndOpen();
  }, [company]);

  const handleSeedDemoData = async () => {
    if (!company?.id || !appUser?.uid || demoSeeded) return;
    
    setIsSeeding(true);
    try {
      const result = await seedDemoDataAction(
        company.id,
        appUser.uid,
        appUser.name || 'User'
      );
      
      if (result.success) {
        setDemoSeeded(true);
        if (result.contactsCreated && result.contactsCreated > 0) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
          toast({
            title: 'Demo data loaded!',
            description: `Created ${result.contactsCreated} contacts, ${result.tasksCreated} tasks, and ${result.dealsCreated} deals.`,
          });
        }
      } else {
        toast({
          title: 'Could not load demo data',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error seeding demo data:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
    onDismiss();
  };

  const handleComplete = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setOpen(false);
    onComplete();
  };

  const handleNextStep = () => {
    if (currentStep < CRM_ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const progressPercentage = ((currentStep + 1) / CRM_ONBOARDING_STEPS.length) * 100;
  const currentStepData = CRM_ONBOARDING_STEPS[currentStep];
  const Icon = currentStepData.icon;

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
    green: 'bg-green-500/10 text-green-600 border-green-200',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl break-words">
                {currentStep === 0 ? 'Welcome to OmniFlow CRM!' : `Step ${currentStep + 1}: ${currentStepData.title}`}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {currentStep === 0 
                  ? 'Let\'s set up your sales command center in 3 easy steps'
                  : currentStepData.description
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Setup Progress</span>
            <span className="text-sm font-medium">{currentStep + 1}/{CRM_ONBOARDING_STEPS.length}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex gap-1 sm:gap-2 mb-4 overflow-x-auto pb-2">
          {CRM_ONBOARDING_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex-1 min-w-fit p-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                index === currentStep 
                  ? 'border-primary bg-primary/5' 
                  : index < currentStep 
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                    : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                {index < currentStep ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${index === currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                    {index + 1}
                  </span>
                )}
                <span className={`text-xs font-medium hidden sm:inline whitespace-nowrap ${
                  index === currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.title.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Card className={`border-2 ${colorClasses[currentStepData.color as keyof typeof colorClasses]}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className={`p-4 rounded-full mb-4 ${
                currentStepData.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                currentStepData.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                'bg-green-100 dark:bg-green-900/30'
              }`}>
                <Icon className={`h-8 w-8 ${
                  currentStepData.color === 'blue' ? 'text-blue-600' :
                  currentStepData.color === 'purple' ? 'text-purple-600' :
                  'text-green-600'
                }`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{currentStepData.description}</p>
              
              <div className="space-y-2 w-full mb-4">
                {currentStepData.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-left p-2 rounded-lg bg-muted/50">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="break-words">{tip}</span>
                  </div>
                ))}
              </div>

              {currentStep === 0 && !demoSeeded && (
                <Button 
                  variant="outline" 
                  className="mb-3 w-full"
                  onClick={handleSeedDemoData}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <>Loading demo data...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Load Demo Data to Explore
                    </>
                  )}
                </Button>
              )}

              {currentStep === 0 && demoSeeded && (
                <Badge variant="secondary" className="mb-3 bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Demo data ready to explore
                </Badge>
              )}

              <Button asChild className="w-full">
                <Link href={currentStepData.href}>
                  {currentStepData.action}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
          <Button variant="ghost" onClick={handleSkip} className="text-xs sm:text-sm">
            Skip for now
          </Button>
          <div className="flex gap-2 flex-col-reverse sm:flex-row">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="text-xs sm:text-sm">
                Previous
              </Button>
            )}
            {currentStep < CRM_ONBOARDING_STEPS.length - 1 ? (
              <Button onClick={handleNextStep} className="text-xs sm:text-sm">
                Next Step
              </Button>
            ) : (
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
