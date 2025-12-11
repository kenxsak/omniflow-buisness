"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { getCompany } from '@/lib/saas-data';
import { decryptApiKey } from '@/lib/encryption';
import type { StoredApiKeys } from '@/types/integrations';

interface UseCompanyApiKeysReturn {
  apiKeys: StoredApiKeys | null;
  isLoading: boolean;
  error: string | null;
  companyName: string | null;
  refetch: () => Promise<void>;
}

export function useCompanyApiKeys(): UseCompanyApiKeysReturn {
  const { appUser } = useAuth();
  const [apiKeys, setApiKeys] = useState<StoredApiKeys | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    if (!appUser?.companyId) {
      setIsLoading(false);
      setApiKeys(null);
      setCompanyName(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const company = await getCompany(appUser.companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      setCompanyName(company.name || null);

      const storedKeys = company.apiKeys || {};
      
      const decryptedKeys: StoredApiKeys = {};
      
      for (const [serviceId, serviceKeys] of Object.entries(storedKeys)) {
        if (!serviceKeys || typeof serviceKeys !== 'object') continue;
        
        decryptedKeys[serviceId as keyof StoredApiKeys] = {};
        
        for (const [fieldId, value] of Object.entries(serviceKeys as Record<string, any>)) {
          if (value === null || value === undefined) {
            decryptedKeys[serviceId as keyof StoredApiKeys]![fieldId] = '';
            continue;
          }
          
          if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
            try {
              decryptedKeys[serviceId as keyof StoredApiKeys]![fieldId] = await decryptApiKey(value);
            } catch (err) {
              console.warn(`Failed to decrypt ${serviceId}.${fieldId}, using empty string`, err);
              decryptedKeys[serviceId as keyof StoredApiKeys]![fieldId] = '';
            }
          } else {
            decryptedKeys[serviceId as keyof StoredApiKeys]![fieldId] = String(value);
          }
        }
      }

      setApiKeys(decryptedKeys);

    } catch (err) {
      console.error('Failed to fetch company API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
      setApiKeys(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [appUser?.companyId]);

  return {
    apiKeys,
    isLoading,
    error,
    companyName,
    refetch: fetchApiKeys,
  };
}
