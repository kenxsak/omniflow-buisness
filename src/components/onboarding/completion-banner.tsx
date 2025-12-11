'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface OnboardingCompletionBannerProps {
  completedSteps: {
    leadsAdded: boolean;
    toolConnected: boolean;
    messageCreated: boolean;
    dashboardViewed: boolean;
  };
  onDismiss?: () => void;
}

export function OnboardingCompletionBanner({ completedSteps, onDismiss }: OnboardingCompletionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  const totalSteps = Object.keys(completedSteps).length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const percentage = Math.round((completedCount / totalSteps) * 100);
  
  const allCompleted = completedCount === totalSteps;
  
  if (isDismissed || allCompleted) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <AlertTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5" />
            Complete Your Setup ({completedCount}/{totalSteps} steps done)
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            You've made great progress! Complete the remaining setup steps to unlock the full power of OmniFlow.
            <div className="mt-3 flex flex-wrap gap-2">
              {!completedSteps.leadsAdded && (
                <span className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  Add your first lead
                </span>
              )}
              {!completedSteps.toolConnected && (
                <span className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  Connect email tool
                </span>
              )}
              {!completedSteps.messageCreated && (
                <span className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  Create first message
                </span>
              )}
            </div>
            <div className="mt-3">
              <Button asChild size="sm" className="mr-2">
                <Link href="/onboarding">Complete Setup</Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
