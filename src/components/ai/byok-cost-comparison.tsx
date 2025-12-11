"use client";

/**
 * BYOK Cost Comparison Component
 * Shows potential savings when using Bring Your Own API Key vs platform credits
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface BYOKCostComparisonProps {
  currentPlan: {
    id: string;
    name: string;
    monthlyPrice: number;
    creditsIncluded: number;
  };
  currentMonthUsage: {
    creditsUsed: number;
    estimatedCost: number;
  };
  usingBYOK?: boolean;
}

export function BYOKCostComparison({
  currentPlan,
  currentMonthUsage,
  usingBYOK = false,
}: BYOKCostComparisonProps) {
  // Calculate projected costs
  const estimatedGoogleDirectCost = currentMonthUsage.estimatedCost; // This is already calculated in analytics
  const platformMarkup = currentMonthUsage.estimatedCost * 0.5; // ~50% markup
  const totalWithBYOK = currentPlan.monthlyPrice + estimatedGoogleDirectCost;
  const totalWithPlatformCredits = currentPlan.monthlyPrice; // Already includes credits
  
  // Calculate if user would benefit from BYOK
  const usagePercent = (currentMonthUsage.creditsUsed / currentPlan.creditsIncluded) * 100;
  const wouldBenefitFromBYOK = usagePercent > 80; // Heavy users benefit from BYOK
  
  // Calculate potential savings if they upgrade and use BYOK
  const monthlySavingsWithBYOK = platformMarkup; // They save the markup we charge

  if (usingBYOK) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Using BYOK - Unlimited AI
            </CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-700">
              Active
            </Badge>
          </div>
          <CardDescription>
            You're using your own Gemini API key for unlimited AI operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Plan Subscription</div>
                <div className="text-2xl font-bold">${currentPlan.monthlyPrice}</div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-sm text-muted-foreground">Google API Cost</div>
                <div className="text-2xl font-bold">${estimatedGoogleDirectCost.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">this month</div>
              </div>
            </div>

            <div className="rounded-lg bg-white border-2 border-green-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Monthly Cost</span>
                <span className="text-3xl font-bold text-green-600">
                  ${totalWithBYOK.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                ✅ Unlimited AI operations • No credit restrictions
              </div>
            </div>

            <div className="rounded-lg bg-green-100 p-3 text-sm">
              💰 <strong>Saving ${monthlySavingsWithBYOK.toFixed(2)}/month</strong> by avoiding platform markup
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cost Comparison: Platform Credits vs. BYOK
        </CardTitle>
        <CardDescription>
          Compare your current setup with Bring Your Own API Key option
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Setup */}
          <div className="rounded-lg border-2 border-primary p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge>Current</Badge>
              <span className="font-semibold">Platform Credits</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-sm text-muted-foreground">Monthly Plan</div>
                <div className="text-xl font-bold">${currentPlan.monthlyPrice}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Included Credits</div>
                <div className="text-xl font-bold">{currentPlan.creditsIncluded.toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Credits used: {currentMonthUsage.creditsUsed} / {currentPlan.creditsIncluded} ({usagePercent.toFixed(1)}%)</span>
              </div>
              {usagePercent > 100 && (
                <div className="text-red-600 font-medium">
                  ⚠️ Over limit - operations blocked
                </div>
              )}
            </div>
          </div>

          {/* BYOK Option */}
          <div className="rounded-lg border-2 border-green-200 bg-green-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-green-100 text-green-700">BYOK Option</Badge>
              <span className="font-semibold">Bring Your Own Key</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-sm text-muted-foreground">Monthly Plan</div>
                <div className="text-xl font-bold">${currentPlan.monthlyPrice}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Google API Cost</div>
                <div className="text-xl font-bold">${estimatedGoogleDirectCost.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium">Unlimited AI operations</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Pay Google directly (~$0.001/request)</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>No credit restrictions or limits</span>
              </div>
            </div>
          </div>

          {/* Comparison Summary */}
          {wouldBenefitFromBYOK ? (
            <div className="rounded-lg bg-green-100 border border-green-200 p-4">
              <div className="font-semibold text-green-900 mb-2">
                💡 You're a heavy AI user! BYOK is perfect for you.
              </div>
              <div className="text-sm text-green-800">
                With your usage ({currentMonthUsage.creditsUsed} credits this month), you would save approximately 
                <strong> ${monthlySavingsWithBYOK.toFixed(2)}/month</strong> and get unlimited operations.
              </div>
              {currentPlan.id === 'plan_free' ? (
                <div className="mt-3">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/settings/subscription">
                      Upgrade to Starter for BYOK Access
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/settings/integrations">
                      Add Your Gemini API Key
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="text-sm text-blue-900">
                <strong>Current plan works great for your usage</strong>
                <div className="mt-1 text-blue-700">
                  You're using {usagePercent.toFixed(1)}% of your included credits. BYOK becomes beneficial when you consistently use 80%+ of your credits.
                </div>
              </div>
            </div>
          )}

          {currentPlan.id === 'plan_free' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              ℹ️ BYOK is only available on paid plans (Starter, Pro, Enterprise)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
