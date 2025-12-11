'use server';

import { serverDb } from '@/lib/firebase-server';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { CompanyAIApiKey } from '@/types/ai-usage';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate a Gemini API key by making a test request
 */
async function validateGeminiApiKey(apiKey: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    // Test the API key with a simple request to Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        isValid: false,
        error: `Invalid API key: ${errorText.substring(0, 100)}`,
      };
    }

    return { isValid: true };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Validation failed: ${error.message}`,
    };
  }
}

/**
 * Add a new Gemini API key for a company
 */
export async function addCompanyGeminiApiKeyAction(
  userId: string,
  companyId: string,
  apiKeyData: {
    apiKey: string;
    label?: string;
    isPrimary?: boolean;
    monthlyBudgetUSD?: number;
    alertThresholdPercent?: number;
  }
): Promise<ActionResult<CompanyAIApiKey>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // Verify user belongs to company and is admin
    const userDoc = await getDoc(doc(serverDb, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (userData.companyId !== companyId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return { success: false, error: 'Only admins can manage API keys' };
    }

    // PLAN RESTRICTION: Check if company plan allows BYOK (Starter/Pro/Enterprise only, not Free)
    const companyDoc = await getDoc(doc(serverDb, 'companies', companyId));
    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }
    
    const companyData = companyDoc.data();
    const planId = companyData.planId || 'plan_free';
    
    // BYOK is only available for paid plans
    if (planId === 'plan_free') {
      return { 
        success: false, 
        error: 'BYOK (Bring Your Own Key) is only available on paid plans (Starter, Pro, or Enterprise). Please upgrade your plan to use your own API key for unlimited AI usage.' 
      };
    }

    // Validate the API key
    console.log('Validating Gemini API key...');
    const validation = await validateGeminiApiKey(apiKeyData.apiKey);
    
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `API key validation failed: ${validation.error}` 
      };
    }

    // Encrypt the API key
    const encryptedApiKey = await encryptApiKey(apiKeyData.apiKey);

    // If this is set as primary, unset other primary keys
    if (apiKeyData.isPrimary) {
      const existingKeysQuery = query(
        collection(serverDb, 'companyAIApiKeys'),
        where('companyId', '==', companyId),
        where('isPrimary', '==', true)
      );
      const existingKeys = await getDocs(existingKeysQuery);
      
      for (const keyDoc of existingKeys.docs) {
        await updateDoc(keyDoc.ref, { isPrimary: false });
      }
    }

    // Create the API key record
    const newKey: Omit<CompanyAIApiKey, 'id'> = {
      companyId,
      keyType: 'gemini',
      apiKey: JSON.stringify(encryptedApiKey), // Store as JSON string
      isActive: true,
      isPrimary: apiKeyData.isPrimary || false,
      lastValidated: new Date().toISOString(),
      isValid: true,
      label: apiKeyData.label,
      monthlyBudgetUSD: apiKeyData.monthlyBudgetUSD,
      alertThresholdPercent: apiKeyData.alertThresholdPercent || 80,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    const keyRef = await addDoc(collection(serverDb, 'companyAIApiKeys'), {
      ...newKey,
      createdAt: serverTimestamp(),
    });

    // Update company document if this is the primary key
    if (apiKeyData.isPrimary) {
      await updateDoc(doc(serverDb, 'companies', companyId), {
        geminiApiKeyId: keyRef.id,
        useOwnGeminiApiKey: true,
      });
    }

    const createdKey: CompanyAIApiKey = {
      ...newKey,
      id: keyRef.id,
    };

    return { success: true, data: createdKey };
  } catch (error) {
    console.error('Error adding company Gemini API key:', error);
    return { success: false, error: 'Failed to add API key' };
  }
}

/**
 * Get all API keys for a company
 */
export async function getCompanyGeminiApiKeysAction(
  userId: string,
  companyId: string
): Promise<ActionResult<CompanyAIApiKey[]>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // Verify user belongs to company
    const userDoc = await getDoc(doc(serverDb, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (userData.companyId !== companyId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get all API keys for the company
    const keysQuery = query(
      collection(serverDb, 'companyAIApiKeys'),
      where('companyId', '==', companyId)
    );
    const keysSnapshot = await getDocs(keysQuery);

    const keys: CompanyAIApiKey[] = [];
    keysSnapshot.forEach((doc) => {
      const data = doc.data() as CompanyAIApiKey;
      // Don't return the actual encrypted key to the client
      keys.push({
        ...data,
        id: doc.id,
        apiKey: '••••••••••••••••', // Masked for security
      });
    });

    return { success: true, data: keys };
  } catch (error) {
    console.error('Error getting company Gemini API keys:', error);
    return { success: false, error: 'Failed to fetch API keys' };
  }
}

/**
 * Update an existing API key
 */
export async function updateCompanyGeminiApiKeyAction(
  userId: string,
  keyId: string,
  updates: {
    label?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    monthlyBudgetUSD?: number;
    alertThresholdPercent?: number;
  }
): Promise<ActionResult> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // Get the API key
    const keyDoc = await getDoc(doc(serverDb, 'companyAIApiKeys', keyId));
    if (!keyDoc.exists()) {
      return { success: false, error: 'API key not found' };
    }

    const keyData = keyDoc.data() as CompanyAIApiKey;

    // Verify user belongs to company
    const userDoc = await getDoc(doc(serverDb, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (userData.companyId !== keyData.companyId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return { success: false, error: 'Only admins can manage API keys' };
    }

    // If setting as primary, unset other primary keys
    if (updates.isPrimary) {
      const existingKeysQuery = query(
        collection(serverDb, 'companyAIApiKeys'),
        where('companyId', '==', keyData.companyId),
        where('isPrimary', '==', true)
      );
      const existingKeys = await getDocs(existingKeysQuery);
      
      for (const existingKeyDoc of existingKeys.docs) {
        if (existingKeyDoc.id !== keyId) {
          await updateDoc(existingKeyDoc.ref, { isPrimary: false });
        }
      }

      // Update company document
      await updateDoc(doc(serverDb, 'companies', keyData.companyId), {
        geminiApiKeyId: keyId,
        useOwnGeminiApiKey: true,
      });
    }

    // Update the key
    await updateDoc(doc(serverDb, 'companyAIApiKeys', keyId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating company Gemini API key:', error);
    return { success: false, error: 'Failed to update API key' };
  }
}

/**
 * Delete an API key
 */
export async function deleteCompanyGeminiApiKeyAction(
  userId: string,
  keyId: string
): Promise<ActionResult> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // Get the API key
    const keyDoc = await getDoc(doc(serverDb, 'companyAIApiKeys', keyId));
    if (!keyDoc.exists()) {
      return { success: false, error: 'API key not found' };
    }

    const keyData = keyDoc.data() as CompanyAIApiKey;

    // Verify user belongs to company
    const userDoc = await getDoc(doc(serverDb, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (userData.companyId !== keyData.companyId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return { success: false, error: 'Only admins can manage API keys' };
    }

    // If this was the primary key, update company document
    if (keyData.isPrimary) {
      await updateDoc(doc(serverDb, 'companies', keyData.companyId), {
        geminiApiKeyId: null,
        useOwnGeminiApiKey: false,
      });
    }

    // Delete the key
    await deleteDoc(doc(serverDb, 'companyAIApiKeys', keyId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting company Gemini API key:', error);
    return { success: false, error: 'Failed to delete API key' };
  }
}

/**
 * Get the appropriate API key to use for AI operations (server-side only)
 * Returns either the company's own key or the platform key
 */
export async function getGeminiApiKeyForCompany(
  companyId: string
): Promise<{ apiKey: string; type: 'platform' | 'company_owned' }> {
  if (!serverDb) {
    // Fall back to platform key
    return {
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
      type: 'platform',
    };
  }

  try {
    // Check if company wants to use their own key
    const companyDoc = await getDoc(doc(serverDb, 'companies', companyId));
    if (!companyDoc.exists()) {
      // Fall back to platform key
      return {
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
        type: 'platform',
      };
    }

    const companyData = companyDoc.data();
    
    if (companyData.useOwnGeminiApiKey && companyData.geminiApiKeyId) {
      // Get the company's API key
      const keyDoc = await getDoc(
        doc(serverDb, 'companyAIApiKeys', companyData.geminiApiKeyId)
      );

      if (keyDoc.exists()) {
        const keyData = keyDoc.data() as CompanyAIApiKey;
        
        if (keyData.isActive && keyData.isValid) {
          // Decrypt and return the company's key
          // Parse JSON string back to EncryptedData object
          const encryptedData = typeof keyData.apiKey === 'string' 
            ? JSON.parse(keyData.apiKey) 
            : keyData.apiKey;
          const decryptedKey = await decryptApiKey(encryptedData);
          return {
            apiKey: decryptedKey,
            type: 'company_owned',
          };
        }
      }
    }

    // Fall back to platform key
    return {
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
      type: 'platform',
    };
  } catch (error) {
    console.error('Error getting Gemini API key for company:', error);
    // Fall back to platform key
    return {
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
      type: 'platform',
    };
  }
}
