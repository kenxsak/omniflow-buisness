/**
 * Geo-detection utilities for pricing localization
 * Auto-detects user location for pricing display
 */

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface GeoLocation {
  country: string;
  countryCode: string;
  currency: SupportedCurrency;
}

/**
 * Detect user's location from IP using Cloudflare headers (available on Replit)
 * Falls back to browser locale if headers unavailable
 */
export async function detectUserLocation(): Promise<GeoLocation> {
  try {
    // Try to get country from Cloudflare headers via API
    const response = await fetch('/api/geo-detect');
    if (response.ok) {
      const data = await response.json();
      if (data.country) {
        return {
          country: data.country,
          countryCode: data.countryCode || 'US',
          currency: getCurrencyForCountry(data.countryCode || 'US'),
        };
      }
    }
  } catch (error) {
    console.log('Geo-detection API unavailable, using browser locale fallback');
  }

  // Fallback to browser locale detection
  const browserLocale = navigator.language || 'en-US';
  const countryCode = browserLocale.split('-')[1] || 'US';
  
  return {
    country: getCountryName(countryCode),
    countryCode,
    currency: getCurrencyForCountry(countryCode),
  };
}

/**
 * Map country code to supported currency
 */
function getCurrencyForCountry(countryCode: string): SupportedCurrency {
  const code = countryCode.toUpperCase();
  
  // India
  if (code === 'IN') return 'INR';
  
  // European countries
  const euroCountries = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 
                         'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];
  if (euroCountries.includes(code)) return 'EUR';
  
  // United Kingdom
  if (code === 'GB' || code === 'UK') return 'GBP';
  
  // Default to USD for rest of world
  return 'USD';
}

/**
 * Get country name from country code
 */
function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'UK': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'CA': 'Canada',
    'AU': 'Australia',
  };
  
  return countries[countryCode.toUpperCase()] || 'United States';
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
  };
  
  return symbols[currency];
}

/**
 * Get flag emoji for currency
 */
export function getCurrencyFlag(currency: SupportedCurrency): string {
  const flags: Record<SupportedCurrency, string> = {
    'INR': '🇮🇳',
    'USD': '🇺🇸',
    'EUR': '🇪🇺',
    'GBP': '🇬🇧',
  };
  
  return flags[currency];
}

/**
 * Get currency display name
 */
export function getCurrencyName(currency: SupportedCurrency): string {
  const names: Record<SupportedCurrency, string> = {
    'INR': 'Indian Rupees',
    'USD': 'US Dollars',
    'EUR': 'Euros',
    'GBP': 'British Pounds',
  };
  
  return names[currency];
}

/**
 * Fixed pricing for each currency (no conversion)
 * India gets special pricing, others use USD equivalent
 */
export const FIXED_PRICING: Record<SupportedCurrency, {
  starter: number;
  pro: number;
  enterprise: number;
}> = {
  INR: {
    starter: 1999,
    pro: 7999,
    enterprise: 20999,
  },
  USD: {
    starter: 29,
    pro: 99,
    enterprise: 249,
  },
  EUR: {
    starter: 27,
    pro: 92,
    enterprise: 230,
  },
  GBP: {
    starter: 23,
    pro: 78,
    enterprise: 197,
  },
};

/**
 * Get price for plan in specific currency (monthly base price)
 */
export function getPriceForPlan(
  planId: string,
  currency: SupportedCurrency
): number {
  const planType = planId.replace('plan_', '');
  
  if (planType === 'free') return 0;
  
  if (planType in FIXED_PRICING[currency]) {
    return FIXED_PRICING[currency][planType as keyof typeof FIXED_PRICING.USD];
  }
  
  return 0;
}

/**
 * Get price for plan with billing cycle (monthly or yearly with discount)
 */
export function getPriceForPlanWithBillingCycle(
  planId: string,
  currency: SupportedCurrency,
  billingCycle: 'monthly' | 'yearly',
  yearlyDiscountPercentage: number = 0
): number {
  const monthlyPrice = getPriceForPlan(planId, currency);
  
  if (billingCycle === 'yearly') {
    const yearlyPrice = monthlyPrice * 12;
    const discountedPrice = yearlyPrice * (1 - yearlyDiscountPercentage / 100);
    return Math.round(discountedPrice);
  }
  
  return monthlyPrice;
}
