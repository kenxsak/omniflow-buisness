"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, IndianRupee, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createStripeCheckoutSession } from '@/app/actions/stripe-payment-actions';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/actions/razorpay-payment-actions';
import type { BillingCycle } from '@/types/payment';
import type { Plan } from '@/types/saas';
import { getPreferredPaymentGateway } from '@/lib/payment-config';
import { getPriceForPlanWithBillingCycle, getCurrencySymbol, type SupportedCurrency } from '@/lib/geo-detection';

interface PaymentButtonProps {
  plan: Plan;
  billingCycle: BillingCycle;
  country?: string;
  currency?: SupportedCurrency;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentButton({
  plan,
  billingCycle,
  country,
  currency,
  variant = 'default',
  size = 'default',
  className,
}: PaymentButtonProps) {
  const { appUser, company } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const preferredGateway = getPreferredPaymentGateway(country || company?.country);
  
  const activeCurrency: SupportedCurrency = currency || (preferredGateway === 'razorpay' ? 'INR' : 'USD');
  const amount = getPriceForPlanWithBillingCycle(
    plan.id, 
    activeCurrency, 
    billingCycle, 
    plan.yearlyDiscountPercentage || 0
  );
  
  const displayAmount = `${getCurrencySymbol(activeCurrency)}${amount.toLocaleString()}`;

  const handleStripePayment = async () => {
    if (!appUser?.idToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await createStripeCheckoutSession({
        idToken: appUser.idToken,
        planId: plan.id,
        billingCycle,
      });

      if (result.success && result.session?.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.session.url;
      } else {
        toast({
          title: 'Payment Failed',
          description: result.error || 'Failed to create checkout session',
          variant: 'destructive',
        });
        setLoading(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!appUser?.idToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Create Razorpay order
      const result = await createRazorpayOrder({
        idToken: appUser.idToken,
        planId: plan.id,
        billingCycle,
      });

      if (!result.success || !result.order) {
        toast({
          title: 'Payment Failed',
          description: result.error || 'Failed to create order',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, key } = result.order;

      // Open Razorpay checkout
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: 'OmniFlow',
        description: `${plan.name} Plan - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'}`,
        order_id: orderId,
        handler: async function (response: any) {
          // Verify payment on server
          const verifyResult = await verifyRazorpayPayment({
            idToken: appUser.idToken!,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          if (verifyResult.success) {
            toast({
              title: 'Payment Successful!',
              description: `You have been upgraded to ${plan.name} plan`,
            });
            
            // Redirect to dashboard
            window.location.href = '/settings?tab=billing&payment=success';
          } else {
            toast({
              title: 'Verification Failed',
              description: verifyResult.error || 'Payment verification failed',
              variant: 'destructive',
            });
          }
          
          setLoading(false);
        },
        prefill: {
          email: appUser.email,
          name: appUser.name || '',
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast({
              title: 'Payment Cancelled',
              description: 'You cancelled the payment',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (preferredGateway === 'razorpay') {
      handleRazorpayPayment();
    } else {
      handleStripePayment();
    }
  };

  if (amount === 0) {
    return null; // Don't show payment button for free plan
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {preferredGateway === 'razorpay' ? (
            <IndianRupee className="mr-2 h-4 w-4" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          Pay {displayAmount}
          {billingCycle === 'yearly' && ` (Save ${plan.yearlyDiscountPercentage}%)`}
        </>
      )}
    </Button>
  );
}
