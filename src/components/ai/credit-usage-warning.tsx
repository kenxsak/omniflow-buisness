/**
 * Credit Usage Warning Component
 * Shows warnings when credits are running low or exhausted
 * Displays upgrade prompts for Free users who exhaust their lifetime credits
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, TrendingUp, Key } from 'lucide-react';
import Link from 'next/link';

interface CreditUsageWarningProps {
  creditsRemaining: number;
  creditsTotal: number;
  isLifetime?: boolean; // True for Free plan (one-time credits)
  isBYOKAvailable?: boolean; // True for paid plans
  showUpgradePrompt?: boolean;
}

export function CreditUsageWarning({
  creditsRemaining,
  creditsTotal,
  isLifetime = false,
  isBYOKAvailable = false,
  showUpgradePrompt = true,
}: CreditUsageWarningProps) {
  const percentageRemaining = (creditsRemaining / creditsTotal) * 100;
  
  // No warning if plenty of credits remain
  if (percentageRemaining > 20) {
    return null;
  }
  
  // CRITICAL: All credits exhausted
  if (creditsRemaining === 0) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">
          {isLifetime ? 'Free Credits Exhausted' : 'Monthly Credits Exhausted'}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            {isLifetime 
              ? `You've used all ${creditsTotal} free AI credits. Upgrade to continue creating amazing content!`
              : `You've used all ${creditsTotal} monthly credits. They will reset next month, or upgrade for more.`
            }
          </p>
          
          {showUpgradePrompt && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {isBYOKAvailable ? (
                <>
                  <Button asChild variant="default" size="lg">
                    <Link href="/settings/integrations">
                      <Key className="mr-2 h-4 w-4" />
                      Add Your Own API Key (Unlimited)
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/pricing">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Pricing
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="default" size="lg">
                  <Link href="/pricing">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Upgrade to Pro ($99/mo)
                  </Link>
                </Button>
              )}
            </div>
          )}
          
          {isBYOKAvailable && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                <Zap className="inline h-4 w-4 mr-1" />
                Pro Tip: Use your own Google API key for unlimited AI at $0.03/image (Google's cost)
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // WARNING: Running low on credits
  if (percentageRemaining <= 20) {
    return (
      <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-500/10">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
          {isLifetime ? 'Running Low on Free Credits' : 'Running Low on Monthly Credits'}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              {creditsRemaining} of {creditsTotal} credits remaining
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({percentageRemaining.toFixed(0)}%)
            </span>
          </div>
          
          {isLifetime && (
            <p className="text-sm text-muted-foreground">
              These are one-time credits. Once exhausted, you'll need to upgrade to continue.
            </p>
          )}
          
          {!isLifetime && (
            <p className="text-sm text-muted-foreground">
              Your credits will reset on the 1st of next month.
            </p>
          )}
          
          {showUpgradePrompt && isBYOKAvailable && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/integrations">
                  <Key className="mr-2 h-3 w-3" />
                  Switch to Unlimited with BYOK
                </Link>
              </Button>
            </div>
          )}
          
          {showUpgradePrompt && !isBYOKAvailable && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/pricing">
                  <TrendingUp className="mr-2 h-3 w-3" />
                  Upgrade for More Credits
                </Link>
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}
