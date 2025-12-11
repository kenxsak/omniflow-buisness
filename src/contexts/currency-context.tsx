
"use client";

import type { Dispatch, ReactNode, SetStateAction} from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth'; 
import { getCurrencyByCountry, convertCurrency, getCurrencySymbol } from '@/lib/currency-converter';

interface CurrencyContextType {
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
  formatCurrency: (amount: number) => string;
  convertFromUSD: (amountUSD: number) => Promise<number>;
  getCurrencyCode: () => string;
}

const defaultContextValue: CurrencyContextType = {
  currency: 'USD',
  setCurrency: () => {},
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  convertFromUSD: async (amountUSD: number) => amountUSD,
  getCurrencyCode: () => 'USD',
};

const CurrencyContext = createContext<CurrencyContextType>(defaultContextValue);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<string>('USD');
  const { company, loading } = useAuth();

  useEffect(() => {
    if (!loading && company) {
      const detectedCurrency = getCurrencyByCountry(company.country);
      setCurrency(detectedCurrency);
    } else if (!loading && !company) {
      setCurrency('USD');
    }
  }, [company, loading]);

  const formatCurrency = (amount: number): string => {
    try {
      const locale = currency === 'INR' ? 'en-IN' : 
                     currency === 'EUR' ? 'de-DE' : 
                     currency === 'GBP' ? 'en-GB' : 
                     currency === 'JPY' ? 'ja-JP' : 
                     'en-US';
      
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      console.error("Currency formatting error:", error);
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${amount.toFixed(2)}`;
    }
  };

  const convertFromUSD = async (amountUSD: number): Promise<number> => {
    if (currency === 'USD') {
      return amountUSD;
    }
    return await convertCurrency(amountUSD, currency);
  };

  const getCurrencyCode = (): string => {
    return currency;
  };

  const value = {
    currency,
    setCurrency,
    formatCurrency,
    convertFromUSD,
    getCurrencyCode,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  return context;
};
