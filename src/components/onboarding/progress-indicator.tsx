'use client';

import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  stepTitles?: string[];
  className?: string;
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps = 4,
  stepTitles = ['Add Lead', 'Connect Tool', 'Create Message', 'Success'],
  className 
}: ProgressIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < totalSteps && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 transition-colors',
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-center font-medium">
              <span
                className={cn(
                  'transition-colors',
                  step === currentStep
                    ? 'text-foreground'
                    : step < currentStep
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {stepTitles[step - 1]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
