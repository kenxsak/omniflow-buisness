'use server';

/**
 * Twilio SMS Bulk Action with Batch Processing
 * Sends bulk SMS via Twilio with 1000-contact batches
 */

import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { delay } from '@/lib/batch-processor';
import { sendTwilioSMS, type TwilioConfig } from '@/lib/twilio-sms-client';

export async function sendBulkSMSViaTwilioAction(input: {
  idToken: string;
  message: string;
  recipients: { phone: string; name?: string }[];
}): Promise<{
  success: boolean;
  totalSent?: number;
  totalFailed?: number;
  error?: string;
  estimatedCost?: number;
}> {
  try {
    const { idToken, message, recipients } = input;

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

    if (!company?.apiKeys?.twilio) {
      return {
        success: false,
        error: 'Twilio not configured. Please add your Twilio credentials in Settings → API Integrations.'
      };
    }

    // Decrypt API keys
    const config: TwilioConfig = {
      accountSid: decryptApiKeyServerSide(company.apiKeys.twilio.accountSid),
      authToken: decryptApiKeyServerSide(company.apiKeys.twilio.authToken),
      fromPhoneNumber: decryptApiKeyServerSide(company.apiKeys.twilio.fromPhoneNumber)
    };

    // Batch processing
    const BATCH_SIZE = 1000;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second
    
    console.log(`[SMS TWILIO BATCH] Sending to ${recipients.length} contacts with batch processing`);

    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[SMS TWILIO BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts, ${i + batch.length}/${recipients.length} total)`);

      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          try {
            const result = await sendTwilioSMS(config, {
              toPhoneNumber: recipient.phone,
              message: message
            });

            if (result.success) {
              totalSent++;
              return { success: true };
            } else {
              totalFailed++;
              return { success: false, error: result.error };
            }
          } catch (error) {
            totalFailed++;
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      // Add delay between batches (except after last batch)
      if (i + BATCH_SIZE < recipients.length) {
        console.log(`[SMS TWILIO BATCH] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // HIDDEN: Cost calculation (affiliate model - no markup shown to users)
    // const costPerSMS = 1.50;
    // const estimatedCost = costPerSMS * recipients.length;

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      // HIDDEN: estimatedCost,
      error: totalFailed > 0 ? `Some messages failed` : undefined
    };
  } catch (error) {
    console.error('sendBulkSMSViaTwilioAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS via Twilio'
    };
  }
}
