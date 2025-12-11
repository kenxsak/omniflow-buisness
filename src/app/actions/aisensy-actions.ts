'use server';

/**
 * AiSensy WhatsApp Business API Server Actions
 * Handles bulk WhatsApp messaging through AiSensy (42% cheaper than WATI!)
 * Uses secure authentication with Firebase ID tokens
 */

import { sendBulkWhatsAppAiSensy, sendSingleWhatsAppAiSensy, validateAiSensyConnection, formatPhoneForAiSensy } from '@/lib/aisensy-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { delay } from '@/lib/batch-processor';

/**
 * Send bulk WhatsApp campaign via AiSensy
 */
export async function sendBulkWhatsAppViaAiSensyAction(input: {
  idToken: string;
  campaignName: string;
  recipients: { phone: string; name?: string; variables?: Record<string, string> }[];
}): Promise<{
  success: boolean;
  campaignId?: string;
  messageId?: string;
  error?: string;
  failedRecipients?: { phone: string; error: string }[];
}> {
  try {
    const { idToken, campaignName, recipients } = input;

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
    
    if (!company?.apiKeys?.aisensy) {
      return { 
        success: false, 
        error: 'AiSensy not configured. Please add your AiSensy API key in Settings.' 
      };
    }

    // Decrypt API keys before using them
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.aisensy.apiKey),
      campaignName: company.apiKeys.aisensy.campaignName 
        ? decryptApiKeyServerSide(company.apiKeys.aisensy.campaignName)
        : undefined
    };

    // Use batch processing for large volumes (1000+ contacts)
    const BATCH_SIZE = 100; // Reduced from 5000 to prevent memory overload
    const DELAY_BETWEEN_BATCHES = 500;
    
    console.log(`[WHATSAPP AISENSY BATCH] Sending to ${recipients.length} contacts with batch processing`);

    const allFailedRecipients = [];
    let lastCampaignId = null;
    let lastMessageId = null;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[WHATSAPP AISENSY BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts, ${i + batch.length}/${recipients.length} total)`);

      const formattedBatch = batch.map(recipient => ({
        whatsappNumber: formatPhoneForAiSensy(recipient.phone),
        userName: recipient.name || 'Customer',
        templateParams: recipient.variables 
          ? Object.values(recipient.variables)
          : []
      }));

      const result = await sendBulkWhatsAppAiSensy(config, {
        campaignName,
        recipients: formattedBatch,
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
        console.log(`[WHATSAPP AISENSY BATCH] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
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
    console.error('sendBulkWhatsAppViaAiSensyAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp campaign'
    };
  }
}

/**
 * Send test WhatsApp message via AiSensy
 */
export async function sendTestWhatsAppViaAiSensyAction(input: {
  idToken: string;
  campaignName: string;
  phone: string;
  name?: string;
  variables?: string[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, campaignName, phone, name, variables } = input;

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
    
    if (!company?.apiKeys?.aisensy) {
      return { 
        success: false, 
        error: 'AiSensy not configured. Please add your AiSensy API key in Settings.' 
      };
    }

    // Decrypt API keys before using them
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.aisensy.apiKey),
      campaignName: company.apiKeys.aisensy.campaignName 
        ? decryptApiKeyServerSide(company.apiKeys.aisensy.campaignName)
        : undefined
    };

    const result = await sendSingleWhatsAppAiSensy(
      config,
      campaignName,
      formatPhoneForAiSensy(phone),
      name || 'Customer',
      variables
    );

    return {
      success: result.success,
      error: result.error
    };
  } catch (error) {
    console.error('sendTestWhatsAppViaAiSensyAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test message'
    };
  }
}

/**
 * Validate AiSensy connection (for testing API keys before saving)
 */
export async function validateAiSensyConnectionAction(input: {
  apiKey: string;
  campaignName?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Note: Validation action receives plaintext keys (not yet encrypted)
    const config = {
      apiKey: input.apiKey,
      campaignName: input.campaignName
    };

    return await validateAiSensyConnection(config);
  } catch (error) {
    console.error('validateAiSensyConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}
