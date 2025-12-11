'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  getContactUsagePercentage, 
  getContactLimitStatus, 
  getContactUsageMessage 
} from '@/lib/plan-helpers';

interface ContactUsageIndicatorProps {
  currentContactCount: number;
  maxContacts: number | null;
  planName: string;
  compact?: boolean;
}

export function ContactUsageIndicator({
  currentContactCount,
  maxContacts,
  planName,
  compact = false
}: ContactUsageIndicatorProps) {
  const router = useRouter();
  const usagePercentage = getContactUsagePercentage(currentContactCount, maxContacts);
  const limitStatus = getContactLimitStatus(currentContactCount, maxContacts);
  const usageMessage = getContactUsageMessage(currentContactCount, maxContacts);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Contact Usage</span>
            <span className={`text-xs font-semibold ${
              limitStatus === 'limit_reached' ? 'text-red-600' :
              limitStatus === 'warning' ? 'text-yellow-600' :
              limitStatus === 'unlimited' ? 'text-green-600' :
              'text-blue-600'
            }`}>
              {limitStatus === 'unlimited' ? '∞' : `${Math.round(usagePercentage)}%`}
            </span>
          </div>
          {maxContacts !== null && (
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${
                limitStatus === 'limit_reached' ? '[&>div]:bg-red-500' :
                limitStatus === 'warning' ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-blue-500'
              }`}
            />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {currentContactCount.toLocaleString()} {maxContacts !== null && `/ ${maxContacts.toLocaleString()}`} contacts
          </p>
        </div>
        {limitStatus === 'limit_reached' && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => router.push('/settings?tab=billing')}
          >
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${
      limitStatus === 'limit_reached' 
        ? 'border-red-200 bg-red-50 dark:bg-red-950/20' 
        : limitStatus === 'warning' 
          ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' 
          : limitStatus === 'unlimited'
            ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
            : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className={`h-5 w-5 ${
              limitStatus === 'limit_reached' ? 'text-red-600' :
              limitStatus === 'warning' ? 'text-yellow-600' :
              limitStatus === 'unlimited' ? 'text-green-600' :
              'text-blue-600'
            }`} />
            <CardTitle className="text-lg">Contact Usage</CardTitle>
          </div>
          {limitStatus === 'limit_reached' && (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          {limitStatus === 'warning' && (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          {limitStatus === 'unlimited' && (
            <Sparkles className="h-5 w-5 text-green-600" />
          )}
        </div>
        <CardDescription>
          {planName} plan {maxContacts === null ? '• Unlimited contacts' : `• ${maxContacts.toLocaleString()} contact limit`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold ${
              limitStatus === 'limit_reached' ? 'text-red-600' :
              limitStatus === 'warning' ? 'text-yellow-600' :
              limitStatus === 'unlimited' ? 'text-green-600' :
              'text-blue-600'
            }`}>
              {maxContacts !== null ? (
                <>
                  <span>{currentContactCount}</span>
                  <span className="text-muted-foreground text-lg"> / {maxContacts.toLocaleString()}</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  {currentContactCount.toLocaleString()} 
                  <span className="text-green-600 text-lg">∞</span>
                </span>
              )}
            </span>
            {maxContacts !== null && (
              <span className={`text-sm font-semibold px-2 py-1 rounded ${
                limitStatus === 'limit_reached' ? 'bg-red-100 text-red-700' :
                limitStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {Math.round(usagePercentage)}%
              </span>
            )}
          </div>
          {maxContacts !== null && (
            <Progress 
              value={usagePercentage} 
              className={`h-3 ${
                limitStatus === 'limit_reached' ? '[&>div]:bg-red-500' :
                limitStatus === 'warning' ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-blue-500'
              }`}
            />
          )}
        </div>

        {limitStatus === 'limit_reached' && (
          <Alert className="border-red-300 bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Contact Limit Reached!</strong> You cannot add more contacts until you upgrade your plan.
            </AlertDescription>
          </Alert>
        )}

        {limitStatus === 'warning' && (
          <Alert className="border-yellow-300 bg-yellow-100 dark:bg-yellow-900/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Almost at limit!</strong> You're using {Math.round(usagePercentage)}% of your contacts. Consider upgrading soon.
            </AlertDescription>
          </Alert>
        )}

        {limitStatus === 'unlimited' && (
          <Alert className="border-green-300 bg-green-100 dark:bg-green-900/30">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Unlimited Contacts!</strong> Add as many contacts as you need with your {planName} plan.
            </AlertDescription>
          </Alert>
        )}

        {(limitStatus === 'limit_reached' || limitStatus === 'warning') && maxContacts !== null && (
          <Button 
            onClick={() => router.push('/settings?tab=billing')}
            className="w-full"
            variant={limitStatus === 'limit_reached' ? 'default' : 'outline'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade for Unlimited Contacts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
