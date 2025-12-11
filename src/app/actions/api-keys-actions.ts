"use server";

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { decryptApiKeyServerSide, encryptServerSide } from '@/lib/encryption-server';
import type { StoredApiKeys } from '@/types/integrations';

export async function fetchCompanyApiKeysAction(companyId: string): Promise<{
  success: boolean;
  apiKeys?: Record<string, Record<string, string>>;
  error?: string;
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }

    const storedKeys = (companyDoc.data().apiKeys as Record<string, any>) || {};
    const decryptedKeys: Record<string, Record<string, string>> = {};
    
    for (const [serviceId, serviceKeys] of Object.entries(storedKeys)) {
      if (!serviceKeys || typeof serviceKeys !== 'object') continue;
      
      decryptedKeys[serviceId] = {};
      
      for (const [fieldId, value] of Object.entries(serviceKeys as Record<string, any>)) {
        if (value === null || value === undefined) {
          decryptedKeys[serviceId][fieldId] = '';
          continue;
        }
        
        try {
          decryptedKeys[serviceId][fieldId] = decryptApiKeyServerSide(value);
        } catch (err) {
          console.warn(`Failed to decrypt ${serviceId}.${fieldId}`, err);
          decryptedKeys[serviceId][fieldId] = '';
        }
      }
    }

    return { success: true, apiKeys: decryptedKeys };
  } catch (err) {
    console.error('Failed to fetch API keys:', err);
    return { success: false, error: 'Failed to load API keys' };
  }
}

export async function saveApiKeysAction(
  companyId: string,
  integrationId: string,
  apiKeyData: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }

    const storedKeys = (companyDoc.data().apiKeys as Record<string, any>) || {};
    const encryptedData: Record<string, string> = {};

    for (const [key, value] of Object.entries(apiKeyData)) {
      if (value && value.trim()) {
        encryptedData[key] = encryptServerSide(value);
      }
    }

    storedKeys[integrationId] = encryptedData;
    
    await updateDoc(companyRef, { apiKeys: storedKeys });
    return { success: true };
  } catch (err) {
    console.error('Failed to save API keys:', err);
    return { success: false, error: 'Failed to save API keys' };
  }
}
