"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppProvider {
  id: string;
  name: string;
  monthlyFee: number;
  perMessageCost: number;
  description: string;
  badge?: string;
}

const providers: WhatsAppProvider[] = [
  {
    id: 'meta',
    name: 'Meta (Direct)',
    monthlyFee: 0,
    perMessageCost: 0.88,
    description: 'Official Meta Cloud API - Zero markup, best for high volume',
    badge: 'BEST'
  },
  {
    id: 'authkey',
    name: 'WMart CPaaS',
    monthlyFee: 0,
    perMessageCost: 0.15,
    description: 'Our all-in-one platform - WhatsApp + SMS + Email + Voice',
    badge: '₹1,499 free'
  },
  {
    id: 'aisensy',
    name: 'AiSensy',
    monthlyFee: 2400,
    perMessageCost: 0.02,
    description: 'AI-powered automation and chatbots',
  },
];

export function WhatsAppCostCalculator() {
  const [monthlyMessages, setMonthlyMessages] = useState(1000);

  const calculateMonthlyCost = (provider: WhatsAppProvider) => {
    return provider.monthlyFee + (monthlyMessages * provider.perMessageCost);
  };

  const calculateAnnualCost = (provider: WhatsAppProvider) => {
    return calculateMonthlyCost(provider) * 12;
  };

  const providersWithCosts = providers.map(provider => ({
    ...provider,
    monthlyCost: calculateMonthlyCost(provider),
    annualCost: calculateAnnualCost(provider),
  })).sort((a, b) => a.monthlyCost - b.monthlyCost);

  const cheapest = providersWithCosts[0];
  const mostExpensive = providersWithCosts[providersWithCosts.length - 1];
  const monthlySavings = mostExpensive.monthlyCost - cheapest.monthlyCost;
  const annualSavings = mostExpensive.annualCost - cheapest.annualCost;

  const getRecommendation = () => {
    if (monthlyMessages === 0) {
      return {
        provider: cheapest.name,
        reason: 'Set a message volume to see the best platform for you'
      };
    }

    let reason = '';
    if (cheapest.monthlyFee === 0) {
      reason = `No monthly fees - you only pay for messages you actually send`;
    } else {
      reason = `Best value at this volume when combining monthly fee and per-message costs`;
    }

    return {
      provider: cheapest.name,
      reason: reason
    };
  };

  const recommendation = getRecommendation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-600" />
          WhatsApp Platform Cost Comparison
        </CardTitle>
        <CardDescription>
          Find the most cost-effective platform for your message volume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume-slider">How many messages will you send each month?</Label>
            <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
              {monthlyMessages.toLocaleString('en-IN')}
            </Badge>
          </div>
          <Slider
            id="volume-slider"
            min={0}
            max={50000}
            step={100}
            value={[monthlyMessages]}
            onValueChange={(value) => setMonthlyMessages(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>10,000</span>
            <span>25,000</span>
            <span>50,000+</span>
          </div>
        </div>

        {/* Cost Comparison Table */}
        <div className="space-y-3">
          {providersWithCosts.map((provider, index) => {
            const isRecommended = provider.id === cheapest.id;
            const isRecommendedByLogic = provider.name === recommendation.provider;
            
            return (
              <div
                key={provider.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isRecommended
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{provider.name}</h4>
                      {provider.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {provider.badge}
                        </Badge>
                      )}
                      {isRecommended && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          CHEAPEST
                        </Badge>
                      )}
                      {isRecommendedByLogic && !isRecommended && (
                        <Badge variant="outline" className="text-xs border-green-600 text-green-600">
                          RECOMMENDED
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {provider.description}
                    </p>
                    <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
                      <span>
                        Monthly fee: <span className="font-medium text-foreground">{formatCurrency(provider.monthlyFee)}</span>
                      </span>
                      <span>
                        Per message: <span className="font-medium text-foreground">₹{provider.perMessageCost.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrency(provider.monthlyCost)}
                    </div>
                    <div className="text-xs text-muted-foreground">per month</div>
                    {isRecommended && monthlySavings > 0 && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Save {formatCurrency(monthlySavings)}/mo
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendation Card */}
        {monthlyMessages > 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <div className="space-y-2">
                <p className="font-semibold">
                  💡 For {monthlyMessages.toLocaleString('en-IN')} messages/month, we recommend {recommendation.provider}
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {recommendation.reason}
                </p>
                {annualSavings > 0 && (
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Annual savings with {cheapest.name}: {formatCurrency(annualSavings)} vs {mostExpensive.name}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <div className="font-medium mb-1">Most Affordable</div>
            <div className="text-muted-foreground">
              {cheapest.name} - {formatCurrency(cheapest.monthlyCost)}/month
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="font-medium mb-1">Your Annual Cost</div>
            <div className="text-muted-foreground">
              {formatCurrency(cheapest.annualCost)} with {cheapest.name}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
