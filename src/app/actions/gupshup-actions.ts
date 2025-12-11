'use server';

/**
 * Gupshup WhatsApp Business API Server Actions
 * Enterprise-grade WhatsApp platform with advanced automation
 */

import {
  sendTemplateMessageGupshup,
  sendBulkWhatsAppGupshup,
  getGupshupTemplates,
  validateGupshupConnection,
  formatPhoneForGupshup,
  type GupshupConfig,
  type GupshupTemplate
} from '@/lib/gupshup-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Get Gupshup templates
 */
export async function getGupshupTemplatesAction(
  idToken: string
): Promise<{
  success: boolean;
  templates?: GupshupTemplate[];
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

    // Get user to retrieve companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' };
    }

    // Get company data
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.gupshup) {
      return {
        success: false,
        error: 'Gupshup not configured. Please add your Gupshup API key in Settings → API Integrations.'
      };
    }

    // Decrypt API keys
    const config: GupshupConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.gupshup.apiKey),
      appName: decryptApiKeyServerSide(company.apiKeys.gupshup.appName),
      srcName: company.apiKeys.gupshup.srcName ? decryptApiKeyServerSide(company.apiKeys.gupshup.srcName) : undefined
    };

    return await getGupshupTemplates(config);
  } catch (error) {
    console.error('getGupshupTemplatesAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Send bulk WhatsApp campaign via Gupshup
 */
export async function sendBulkWhatsAppViaGupshupAction(input: {
  idToken: string;
  source: string; // Business phone number
  templateId: string;
  recipients: Array<{ phone: string; name?: string; params?: string[] }>;
  mediaType?: 'image' | 'video' | 'document';
  mediaUrl?: string;
  filename?: string;
}): Promise<{
  success: boolean;
  results?: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  successCount?: number;
  failCount?: number;
  error?: string;
}> {
  try {
    const { idToken, source, templateId, recipients, mediaType, mediaUrl, filename } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user to retrieve companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' };
    }

    // Get company data
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.gupshup) {
      return {
        success: false,
        error: 'Gupshup not configured. Please add your Gupshup API key and app name in Settings → API Integrations.'
      };
    }

    // Decrypt API keys
    const config: GupshupConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.gupshup.apiKey),
      appName: decryptApiKeyServerSide(company.apiKeys.gupshup.appName),
      srcName: company.apiKeys.gupshup.srcName ? decryptApiKeyServerSide(company.apiKeys.gupshup.srcName) : undefined
    };

    // Send bulk messages
    console.log('[DEBUG] Raw recipients received:', JSON.stringify(recipients, null, 2));
    const mappedRecipients = recipients.map(r => {
      // Fix: Empty array is truthy, so check length
      const derivedParams = (r.params && r.params.length > 0) ? r.params : [r.name?.trim() || 'there'];
      console.log(`[DEBUG] Mapping recipient: phone=${r.phone}, name=${r.name}, params=${JSON.stringify(derivedParams)}`);
      return {
        phone: r.phone,
        params: derivedParams
      };
    });
    console.log('[DEBUG] Mapped recipients:', JSON.stringify(mappedRecipients, null, 2));
    
    const result = await sendBulkWhatsAppGupshup(config, {
      source,
      templateId,
      recipients: mappedRecipients,
      mediaType,
      mediaUrl,
      filename
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    // Calculate success and fail counts
    const successCount = result.results?.filter(r => r.success).length || 0;
    const failCount = result.results?.filter(r => !r.success).length || 0;

    return {
      success: true,
      results: result.results,
      successCount,
      failCount
    };
  } catch (error) {
    console.error('sendBulkWhatsAppViaGupshupAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp campaign via Gupshup'
    };
  }
}

/**
 * Send single WhatsApp message via Gupshup
 */
export async function sendSingleWhatsAppViaGupshupAction(input: {
  idToken: string;
  source: string;
  destination: string;
  templateId: string;
  params?: string[];
  mediaType?: 'image' | 'video' | 'document';
  mediaUrl?: string;
  filename?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}> {
  try {
    const { idToken, source, destination, templateId, params, mediaType, mediaUrl, filename } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user to retrieve companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' };
    }

    // Get company data
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.gupshup) {
      return {
        success: false,
        error: 'Gupshup not configured. Please add your API key in Settings.'
      };
    }

    // Decrypt API keys
    const config: GupshupConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.gupshup.apiKey),
      appName: decryptApiKeyServerSide(company.apiKeys.gupshup.appName),
      srcName: company.apiKeys.gupshup.srcName ? decryptApiKeyServerSide(company.apiKeys.gupshup.srcName) : undefined
    };

    // Send message
    const result = await sendTemplateMessageGupshup(config, {
      source,
      destination,
      templateId,
      params,
      mediaType,
      mediaUrl,
      filename
    });

    return result;
  } catch (error) {
    console.error('sendSingleWhatsAppViaGupshupAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message via Gupshup'
    };
  }
}

/**
 * Validate Gupshup connection
 */
export async function validateGupshupConnectionAction(
  idToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user to retrieve companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' };
    }

    // Get company data
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.gupshup) {
      return {
        success: false,
        error: 'Gupshup not configured. Please add your API key in Settings.'
      };
    }

    // Decrypt API keys
    const config: GupshupConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.gupshup.apiKey),
      appName: decryptApiKeyServerSide(company.apiKeys.gupshup.appName),
      srcName: company.apiKeys.gupshup.srcName ? decryptApiKeyServerSide(company.apiKeys.gupshup.srcName) : undefined
    };

    // Validate connection
    return await validateGupshupConnection(config);
  } catch (error) {
    console.error('validateGupshupConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate Gupshup connection'
    };
  }
}
