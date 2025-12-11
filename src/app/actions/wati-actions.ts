'use server';

/**
 * WATI WhatsApp Business API Server Actions
 * Handles bulk WhatsApp messaging through WATI
 * Uses secure authentication with Firebase ID tokens
 */

import { getWATITemplates, sendBulkWhatsAppWATI, sendSingleWhatsAppWATI, validateWATIConnection, formatPhoneForWATI, type WATITemplate } from '@/lib/wati-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { delay } from '@/lib/batch-processor';

/**
 * Get all WhatsApp templates from WATI
 */
export async function getWATITemplatesAction(idToken: string): Promise<{
  success: boolean;
  templates?: WATITemplate[];
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
    
    if (!company?.apiKeys?.wati) {
      return { 
        success: false, 
        error: 'WATI not configured. Please add your WATI API key in Settings → API Integrations.' 
      };
    }

    // Decrypt API keys before using them
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.wati.apiKey),
      accountUrl: decryptApiKeyServerSide(company.apiKeys.wati.accountUrl)
    };

    return await getWATITemplates(config);
  } catch (error) {
    console.error('getWATITemplatesAction error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch templates' 
    };
  }
}

/**
 * Send bulk WhatsApp campaign via WATI
 */
export async function sendBulkWhatsAppViaWATIAction(input: {
  idToken: string;
  templateName: string;
  recipients: { phone: string; name?: string; variables?: Record<string, string> }[];
  broadcastName?: string;
}): Promise<{
  success: boolean;
  campaignId?: string;
  messageId?: string;
  error?: string;
  failedRecipients?: { phone: string; error: string }[];
}> {
  try {
    const { idToken, templateName, recipients, broadcastName } = input;

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
    
    if (!company?.apiKeys?.wati) {
      return { 
        success: false, 
        error: 'WATI not configured. Please add your WATI API key in Settings.' 
      };
    }

    // Decrypt API keys before using them
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.wati.apiKey),
      accountUrl: decryptApiKeyServerSide(company.apiKeys.wati.accountUrl)
    };

    // Use batch processing for large volumes (1000+ contacts)
    const BATCH_SIZE = 100; // Reduced from 5000 to prevent memory overload
    const DELAY_BETWEEN_BATCHES = 500;
    
    console.log(`[WHATSAPP WATI BATCH] Sending to ${recipients.length} contacts with batch processing`);

    const allFailedRecipients = [];
    let lastCampaignId = null;
    let lastMessageId = null;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[WHATSAPP WATI BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts, ${i + batch.length}/${recipients.length} total)`);

      const formattedBatch = batch.map(recipient => ({
        whatsappNumber: formatPhoneForWATI(recipient.phone),
        customParams: recipient.variables 
          ? Object.values(recipient.variables)
          : []
      }));

      const result = await sendBulkWhatsAppWATI(config, {
        templateName,
        recipients: formattedBatch,
        broadcastName: broadcastName || `Campaign ${new Date().toISOString()}`
      });

      if (result.success) {
        lastCampaignId = result.result?.id;
        lastMessageId = result.result?.id;
        
        if (result.result?.failed) {
          allFailedRecipients.push(...result.result.failed.map(f => ({
            phone: f.whatsappNumber,
            error: f.error
          })));
        }
      }

      // Add delay between batches (except after last batch)
      if (i + BATCH_SIZE < recipients.length) {
        console.log(`[WHATSAPP WATI BATCH] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    return {
      success: allFailedRecipients.length === 0,
      campaignId: lastCampaignId || undefined,
      messageId: lastMessageId || undefined,
      failedRecipients: allFailedRecipients.length > 0 ? allFailedRecipients : undefined,
      error: allFailedRecipients.length > 0 ? `${allFailedRecipients.length} messages failed` : undefined
    };
  } catch (error) {
    console.error('sendBulkWhatsAppViaWATIAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp campaign'
    };
  }
}

/**
 * Send test WhatsApp message via WATI
 */
export async function sendTestWhatsAppViaWATIAction(input: {
  idToken: string;
  templateName: string;
  phone: string;
  variables?: string[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, templateName, phone, variables } = input;

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
    
    if (!company?.apiKeys?.wati) {
      return { 
        success: false, 
        error: 'WATI not configured. Please add your WATI API key in Settings.' 
      };
    }

    // Decrypt API keys before using them
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.wati.apiKey),
      accountUrl: decryptApiKeyServerSide(company.apiKeys.wati.accountUrl)
    };

    const result = await sendSingleWhatsAppWATI(
      config,
      templateName,
      formatPhoneForWATI(phone),
      variables
    );

    return {
      success: result.success,
      error: result.error
    };
  } catch (error) {
    console.error('sendTestWhatsAppViaWATIAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test message'
    };
  }
}

/**
 * Validate WATI connection (for testing API keys before saving)
 */
export async function validateWATIConnectionAction(input: {
  apiKey: string;
  accountUrl: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Note: Validation action receives plaintext keys (not yet encrypted)
    const config = {
      apiKey: input.apiKey,
      accountUrl: input.accountUrl
    };

    return await validateWATIConnection(config);
  } catch (error) {
    console.error('validateWATIConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}
