"use client";

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  SupportedCurrency, 
  getCurrencyFlag, 
  getCurrencyName,
  detectUserLocation 
} from '@/lib/geo-detection';

interface CurrencySwitcherProps {
  value?: SupportedCurrency;
  onChange?: (currency: SupportedCurrency) => void;
  className?: string;
}

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['INR', 'USD', 'EUR', 'GBP'];

export function CurrencySwitcher({ 
  value, 
  onChange,
  className = '' 
}: CurrencySwitcherProps) {
  const [mounted, setMounted] = useState(false);
  const [localCurrency, setLocalCurrency] = useState<SupportedCurrency>(value || 'USD');

  useEffect(() => {
    setMounted(true);
    
    // Auto-detect currency on mount if not provided
    if (!value) {
      const stored = localStorage.getItem('preferred_currency') as SupportedCurrency;
      if (stored && SUPPORTED_CURRENCIES.includes(stored)) {
        setLocalCurrency(stored);
        onChange?.(stored);
      } else {
        detectUserLocation().then((location) => {
          setLocalCurrency(location.currency);
          onChange?.(location.currency);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (value) {
      setLocalCurrency(value);
    }
  }, [value]);

  const handleCurrencyChange = (newCurrency: string) => {
    const currency = newCurrency as SupportedCurrency;
    setLocalCurrency(currency);
    
    // Persist to localStorage
    localStorage.setItem('preferred_currency', currency);
    
    // Notify parent
    onChange?.(currency);
  };

  if (!mounted) {
    return (
      <div className={`w-[140px] h-10 bg-muted/20 rounded-md animate-pulse ${className}`} />
    );
  }

  return (
    <Select value={localCurrency} onValueChange={handleCurrencyChange}>
      <SelectTrigger className={`w-[140px] ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCurrencyFlag(localCurrency)}</span>
            <span className="text-sm font-medium">{localCurrency}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((curr) => (
          <SelectItem key={curr} value={curr}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCurrencyFlag(curr)}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{curr}</span>
                <span className="text-xs text-muted-foreground">
                  {getCurrencyName(curr)}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
