"use client";

interface ExchangeRates {
  [currencyCode: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let cachedRates: CachedRates | null = null;

const countryToCurrency: { [country: string]: string } = {
  'Afghanistan': 'AFN',
  'Albania': 'ALL',
  'Algeria': 'DZD',
  'Argentina': 'ARS',
  'Australia': 'AUD',
  'Austria': 'EUR',
  'Bahrain': 'BHD',
  'Bangladesh': 'BDT',
  'Belgium': 'EUR',
  'Brazil': 'BRL',
  'Bulgaria': 'BGN',
  'Canada': 'CAD',
  'Chile': 'CLP',
  'China': 'CNY',
  'Colombia': 'COP',
  'Croatia': 'EUR',
  'Cyprus': 'EUR',
  'Czech Republic': 'CZK',
  'Denmark': 'DKK',
  'Egypt': 'EGP',
  'Estonia': 'EUR',
  'Finland': 'EUR',
  'France': 'EUR',
  'Germany': 'EUR',
  'Greece': 'EUR',
  'Hong Kong': 'HKD',
  'Hungary': 'HUF',
  'Iceland': 'ISK',
  'India': 'INR',
  'Indonesia': 'IDR',
  'Ireland': 'EUR',
  'Israel': 'ILS',
  'Italy': 'EUR',
  'Japan': 'JPY',
  'Jordan': 'JOD',
  'Kenya': 'KES',
  'Kuwait': 'KWD',
  'Latvia': 'EUR',
  'Lithuania': 'EUR',
  'Luxembourg': 'EUR',
  'Malaysia': 'MYR',
  'Malta': 'EUR',
  'Mexico': 'MXN',
  'Netherlands': 'EUR',
  'New Zealand': 'NZD',
  'Nigeria': 'NGN',
  'Norway': 'NOK',
  'Oman': 'OMR',
  'Pakistan': 'PKR',
  'Peru': 'PEN',
  'Philippines': 'PHP',
  'Poland': 'PLN',
  'Portugal': 'EUR',
  'Qatar': 'QAR',
  'Romania': 'RON',
  'Russia': 'RUB',
  'Saudi Arabia': 'SAR',
  'Singapore': 'SGD',
  'Slovakia': 'EUR',
  'Slovenia': 'EUR',
  'South Africa': 'ZAR',
  'South Korea': 'KRW',
  'Spain': 'EUR',
  'Sri Lanka': 'LKR',
  'Sweden': 'SEK',
  'Switzerland': 'CHF',
  'Taiwan': 'TWD',
  'Thailand': 'THB',
  'Turkey': 'TRY',
  'UAE': 'AED',
  'United Arab Emirates': 'AED',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'United States': 'USD',
  'USA': 'USD',
  'Vietnam': 'VND',
};

export function getCurrencyByCountry(country?: string): string {
  if (!country) return 'USD';
  
  const normalizedCountry = country.trim();
  const currency = countryToCurrency[normalizedCountry];
  
  if (currency) {
    return currency;
  }
  
  const lowerCountry = normalizedCountry.toLowerCase();
  for (const [key, value] of Object.entries(countryToCurrency)) {
    if (key.toLowerCase() === lowerCountry) {
      return value;
    }
  }
  
  return 'USD';
}

async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid exchange rate data received');
    }
    
    return data.rates as ExchangeRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    return getFallbackRates();
  }
}

function getFallbackRates(): ExchangeRates {
  return {
    'USD': 1.00,
    'EUR': 0.92,
    'GBP': 0.79,
    'INR': 83.12,
    'AUD': 1.53,
    'CAD': 1.36,
    'SGD': 1.34,
    'JPY': 149.50,
    'CNY': 7.24,
    'AED': 3.67,
    'MXN': 17.05,
    'BRL': 4.97,
    'ZAR': 18.65,
    'CHF': 0.88,
    'SEK': 10.35,
    'NOK': 10.68,
    'DKK': 6.86,
    'PLN': 4.02,
    'THB': 34.85,
    'MYR': 4.47,
    'IDR': 15650.00,
    'PHP': 55.75,
    'VND': 24350.00,
    'KRW': 1320.00,
    'HKD': 7.82,
    'TWD': 31.50,
    'NZD': 1.66,
    'TRY': 28.50,
    'RUB': 92.00,
    'SAR': 3.75,
    'QAR': 3.64,
    'KWD': 0.31,
    'BHD': 0.38,
    'OMR': 0.38,
    'JOD': 0.71,
    'EGP': 30.90,
    'ILS': 3.65,
    'NGN': 1550.00,
    'KES': 150.00,
    'PKR': 278.00,
    'LKR': 325.00,
    'BGN': 1.80,
    'CZK': 22.45,
    'HUF': 355.00,
    'RON': 4.57,
    'ISK': 137.00,
    'ARS': 350.00,
    'CLP': 890.00,
    'COP': 3950.00,
    'PEN': 3.73,
  };
}

async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  if (cachedRates && (now - cachedRates.timestamp) < CACHE_DURATION) {
    return cachedRates.rates;
  }
  
  const rates = await fetchExchangeRates();
  
  cachedRates = {
    rates,
    timestamp: now,
  };
  
  return rates;
}

export async function convertCurrency(amountUSD: number, toCurrency: string): Promise<number> {
  if (toCurrency === 'USD') {
    return amountUSD;
  }
  
  try {
    const rates = await getExchangeRates();
    const rate = rates[toCurrency];
    
    if (!rate) {
      console.warn(`Exchange rate not found for ${toCurrency}, returning USD amount`);
      return amountUSD;
    }
    
    return amountUSD * rate;
  } catch (error) {
    console.error(`Error converting currency to ${toCurrency}:`, error);
    return amountUSD;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'SGD': 'S$',
    'AED': 'د.إ',
    'MXN': 'MX$',
    'BRL': 'R$',
    'ZAR': 'R',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
    'KRW': '₩',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'NZD': 'NZ$',
    'TRY': '₺',
    'RUB': '₽',
    'SAR': 'ر.س',
    'QAR': 'ر.ق',
    'KWD': 'د.ك',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
    'JOD': 'د.ا',
    'EGP': 'E£',
    'ILS': '₪',
    'NGN': '₦',
    'KES': 'KSh',
    'PKR': '₨',
    'LKR': 'Rs',
    'BGN': 'лв',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'RON': 'lei',
    'ISK': 'kr',
    'ARS': 'AR$',
    'CLP': 'CL$',
    'COP': 'CO$',
    'PEN': 'S/',
  };
  
  return symbols[currencyCode] || currencyCode;
}
