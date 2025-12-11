/**
 * Payment Gateway Configuration
 * Centralized configuration for Stripe and Razorpay
 */

import type { PaymentGateway, BillingCycle } from '@/types/payment';
import type { Plan } from '@/types/saas';

/**
 * Determine which payment gateway to use based on country
 */
export function getPreferredPaymentGateway(country?: string): PaymentGateway {
  // Use Razorpay for India, Stripe for rest of world
  if (country?.toLowerCase() === 'india' || country?.toLowerCase() === 'in') {
    return 'razorpay';
  }
  return 'stripe';
}

/**
 * Calculate final price with yearly discount
 */
export function calculatePrice(
  plan: Plan,
  billingCycle: BillingCycle
): number {
  const monthlyPrice = plan.priceMonthlyUSD;
  
  if (billingCycle === 'yearly') {
    const yearlyPrice = monthlyPrice * 12;
    const discount = plan.yearlyDiscountPercentage || 0;
    const discountedPrice = yearlyPrice * (1 - discount / 100);
    return Math.round(discountedPrice * 100) / 100; // Round to 2 decimals
  }
  
  return monthlyPrice;
}

/**
 * Convert USD to INR for Razorpay (Indian customers)
 */
export async function convertUSDToINR(amountUSD: number): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    const inrRate = data.rates.INR || 83; // Fallback to ~83 if API fails
    return Math.round(amountUSD * inrRate * 100); // Convert to paise (smallest unit)
  } catch (error) {
    console.error('Currency conversion failed, using default rate:', error);
    return Math.round(amountUSD * 83 * 100); // Default rate
  }
}

/**
 * Get Stripe public key from environment
 */
export function getStripePublicKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLIC_KEY is not configured');
  }
  return key;
}

/**
 * Get Razorpay public key from environment
 */
export function getRazorpayPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured');
  }
  return key;
}

/**
 * Format amount for display
 */
export function formatPaymentAmount(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Payment gateway display names
 */
export const PAYMENT_GATEWAY_NAMES: Record<PaymentGateway, string> = {
  stripe: 'Stripe',
  razorpay: 'Razorpay',
};

/**
 * Supported currencies by gateway
 */
export const GATEWAY_CURRENCIES: Record<PaymentGateway, string[]> = {
  stripe: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'],
  razorpay: ['INR'],
};

/**
 * Get currency for payment gateway
 */
export function getCurrencyForGateway(
  gateway: PaymentGateway,
  preferredCurrency: string = 'USD'
): string {
  const supportedCurrencies = GATEWAY_CURRENCIES[gateway];
  
  if (supportedCurrencies.includes(preferredCurrency)) {
    return preferredCurrency;
  }
  
  // Return default currency for gateway
  return gateway === 'razorpay' ? 'INR' : 'USD';
}
