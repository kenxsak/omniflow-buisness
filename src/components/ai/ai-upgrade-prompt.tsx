'use client';

/**
 * Standardized AI Upgrade Prompt Component
 * 
 * Shows when users hit AI credit limits and guides them to upgrade their plan.
 * Provides context about why they're blocked and what plan they should upgrade to.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, TrendingUp, Sparkles } from 'lucide-react';
import type { AIOperationType } from '@/types/ai-usage';
import Link from 'next/link';

interface AIUpgradePromptProps {
  currentPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  operationType: AIOperationType;
  creditsRemaining: number;
  creditsLimit: number;
  isHardLimit?: boolean; // true = completely blocked, false = soft warning
  variant?: 'inline' | 'dialog' | 'banner';
}

const UPGRADE_RECOMMENDATIONS = {
  free: {
    suggestedPlan: 'Starter',
    suggestedPlanId: 'plan_starter',
    price: 29,
    credits: 2000,
    benefits: [
      '2,000 AI credits/month (13x more)',
      'Up to 50 AI images/month',
      'Overage credits available',
      '3 team members'
    ],
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  starter: {
    suggestedPlan: 'Pro',
    suggestedPlanId: 'plan_pro',
    price: 99,
    credits: 12000,
    benefits: [
      '12,000 AI credits/month (6x more)',
      'Up to 300 AI images/month',
      'Lower overage pricing',
      '10 team members'
    ],
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  pro: {
    suggestedPlan: 'Enterprise',
    suggestedPlanId: 'plan_enterprise',
    price: 249,
    credits: 60000,
    benefits: [
      '60,000 AI credits/month (5x more)',
      'Up to 1,500 AI images/month',
      'Lowest overage pricing',
      '50+ team members'
    ],
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  enterprise: {
    suggestedPlan: 'Custom Plan',
    suggestedPlanId: 'contact',
    price: 0,
    credits: 999999,
    benefits: [
      'Unlimited AI credits',
      'Custom pricing',
      'Dedicated support',
      'Custom integrations'
    ],
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  }
};

const OPERATION_NAMES = {
  text_generation: 'text generation',
  image_generation: 'image generation',
  text_to_speech: 'text-to-speech',
  video_generation: 'video generation'
};

export default function AIUpgradePrompt({
  currentPlan,
  operationType,
  creditsRemaining,
  creditsLimit,
  isHardLimit = true,
  variant = 'inline'
}: AIUpgradePromptProps) {
  const recommendation = UPGRADE_RECOMMENDATIONS[currentPlan];
  const Icon = recommendation.icon;
  const operationName = OPERATION_NAMES[operationType];
  const usagePercent = Math.round(((creditsLimit - creditsRemaining) / creditsLimit) * 100);

  // Soft warning (80-95% usage)
  if (!isHardLimit && usagePercent < 100) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">Running Low on AI Credits</AlertTitle>
        <AlertDescription className="text-orange-800">
          <p className="mb-2">
            You've used <strong>{creditsLimit - creditsRemaining}</strong> of <strong>{creditsLimit}</strong> AI credits this month ({usagePercent}%).
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/settings">
              View Usage & Upgrade Options
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Hard limit (completely blocked)
  if (variant === 'inline') {
    return (
      <Card className={`border-2 ${recommendation.bgColor} border-${recommendation.color.replace('text-', '')}-200`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${recommendation.color}`} />
            <CardTitle className="text-lg">AI Credit Limit Reached</CardTitle>
          </div>
          <CardDescription>
            You've used all {creditsLimit} AI credits in your <Badge variant="outline">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</Badge> plan this month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${recommendation.bgColor} border border-${recommendation.color.replace('text-', '')}-200 mb-4`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-6 w-6 ${recommendation.color} mt-1`} />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">
                  Upgrade to {recommendation.suggestedPlan}
                  {recommendation.price > 0 && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ${recommendation.price}/mo
                    </span>
                  )}
                </h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {recommendation.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${recommendation.color.replace('text-', 'bg-')}`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" asChild>
              <Link href="/settings">
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade to {recommendation.suggestedPlan}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ai-usage">View Usage</Link>
            </Button>
          </div>

          {currentPlan !== 'free' && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              💡 Credits reset on the 1st of each month. Your {operationName} will work again then.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Banner variant for top-of-page warnings
  if (variant === 'banner') {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">AI Credit Limit Reached</AlertTitle>
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between gap-4">
            <p>
              You've used all {creditsLimit} AI credits this month. 
              Upgrade to <strong>{recommendation.suggestedPlan}</strong> for {recommendation.credits.toLocaleString()} credits/month.
            </p>
            <Button size="sm" asChild>
              <Link href="/settings">Upgrade Now</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Pre-flight Credit Warning Component
 * Shows BEFORE operation to warn users about credit cost
 */
export function AIOperationCostPreview({
  operationType,
  creditsRequired,
  creditsRemaining,
  creditsLimit,
  onProceed,
  onCancel
}: {
  operationType: AIOperationType;
  creditsRequired: number;
  creditsRemaining: number;
  creditsLimit: number;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const operationName = OPERATION_NAMES[operationType];
  const willExceed = creditsRequired > creditsRemaining;
  const usagePercent = Math.round(((creditsLimit - creditsRemaining + creditsRequired) / creditsLimit) * 100);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          AI Credit Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">This {operationName} will use:</span>
            <Badge variant="secondary">{creditsRequired} credits</Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Remaining after:</span>
            <Badge variant={willExceed ? "destructive" : "default"}>
              {Math.max(0, creditsRemaining - creditsRequired)} / {creditsLimit}
            </Badge>
          </div>

          {willExceed && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-800">
                This will exceed your monthly limit. You may be charged overage fees or blocked depending on your plan.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="default" size="sm" onClick={onProceed} className="flex-1">
              Continue ({creditsRequired} credits)
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
