
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star, Loader2, AlertTriangle, Users, Bot, Image, Type, Mic, CreditCard, ExternalLink } from 'lucide-react';
import type { Plan, Company, Feature } from '@/types/saas';
import { getCompany, getStoredPlans, getStoredFeatures } from '@/lib/saas-data';
import { useCurrency } from '@/contexts/currency-context';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFriendlyLoading } from '@/lib/friendly-messages';
import { PaymentButton } from '@/components/payments/payment-button';
import { getStripePortalUrl } from '@/app/actions/stripe-payment-actions';
import { useToast } from '@/hooks/use-toast';
import type { BillingCycle } from '@/types/payment';

type LoadingState = 'loading' | 'loaded' | 'no-data' | 'error';

export default function SubscriptionDetails() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const { formatCurrency, convertFromUSD } = useCurrency();
  const { appUser } = useAuth();
  const [convertedPrice, setConvertedPrice] = useState<number>(0);
  const { toast } = useToast();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const loadSubscriptionData = useCallback(async () => {
    setLoadingState('loading');
    if (appUser && appUser.companyId) {
      try {
        const userCompany = await getCompany(appUser.companyId);
        const masterFeatures = await getStoredFeatures();
        setAllFeatures(masterFeatures);
        
        if (userCompany) {
          setCompany(userCompany);
          const plans = await getStoredPlans();
          const planDetails = plans.find(p => p.id === userCompany.planId);
          if (planDetails) {
              setCurrentPlan(planDetails);
              // Convert price to local currency
              if (planDetails.priceMonthlyUSD > 0) {
                const localPrice = await convertFromUSD(planDetails.priceMonthlyUSD);
                setConvertedPrice(localPrice);
              }
              setLoadingState('loaded');
          } else {
              console.error(`Plan with ID ${userCompany.planId} not found for company ${userCompany.name}.`);
              setLoadingState('no-data');
          }
        } else {
          console.error(`Company with ID ${appUser.companyId} not found for user ${appUser.email}.`);
          setLoadingState('no-data');
        }
      } catch (e) {
        console.error("Failed to load subscription data from Firestore", e);
        setLoadingState('error');
      }
    } else if (appUser && !appUser.companyId) {
        console.warn("App user exists but companyId is missing.");
        setLoadingState('no-data');
    }
  }, [appUser, convertFromUSD]);

  useEffect(() => {
    if (appUser) {
      loadSubscriptionData();
    }
  }, [appUser, loadSubscriptionData]);

  if (loadingState === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin"/>
            <p className="ml-2">{getFriendlyLoading('data/loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (loadingState === 'no-data' || !currentPlan || !company) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Could not load your subscription details. This may be due to a recent signup or data issue. Try reloading.</AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Current Subscription</CardTitle>
        <CardDescription>
          This is your company&apos;s (<strong className="text-primary">{company.name}</strong>) active plan. To make changes, please visit the pricing page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border border-primary/50 rounded-lg p-6 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-primary flex items-center">
                {currentPlan.isFeatured && <Star className="h-5 w-5 mr-2 text-yellow-500 fill-yellow-400" />}
                {currentPlan.name} Plan
                </h3>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
                <span className="text-3xl font-extrabold">
                  {currentPlan.priceMonthlyUSD === 0 ? 'Free' : formatCurrency(convertedPrice || currentPlan.priceMonthlyUSD)}
                </span>
                {currentPlan.priceMonthlyUSD > 0 && <span className="text-base font-medium text-muted-foreground">/month</span>}
            </div>
          </div>
          <p className="text-muted-foreground mt-2">{currentPlan.description}</p>
          
          <div className="mt-6 space-y-4">
            {/* Plan Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start">
                <Users className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Up to <strong className="text-foreground">{currentPlan.maxUsers ?? 'N/A'}</strong> {currentPlan.maxUsers === 1 ? 'user' : 'users'}</span>
              </div>
              <div className="flex items-start">
                <Bot className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground"><strong className="text-foreground">{(currentPlan.aiCreditsPerMonth ?? 0).toLocaleString()}</strong> AI Credits/month</span>
              </div>
              {currentPlan.maxImagesPerMonth !== undefined && (
                <div className="flex items-start">
                  <Image className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong className="text-foreground">{currentPlan.maxImagesPerMonth.toLocaleString()}</strong> images/month</span>
                </div>
              )}
              {currentPlan.maxTextPerMonth !== undefined && (
                <div className="flex items-start">
                  <Type className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong className="text-foreground">{currentPlan.maxTextPerMonth.toLocaleString()}</strong> text ops/month</span>
                </div>
              )}
              {currentPlan.maxTTSPerMonth !== undefined && (
                <div className="flex items-start">
                  <Mic className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong className="text-foreground">{currentPlan.maxTTSPerMonth.toLocaleString()}</strong> voice ops/month</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Included Features:</h4>
              <ul className="space-y-2">
                {currentPlan.featureIds
                    .map(id => allFeatures.find(f => f.id === id))
                    .filter(feature => feature && feature.active)
                    .map((feature) => (
                        feature && (
                        <li key={feature.id} className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-foreground">{feature.name}</span>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                        </li>
                        )
                    ))
                }
              </ul>
            </div>

            {/* Overage Info */}
            {currentPlan.allowOverage && currentPlan.overagePricePerCredit && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Overage available:</strong> Extra credits at {formatCurrency(currentPlan.overagePricePerCredit * 1000)}/1,000 credits
                </p>
              </div>
            )}

            {/* Yearly Discount */}
            {currentPlan.yearlyDiscountPercentage && currentPlan.yearlyDiscountPercentage > 0 && (
              <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
                <p className="text-sm font-medium text-accent">
                  💰 Save {currentPlan.yearlyDiscountPercentage}% with yearly billing!
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/pricing">View All Plans</Link>
          </Button>
          
          {/* Show Manage Billing button if user has Stripe subscription */}
          {company.stripeCustomerId && (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={loadingPortal}
              onClick={async () => {
                if (!appUser?.idToken) return;
                setLoadingPortal(true);
                try {
                  const result = await getStripePortalUrl({ idToken: appUser.idToken });
                  if (result.success && result.url) {
                    window.open(result.url, '_blank');
                  } else {
                    toast({
                      title: 'Error',
                      description: result.error || 'Failed to open billing portal',
                      variant: 'destructive',
                    });
                  }
                } catch (error) {
                  toast({
                    title: 'Error',
                    description: 'An error occurred',
                    variant: 'destructive',
                  });
                } finally {
                  setLoadingPortal(false);
                }
              }}
            >
              {loadingPortal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Billing
                  <ExternalLink className="ml-2 h-3 w-3" />
                </>
              )}
            </Button>
          )}
      </CardFooter>
    </Card>
  );
}
