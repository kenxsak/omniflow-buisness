"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Users, Bot, Image, Zap, Loader2, Database, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/saas';
import { getStoredPlans, getStoredFeatures } from '@/lib/saas-data';
import type { Feature } from '@/types/saas';
import { PaymentButton } from '@/components/payments/payment-button';
import { useAuth } from '@/hooks/use-auth';
import { getCRMLimitDescription } from '@/lib/plan-helpers';
import { 
  SupportedCurrency, 
  detectUserLocation, 
  getCurrencySymbol, 
  getCurrencyName,
  getPriceForPlan as getFixedPrice 
} from '@/lib/geo-detection';

interface PricingSectionProps {
  showHeader?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  className?: string;
  currency?: SupportedCurrency;
  onCurrencyChange?: (currency: SupportedCurrency) => void;
}

export function PricingSection({ 
  showHeader = true,
  headerTitle = "Up to 70% Cheaper Than GoHighLevel with Unlimited AI",
  headerDescription = "All paid plans include BYOK (Bring Your Own Key) for unlimited AI generations at zero cost.",
  className = "",
  currency: externalCurrency,
  onCurrencyChange
}: PricingSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<SupportedCurrency>(externalCurrency || 'USD');
  const { appUser, company } = useAuth();

  useEffect(() => {
    if (externalCurrency) {
      setCurrency(externalCurrency);
      return;
    }

    const storedCurrency = localStorage.getItem('preferred_currency') as SupportedCurrency;
    if (storedCurrency) {
      setCurrency(storedCurrency);
      onCurrencyChange?.(storedCurrency);
    } else {
      detectUserLocation().then((location) => {
        setCurrency(location.currency);
        onCurrencyChange?.(location.currency);
      });
    }
  }, [externalCurrency]);

  useEffect(() => {
    const fetchPlansAndFeatures = async () => {
      setIsLoading(true);
      const [storedPlans, storedFeatures] = await Promise.all([
        getStoredPlans(),
        getStoredFeatures()
      ]);
      const sortedPlans = storedPlans.sort((a, b) => a.priceMonthlyUSD - b.priceMonthlyUSD);
      setPlans(sortedPlans);
      setAllFeatures(storedFeatures);
      setIsLoading(false);
    };
    fetchPlansAndFeatures();
  }, []);

  const getPriceForPlan = (plan: Plan): string => {
    if (plan.priceMonthlyUSD === 0) return 'Free';
    
    const price = getFixedPrice(plan.id, currency);
    const symbol = getCurrencySymbol(currency);
    
    return `${symbol}${price.toLocaleString()}`;
  };

  const getFeatureName = (featureId: string) => {
    const feature = allFeatures.find(f => f.id === featureId);
    return feature ? feature.name : featureId.replace('feat_', '').replace(/_/g, ' ').replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
  };

  const getRegionalMessage = () => {
    if (currency === 'INR') {
      return (
        <Badge variant="default" className="mt-3 text-sm px-4 py-1.5 bg-green-600 hover:bg-green-700">
          <span className="mr-1">🇮🇳</span>
          Special India Pricing - Up to 70% cheaper than global rates!
        </Badge>
      );
    }
    return null;
  };

  return (
    <section className={cn("py-20 lg:py-24 px-4", className)}>
      <div className="max-w-7xl mx-auto">
        {showHeader && (
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {headerTitle}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {headerDescription}
            </p>
            <div className="mt-4 text-sm text-muted-foreground">
              Pricing shown in: <strong className="text-foreground">{getCurrencyName(currency)} ({getCurrencySymbol(currency)})</strong>
            </div>
            {getRegionalMessage()}
            <Badge variant="secondary" className="mt-3 text-sm px-4 py-1.5">
              <Zap className="h-4 w-4 mr-1 inline" />
              Use your own Google API key for unlimited AI • Pay Google directly
            </Badge>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {plans.map((plan) => (
              <Card key={plan.id} className={cn('flex flex-col rounded-2xl shadow-lg h-full', plan.isFeatured ? 'border-2 border-primary ring-4 ring-primary/20' : '')}>
                {plan.isFeatured && (
                  <div className="py-2 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-t-xl text-center">Most Popular</div>
                )}
                <CardHeader className="p-6">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-muted-foreground min-h-[3rem]">{plan.description}</p>
                  <p className="text-4xl font-extrabold text-foreground mt-4">{getPriceForPlan(plan)}</p>
                  <p className="text-sm text-muted-foreground">{plan.priceMonthlyUSD > 0 ? '/ month' : 'Forever'}</p>
                  {plan.yearlyDiscountPercentage && plan.yearlyDiscountPercentage > 0 && (
                    <Badge variant="secondary" className="mt-2 w-fit">Save {plan.yearlyDiscountPercentage}% yearly</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <Users className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Up to <strong className="text-foreground">{plan.maxUsers}</strong> {plan.maxUsers === 1 ? 'user' : 'team members'}</span>
                    </li>
                    {plan.maxUsers > 1 && (
                      <li className="flex items-start">
                        <Clock className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Team Management:</strong> Attendance tracking, unified brand presence, shared CRM & campaigns
                        </span>
                      </li>
                    )}
                    <li className="flex items-center">
                      <Bot className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{plan.aiCreditsPerMonth.toLocaleString()}</strong> AI Credits
                        {plan.priceMonthlyUSD === 0 && <span className="text-xs ml-1">(one-time)</span>}
                        {plan.allowBYOK && <span className="text-xs ml-1">/mo</span>}
                      </span>
                    </li>
                    {plan.allowBYOK && (
                      <li className="flex items-start">
                        <Zap className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">UNLIMITED AI with your own API key</span>
                      </li>
                    )}
                    {plan.maxImagesPerMonth !== undefined && (
                      <li className="flex items-center">
                        <Image className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground"><strong className="text-foreground">{plan.maxImagesPerMonth.toLocaleString()}</strong> images/mo</span>
                      </li>
                    )}
                    <li className="flex items-center">
                      <Database className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{getCRMLimitDescription(plan)}</span>
                    </li>
                    {plan.featureIds.map((featureId, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{getFeatureName(featureId)}</span>
                      </li>
                    ))}
                    {plan.allowOverage && (
                      <li className="flex items-start pt-2 border-t">
                        <Zap className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Overage credits available</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  {appUser ? (
                    plan.priceMonthlyUSD === 0 ? (
                      <Button asChild className="w-full text-lg py-6" variant="outline">
                        <Link href="/dashboard">Go to Dashboard</Link>
                      </Button>
                    ) : (
                      <PaymentButton
                        plan={plan}
                        billingCycle="monthly"
                        country={company?.country}
                        currency={currency}
                        variant={plan.isFeatured ? 'default' : 'outline'}
                        size="lg"
                        className="w-full text-lg py-6"
                      />
                    )
                  ) : (
                    <Button asChild className="w-full text-lg py-6" variant={plan.isFeatured ? 'accent' : 'outline'}>
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
