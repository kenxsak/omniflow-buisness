'use server';

/**
 * Authkey WhatsApp & Multi-Channel API Server Actions
 * Pay-as-you-go pricing with no monthly fees
 */

import {
  sendBulkAuthkeyWhatsApp,
  validateAuthkeyConnection,
  sendAuthkeySMS,
  getAuthkeyTemplates,
  type AuthkeyConfig,
  type AuthkeyWhatsAppTemplate
} from '@/lib/authkey-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Get WhatsApp templates from Authkey
 * NOTE: Authkey does not provide an API to fetch templates
 */
export async function getAuthkeyTemplatesAction(idToken: string): Promise<{
  success: boolean;
  templates?: AuthkeyWhatsAppTemplate[];
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

    // Get company's Authkey configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.authkey?.apiKey
      ? decryptApiKeyServerSide(apiKeys.authkey.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Authkey API Key not configured. Please add your API key in Settings.'
      };
    }

    const config: AuthkeyConfig = { apiKey };

    return await getAuthkeyTemplates(config);
  } catch (error) {
    console.error('Authkey templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Validate Authkey connection
 */
export async function validateAuthkeyConnectionAction(idToken: string): Promise<{
  success: boolean;
  error?: string;
  balance?: number;
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

    // Get company's Authkey configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.authkey?.apiKey
      ? decryptApiKeyServerSide(apiKeys.authkey.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Authkey API Key not configured'
      };
    }

    const config: AuthkeyConfig = { apiKey };

    return await validateAuthkeyConnection(config);
  } catch (error) {
    console.error('Authkey validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Send bulk WhatsApp messages via Authkey
 */
export async function sendBulkWhatsAppViaAuthkeyAction(
  idToken: string,
  input: {
    templateName: string;
    templateType?: 'text' | 'media';
    headerImageUrl?: string;
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

    // Get company's Authkey configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.authkey?.apiKey
      ? decryptApiKeyServerSide(apiKeys.authkey.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Authkey not configured'
      };
    }

    const config: AuthkeyConfig = { apiKey };

    const result = await sendBulkAuthkeyWhatsApp(config, {
      templateName: input.templateName,
      templateType: input.templateType,
      headerImageUrl: input.headerImageUrl,
      recipients: input.recipients
    });

    return {
      success: result.success,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      results: result.results
    };
  } catch (error) {
    console.error('Authkey bulk send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send messages'
    };
  }
}

/**
 * Save template media URL for later use
 * Stores the media URL associated with a template so users don't have to copy-paste each time
 */
export async function saveTemplateMediaUrlAction(
  idToken: string,
  templateId: string,
  mediaUrl: string
): Promise<{
  success: boolean;
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

    // Save template media URL under company's templateMediaUrls collection
    await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('templateMediaUrls')
      .doc(templateId)
      .set({
        templateId,
        mediaUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: authResult.uid
      }, { merge: true });

    console.log('[Authkey] Saved template media URL:', { companyId, templateId, mediaUrl: mediaUrl.substring(0, 50) + '...' });

    return { success: true };
  } catch (error) {
    console.error('Save template media URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save media URL'
    };
  }
}

/**
 * Get all saved template media URLs for the company
 */
export async function getTemplateMediaUrlsAction(
  idToken: string
): Promise<{
  success: boolean;
  mediaUrls?: Record<string, string>;
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

    // Get all saved template media URLs
    const mediaUrlsSnapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('templateMediaUrls')
      .get();

    const mediaUrls: Record<string, string> = {};
    mediaUrlsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.templateId && data.mediaUrl) {
        mediaUrls[data.templateId] = data.mediaUrl;
      }
    });

    console.log('[Authkey] Loaded', Object.keys(mediaUrls).length, 'saved template media URLs');

    return { success: true, mediaUrls };
  } catch (error) {
    console.error('Get template media URLs error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load media URLs'
    };
  }
}

/**
 * Send SMS via Authkey (bonus feature)
 */
export async function sendSMSViaAuthkeyAction(
  idToken: string,
  input: {
    to: string;
    message: string;
    senderId?: string;
  }
): Promise<{
  success: boolean;
  messageId?: string;
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

    // Get company's Authkey configuration
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.authkey?.apiKey
      ? decryptApiKeyServerSide(apiKeys.authkey.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Authkey not configured'
      };
    }

    const config: AuthkeyConfig = { apiKey };

    return await sendAuthkeySMS(config, input);
  } catch (error) {
    console.error('Authkey SMS send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}
