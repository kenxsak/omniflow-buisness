'use server';

/**
 * Meta WhatsApp Cloud API Server Actions
 * Direct integration with Meta's WhatsApp Business Platform
 */

import {
  getMetaWhatsAppTemplates,
  sendBulkMetaWhatsApp,
  validateMetaConnection,
  type MetaWhatsAppConfig,
  type MetaWhatsAppTemplate
} from '@/lib/meta-whatsapp-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Get all WhatsApp templates from Meta
 */
export async function getMetaWhatsAppTemplatesAction(idToken: string): Promise<{
  success: boolean;
  templates?: MetaWhatsAppTemplate[];
  error?: string;
}> {
  try {
    // Verify authentication
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

    // Get company's Meta WhatsApp configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    // Decrypt Meta configuration
    const phoneNumberId = apiKeys.metaWhatsApp?.phoneNumberId
      ? (typeof apiKeys.metaWhatsApp.phoneNumberId === 'string'
          ? apiKeys.metaWhatsApp.phoneNumberId
          : decryptApiKeyServerSide(apiKeys.metaWhatsApp.phoneNumberId))
      : '';

    const accessToken = apiKeys.metaWhatsApp?.accessToken
      ? decryptApiKeyServerSide(apiKeys.metaWhatsApp.accessToken)
      : '';

    const wabaId = apiKeys.metaWhatsApp?.wabaId
      ? (typeof apiKeys.metaWhatsApp.wabaId === 'string'
          ? apiKeys.metaWhatsApp.wabaId
          : decryptApiKeyServerSide(apiKeys.metaWhatsApp.wabaId))
      : '';

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'Meta WhatsApp not configured. Please add your Phone Number ID and Access Token in Settings.'
      };
    }

    if (!wabaId) {
      return {
        success: false,
        error: 'WABA ID required to fetch templates. Please add your WhatsApp Business Account ID in Settings.'
      };
    }

    const config: MetaWhatsAppConfig = {
      phoneNumberId,
      accessToken,
      wabaId
    };

    // Fetch templates
    return await getMetaWhatsAppTemplates(config);
  } catch (error) {
    console.error('Meta templates fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Validate Meta WhatsApp connection
 */
export async function validateMetaWhatsAppConnectionAction(idToken: string): Promise<{
  success: boolean;
  error?: string;
  details?: any;
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

    // Get company's Meta WhatsApp configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const phoneNumberId = apiKeys.metaWhatsApp?.phoneNumberId
      ? (typeof apiKeys.metaWhatsApp.phoneNumberId === 'string'
          ? apiKeys.metaWhatsApp.phoneNumberId
          : decryptApiKeyServerSide(apiKeys.metaWhatsApp.phoneNumberId))
      : '';

    const accessToken = apiKeys.metaWhatsApp?.accessToken
      ? decryptApiKeyServerSide(apiKeys.metaWhatsApp.accessToken)
      : '';

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'Meta WhatsApp not configured. Please add your Phone Number ID and Access Token in Settings.'
      };
    }

    const config: MetaWhatsAppConfig = {
      phoneNumberId,
      accessToken
    };

    return await validateMetaConnection(config);
  } catch (error) {
    console.error('Meta validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Send bulk WhatsApp messages via Meta Cloud API
 */
export async function sendBulkWhatsAppViaMetaAction(
  idToken: string,
  input: {
    templateName: string;
    languageCode: string;
    recipients: { phone: string; parameters?: string[] }[];
  }
): Promise<{
  success: boolean;
  totalSent?: number;
  totalFailed?: number;
  results?: { phone: string; messageId?: string; success: boolean; error?: string }[];
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

    // Get company's Meta WhatsApp configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const phoneNumberId = apiKeys.metaWhatsApp?.phoneNumberId
      ? (typeof apiKeys.metaWhatsApp.phoneNumberId === 'string'
          ? apiKeys.metaWhatsApp.phoneNumberId
          : decryptApiKeyServerSide(apiKeys.metaWhatsApp.phoneNumberId))
      : '';

    const accessToken = apiKeys.metaWhatsApp?.accessToken
      ? decryptApiKeyServerSide(apiKeys.metaWhatsApp.accessToken)
      : '';

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'Meta WhatsApp not configured. Please add your Phone Number ID and Access Token in Settings.'
      };
    }

    const config: MetaWhatsAppConfig = {
      phoneNumberId,
      accessToken
    };

    const result = await sendBulkMetaWhatsApp(config, input);

    return {
      success: result.success,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      results: result.results
    };
  } catch (error) {
    console.error('Meta bulk send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send messages'
    };
  }
}
