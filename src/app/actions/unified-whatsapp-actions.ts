'use server';

/**
 * Unified WhatsApp Service Server Actions
 * Automatically selects best available provider with failover
 */

import {
  sendUnifiedWhatsAppBulk,
  validateAllProviders,
  type UnifiedWhatsAppConfig
} from '@/lib/unified-whatsapp-service';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import type { MetaWhatsAppConfig } from '@/lib/meta-whatsapp-client';
import type { AuthkeyConfig } from '@/lib/authkey-client';
import type { AiSensyConfig } from '@/lib/aisensy-client';
import type { GupshupConfig } from '@/lib/gupshup-client';

/**
 * Get unified configuration from company API keys
 */
async function getUnifiedConfig(companyId: string): Promise<UnifiedWhatsAppConfig> {
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  const companyDoc = await adminDb.collection('companies').doc(companyId).get();
  if (!companyDoc.exists) {
    throw new Error('Company not found');
  }

  const companyData = companyDoc.data();
  const apiKeys = companyData?.apiKeys || {};

  const config: UnifiedWhatsAppConfig = {};

  // Meta Cloud API (untested)
  if (apiKeys.metaWhatsApp?.phoneNumberId && apiKeys.metaWhatsApp?.accessToken) {
    config.meta = {
      phoneNumberId: typeof apiKeys.metaWhatsApp.phoneNumberId === 'string'
        ? apiKeys.metaWhatsApp.phoneNumberId
        : decryptApiKeyServerSide(apiKeys.metaWhatsApp.phoneNumberId),
      accessToken: decryptApiKeyServerSide(apiKeys.metaWhatsApp.accessToken),
      wabaId: apiKeys.metaWhatsApp?.wabaId
        ? (typeof apiKeys.metaWhatsApp.wabaId === 'string'
            ? apiKeys.metaWhatsApp.wabaId
            : decryptApiKeyServerSide(apiKeys.metaWhatsApp.wabaId))
        : undefined
    };
  }

  // Authkey (tested)
  if (apiKeys.authkey?.apiKey) {
    config.authkey = {
      apiKey: decryptApiKeyServerSide(apiKeys.authkey.apiKey)
    };
  }

  // AiSensy (tested)
  if (apiKeys.aisensy?.apiKey) {
    config.aisensy = {
      apiKey: decryptApiKeyServerSide(apiKeys.aisensy.apiKey)
    };
  }

  // Gupshup (tested)
  if (apiKeys.gupshup?.apiKey && apiKeys.gupshup?.appName) {
    config.gupshup = {
      apiKey: decryptApiKeyServerSide(apiKeys.gupshup.apiKey),
      appName: typeof apiKeys.gupshup.appName === 'string' 
        ? apiKeys.gupshup.appName 
        : decryptApiKeyServerSide(apiKeys.gupshup.appName),
      srcName: apiKeys.gupshup.srcName 
        ? (typeof apiKeys.gupshup.srcName === 'string' 
            ? apiKeys.gupshup.srcName 
            : decryptApiKeyServerSide(apiKeys.gupshup.srcName))
        : undefined
    };
  }

  return config;
}

/**
 * Send bulk WhatsApp messages with automatic provider selection and failover
 */
export async function sendBulkWhatsAppUnifiedAction(
  idToken: string,
  input: {
    templateName: string;
    languageCode?: string;
    recipients: { phone: string; name?: string; parameters?: string[] }[];
  }
): Promise<{
  success: boolean;
  provider?: string;
  totalSent?: number;
  totalFailed?: number;
  results?: { phone: string; messageId?: string; success: boolean; error?: string }[];
  error?: string;
  failoverAttempts?: { provider: string; error: string }[];
}> {
  try {
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user's companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User company not found' };
    }

    // Get unified configuration
    const config = await getUnifiedConfig(companyId);

    // Send messages with automatic failover
    const result = await sendUnifiedWhatsAppBulk(config, input);

    return {
      success: result.success,
      provider: result.provider,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      results: result.results,
      error: result.error,
      failoverAttempts: result.failoverAttempts
    };
  } catch (error) {
    console.error('Unified WhatsApp send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send messages'
    };
  }
}

/**
 * Validate all configured WhatsApp providers
 */
export async function validateAllWhatsAppProvidersAction(idToken: string): Promise<{
  success: boolean;
  providers?: {
    meta?: { success: boolean; error?: string; details?: any };
    authkey?: { success: boolean; error?: string; balance?: number };
    aisensy?: { success: boolean; error?: string };
    gupshup?: { success: boolean; error?: string };
  };
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user's companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User company not found' };
    }

    // Get unified configuration
    const config = await getUnifiedConfig(companyId);

    // Validate all providers
    const providers = await validateAllProviders(config);

    return {
      success: true,
      providers
    };
  } catch (error) {
    console.error('Provider validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}
