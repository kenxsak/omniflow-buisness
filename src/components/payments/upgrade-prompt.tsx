"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Plan } from '@/types/saas';

interface UpgradePromptProps {
  currentPlan: Plan;
  suggestedPlan: Plan;
  reason: string;
  featureName?: string;
}

export function UpgradePrompt({
  currentPlan,
  suggestedPlan,
  reason,
  featureName,
}: UpgradePromptProps) {
  const router = useRouter();

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {featureName ? `${featureName} Limit Reached` : 'Upgrade Required'}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        <p className="text-amber-800 dark:text-amber-200">
          {reason}
        </p>
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Current: {currentPlan.name}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ${currentPlan.priceMonthlyUSD}/month
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recommended: {suggestedPlan.name}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ${suggestedPlan.priceMonthlyUSD}/month
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/settings?tab=billing')}
          className="w-full"
          variant="default"
        >
          View Plans & Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'credits' | 'images' | 'users' | 'digitalCards';
  currentUsage: number;
  limit: number;
  planName: string;
}

export function LimitReachedModal({
  isOpen,
  onClose,
  limitType,
  currentUsage,
  limit,
  planName,
}: LimitReachedModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const limitMessages = {
    credits: 'AI Credits',
    images: 'Image Generations',
    users: 'Team Members',
    digitalCards: 'Digital Cards',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Limit Reached</CardTitle>
          </div>
          <CardDescription>
            You've reached your {limitMessages[limitType]} limit for the {planName} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Usage:</strong> {currentUsage} / {limit} {limitMessages[limitType]}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            To continue using this feature, please upgrade to a higher plan with increased limits.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push('/settings?tab=billing');
            }}
            className="flex-1"
          >
            Upgrade Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
