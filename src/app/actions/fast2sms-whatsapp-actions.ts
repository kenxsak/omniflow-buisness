'use server';

/**
 * Fast2SMS WhatsApp Business API Server Actions
 * Zero setup fee, pay only for delivered messages
 * Uses secure authentication with Firebase ID tokens
 */

import {
  sendBulkFast2SMSWhatsApp,
  validateFast2SMSWhatsAppConnection,
  getFast2SMSWhatsAppTemplates,
  type Fast2SMSWhatsAppConfig,
  type Fast2SMSWhatsAppTemplate
} from '@/lib/fast2sms-whatsapp-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { delay } from '@/lib/batch-processor';

/**
 * Get WhatsApp templates from Fast2SMS
 */
export async function getFast2SMSWhatsAppTemplatesAction(idToken: string): Promise<{
  success: boolean;
  templates?: Fast2SMSWhatsAppTemplate[];
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

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User company not found' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.fast2smsWhatsApp?.apiKey
      ? decryptApiKeyServerSide(apiKeys.fast2smsWhatsApp.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Fast2SMS WhatsApp not configured. Please add your API key in Settings.'
      };
    }

    const config: Fast2SMSWhatsAppConfig = { apiKey };

    return await getFast2SMSWhatsAppTemplates(config);
  } catch (error) {
    console.error('Fast2SMS WhatsApp templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Send bulk WhatsApp campaign via Fast2SMS
 */
export async function sendBulkWhatsAppViaFast2SMSAction(input: {
  idToken: string;
  templateName: string;
  recipients: { phone: string; name?: string; parameters?: string[] }[];
}): Promise<{
  success: boolean;
  totalSent?: number;
  totalFailed?: number;
  error?: string;
  results?: { phone: string; success: boolean; messageId?: string; error?: string }[];
}> {
  try {
    const { idToken, templateName, recipients } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.fast2smsWhatsApp) {
      return {
        success: false,
        error: 'Fast2SMS WhatsApp not configured. Please add your API key in Settings.'
      };
    }

    const config: Fast2SMSWhatsAppConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2smsWhatsApp.apiKey)
    };

    // Use batch processing for large volumes (1000+ contacts)
    const BATCH_SIZE = 100; // Reduced from 5000 to prevent memory overload
    const DELAY_BETWEEN_BATCHES = 500;
    
    console.log(`[WHATSAPP FAST2SMS BATCH] Sending to ${recipients.length} contacts with batch processing`);

    const allResults: { phone: string; success: boolean; messageId?: string; error?: string }[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[WHATSAPP FAST2SMS BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts, ${i + batch.length}/${recipients.length} total)`);

      const formattedBatch = batch.map(recipient => ({
        phone: recipient.phone,
        parameters: recipient.parameters
      }));

      const result = await sendBulkFast2SMSWhatsApp(config, {
        templateName,
        recipients: formattedBatch
      });

      if (result.success) {
        totalSent += batch.length;
        if (result.results) {
          allResults.push(...result.results);
        }
      } else {
        totalFailed += batch.length;
      }

      // Add delay between batches (except after last batch)
      if (i + BATCH_SIZE < recipients.length) {
        console.log(`[WHATSAPP FAST2SMS BATCH] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      results: allResults,
      error: totalFailed > 0 ? `Some messages failed` : undefined
    };
  } catch (error) {
    console.error('sendBulkWhatsAppViaFast2SMSAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp messages'
    };
  }
}

/**
 * Validate Fast2SMS WhatsApp connection
 */
export async function validateFast2SMSWhatsAppConnectionAction(idToken: string): Promise<{
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

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User company not found' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const apiKeys = companyData?.apiKeys || {};

    const apiKey = apiKeys.fast2smsWhatsApp?.apiKey
      ? decryptApiKeyServerSide(apiKeys.fast2smsWhatsApp.apiKey)
      : '';

    if (!apiKey) {
      return {
        success: false,
        error: 'Please provide Fast2SMS WhatsApp API Key'
      };
    }

    const config: Fast2SMSWhatsAppConfig = { apiKey };

    return await validateFast2SMSWhatsAppConnection(config);
  } catch (error) {
    console.error('Validate Fast2SMS WhatsApp error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}
