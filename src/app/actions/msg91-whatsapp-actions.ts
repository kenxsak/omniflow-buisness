'use server';

/**
 * MSG91 WhatsApp Business API Server Actions
 * Zero markup pricing for Indian SMEs
 * Uses secure authentication with Firebase ID tokens
 */

import {
  sendBulkMSG91WhatsApp,
  validateMSG91WhatsAppConnection,
  getMSG91WhatsAppTemplates,
  type MSG91WhatsAppConfig,
  type MSG91WhatsAppTemplate
} from '@/lib/msg91-whatsapp-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { delay } from '@/lib/batch-processor';

/**
 * Get WhatsApp templates from MSG91
 */
export async function getMSG91WhatsAppTemplatesAction(idToken: string): Promise<{
  success: boolean;
  templates?: MSG91WhatsAppTemplate[];
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

    const authKey = apiKeys.msg91WhatsApp?.authKey
      ? decryptApiKeyServerSide(apiKeys.msg91WhatsApp.authKey)
      : '';

    const integratedNumber = apiKeys.msg91WhatsApp?.integratedNumber
      ? decryptApiKeyServerSide(apiKeys.msg91WhatsApp.integratedNumber)
      : '';

    if (!authKey || !integratedNumber) {
      return {
        success: false,
        error: 'MSG91 WhatsApp not configured. Please add your Auth Key and WhatsApp Business Number in Settings.'
      };
    }

    const config: MSG91WhatsAppConfig = { authKey, integratedNumber };

    return await getMSG91WhatsAppTemplates(config);
  } catch (error) {
    console.error('MSG91 WhatsApp templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Send bulk WhatsApp campaign via MSG91
 */
export async function sendBulkWhatsAppViaMSG91Action(input: {
  idToken: string;
  templateName: string;
  languageCode: string;
  recipients: { phone: string; name?: string; parameters?: string[] }[];
}): Promise<{
  success: boolean;
  totalSent?: number;
  totalFailed?: number;
  error?: string;
  results?: { phone: string; success: boolean; messageId?: string; error?: string }[];
}> {
  try {
    const { idToken, templateName, languageCode, recipients } = input;

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

    if (!company?.apiKeys?.msg91WhatsApp) {
      return {
        success: false,
        error: 'MSG91 WhatsApp not configured. Please add your credentials in Settings.'
      };
    }

    const config: MSG91WhatsAppConfig = {
      authKey: decryptApiKeyServerSide(company.apiKeys.msg91WhatsApp.authKey),
      integratedNumber: decryptApiKeyServerSide(company.apiKeys.msg91WhatsApp.integratedNumber)
    };

    // Use batch processing for large volumes (1000+ contacts)
    const BATCH_SIZE = 5000;
    const DELAY_BETWEEN_BATCHES = 1000;
    
    console.log(`[WHATSAPP MSG91 BATCH] Sending to ${recipients.length} contacts with batch processing`);

    const allResults: { phone: string; success: boolean; messageId?: string; error?: string }[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[WHATSAPP MSG91 BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts, ${i + batch.length}/${recipients.length} total)`);

      const formattedBatch = batch.map(recipient => ({
        phone: recipient.phone,
        parameters: recipient.parameters
      }));

      const result = await sendBulkMSG91WhatsApp(config, {
        templateName,
        languageCode,
        recipients: formattedBatch
      });

      if (result.success) {
        totalSent += result.totalSent || 0;
        if (result.results) {
          allResults.push(...result.results);
        }
      }
      
      totalFailed += result.totalFailed || 0;

      // Add delay between batches (except after last batch)
      if (i + BATCH_SIZE < recipients.length) {
        console.log(`[WHATSAPP MSG91 BATCH] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
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
    console.error('sendBulkWhatsAppViaMSG91Action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp messages'
    };
  }
}

/**
 * Validate MSG91 WhatsApp connection
 */
export async function validateMSG91WhatsAppConnectionAction(idToken: string): Promise<{
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

    const authKey = apiKeys.msg91WhatsApp?.authKey
      ? decryptApiKeyServerSide(apiKeys.msg91WhatsApp.authKey)
      : '';

    const integratedNumber = apiKeys.msg91WhatsApp?.integratedNumber
      ? decryptApiKeyServerSide(apiKeys.msg91WhatsApp.integratedNumber)
      : '';

    if (!authKey || !integratedNumber) {
      return {
        success: false,
        error: 'Please provide both Auth Key and WhatsApp Business Number'
      };
    }

    const config: MSG91WhatsAppConfig = { authKey, integratedNumber };

    return await validateMSG91WhatsAppConnection(config);
  } catch (error) {
    console.error('Validate MSG91 WhatsApp error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}
