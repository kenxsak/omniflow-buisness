'use server';

/**
 * Fast2SMS Server Actions
 * Lightning-fast bulk SMS delivery in India
 */

import {
  sendBulkSMSFast2SMS,
  sendOTPFast2SMS,
  validateFast2SMSConnection,
  formatPhoneForFast2SMS,
  isUnicodeMessage,
  calculateSMSCount,
  estimateSMSCost,
  type Fast2SMSConfig
} from '@/lib/fast2sms-client';
import { getValueFromContact } from '@/lib/sms-templates-sync';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { processBatchSequentially, delay } from '@/lib/batch-processor';

// Constants for batch processing - optimized for memory efficiency
const BATCH_SIZE = 50; // Process 50 recipients per batch to avoid memory overload
const CONCURRENT_LIMIT = 5; // Maximum concurrent API calls within a batch
const DELAY_BETWEEN_BATCHES = 500; // 500ms delay between batches to avoid rate limiting

/**
 * Send bulk SMS via Fast2SMS with per-recipient personalization using names as variables
 */
export async function sendBulkSMSViaFast2SMSAction(input: {
  idToken: string;
  message: string;
  recipients: { phone: string; name?: string; [key: string]: any }[];
  route?: 'q' | 'dlt' | 'otp';
  dltTemplateId?: string;
  variables?: string;
  variableMappings?: Array<{ variableName: string; mappingType: 'contact_field' | 'static'; mappingValue?: string }>;
  scheduledTime?: number; // Unix timestamp for scheduling
}): Promise<{
  success: boolean;
  requestId?: string;
  message?: string[];
  smsCount?: number;
  estimatedCost?: number;
  scheduledAt?: string;
  error?: string;
}> {
  try {
    const { idToken, message, recipients, route, dltTemplateId, variables, variableMappings, scheduledTime } = input;

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

    if (!company?.apiKeys?.fast2sms) {
      return {
        success: false,
        error: 'Fast2SMS not configured. Please add your Fast2SMS API key in Settings → API Integrations.'
      };
    }

    // Decrypt API keys before using them
    const config: Fast2SMSConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
      senderId: company.apiKeys.fast2sms.senderId 
        ? decryptApiKeyServerSide(company.apiKeys.fast2sms.senderId)
        : undefined
    };

    // Validate DLT Template ID is provided for DLT route (required in India)
    if (route === 'dlt' && (!dltTemplateId || dltTemplateId.trim() === '')) {
      return {
        success: false,
        error: 'DLT Template ID is required for DLT route. Please register your template with TRAI DLT.'
      };
    }

    // For DLT route with template, send to each recipient with their name as personalization variable
    // Use memory-efficient batch processing with limited concurrency
    if (route === 'dlt' && dltTemplateId) {
      console.log('[BULK SMS DLT] Sending with per-recipient personalization to', recipients.length, 'contacts');
      
      // Validate and format all recipients first
      const validatedRecipients = recipients.map(recipient => {
        const formattedPhone = formatPhoneForFast2SMS(recipient.phone);
        return {
          ...recipient,
          formattedPhone,
          valid: formattedPhone.length === 10
        };
      });

      let totalSent = 0;
      let totalFailed = 0;
      let lastRequestId: string | undefined;

      // Process in small batches with limited concurrency to avoid memory overload
      for (let i = 0; i < validatedRecipients.length; i += BATCH_SIZE) {
        const batch = validatedRecipients.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(validatedRecipients.length / BATCH_SIZE);

        console.log(`[BULK SMS DLT BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`);

        try {
          // Process batch with limited concurrency to avoid memory overload
          for (let j = 0; j < batch.length; j += CONCURRENT_LIMIT) {
            const chunk = batch.slice(j, j + CONCURRENT_LIMIT);
            
            const chunkResults = await Promise.all(
              chunk.map(async (recipient) => {
                try {
                  if (!recipient.valid) {
                    return { success: false, error: 'Invalid phone format' };
                  }

                  let recipientVariables = '';
                  if (variableMappings && variableMappings.length > 0) {
                    const values = variableMappings.map(mapping => {
                      if (mapping.mappingType === 'static') {
                        return mapping.mappingValue || '';
                      } else {
                        return getValueFromContact(recipient as any, mapping.mappingValue, '');
                      }
                    });
                    recipientVariables = values.join('|');
                  } else {
                    recipientVariables = recipient.name || 'User';
                  }

                  const result = await sendBulkSMSFast2SMS(config, {
                    message: 'template',
                    recipients: [recipient.formattedPhone],
                    route: 'dlt',
                    dltTemplateId,
                    variables: recipientVariables,
                    scheduledTime: scheduledTime
                  });

                  if (result.success) {
                    totalSent++;
                    if (result.requestId) lastRequestId = result.requestId;
                  } else {
                    totalFailed++;
                  }

                  return { success: result.success, error: result.error };
                } catch (error) {
                  totalFailed++;
                  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                }
              })
            );
            
            // Small delay between chunks within a batch
            if (j + CONCURRENT_LIMIT < batch.length) {
              await delay(100);
            }
          }

          // Add delay between batches
          if (i + BATCH_SIZE < validatedRecipients.length) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        } catch (error) {
          console.error(`[BULK SMS DLT BATCH] Error in batch ${batchNumber}:`, error);
          throw error;
        }
      }

      // Estimate cost for DLT - Fast2SMS DLT typically costs ₹0.15-0.20 per SMS
      const costPerSMS = 0.25; // Average estimate
      const estimatedCost = costPerSMS * validatedRecipients.length;

      const allSuccess = totalFailed === 0;
      
      return {
        success: allSuccess,
        message: [`Bulk SMS sent to ${validatedRecipients.length} contacts (Batched processing: ${Math.ceil(validatedRecipients.length / BATCH_SIZE)} batches)`],
        requestId: lastRequestId,
        estimatedCost: estimatedCost,
        scheduledAt: scheduledTime ? new Date(scheduledTime * 1000).toISOString() : undefined,
        error: allSuccess ? undefined : `Sent: ${totalSent}, Failed: ${totalFailed}`
      };
    }

    // For non-DLT routes (Quick SMS), handle with personalization
    console.log('[BULK SMS QUICK] Sending Quick SMS to', recipients.length, 'contacts with personalization');
    
    // For Quick SMS, we need to replace variables in the message for each recipient
    const validatedRecipients = recipients.map(r => {
      const formattedPhone = formatPhoneForFast2SMS(r.phone);
      return {
        ...r,
        formattedPhone,
        valid: formattedPhone.length === 10
      };
    });

    let totalSent = 0;
    let totalFailed = 0;
    let lastRequestId: string | undefined;

    // Process in batches for Quick SMS with memory-efficient chunking
    for (let i = 0; i < validatedRecipients.length; i += BATCH_SIZE) {
      const batch = validatedRecipients.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validatedRecipients.length / BATCH_SIZE);

      console.log(`[BULK SMS QUICK BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`);

      try {
        // Process batch with limited concurrency
        for (let j = 0; j < batch.length; j += CONCURRENT_LIMIT) {
          const chunk = batch.slice(j, j + CONCURRENT_LIMIT);
          
          await Promise.all(
            chunk.map(async (recipient) => {
              try {
                if (!recipient.valid) {
                  totalFailed++;
                  return;
                }

                let personalizedMessage = message;
                const fieldRegex = /\{(\w+)\}/g;
                personalizedMessage = personalizedMessage.replace(fieldRegex, (match, fieldName) => {
                  const value = recipient[fieldName as keyof typeof recipient];
                  return value ? String(value) : match;
                });

                const result = await sendBulkSMSFast2SMS(config, {
                  message: personalizedMessage,
                  recipients: [recipient.formattedPhone],
                  route: 'q',
                  scheduledTime: scheduledTime
                });

                if (result.success) {
                  totalSent++;
                  if (result.requestId) lastRequestId = result.requestId;
                } else {
                  totalFailed++;
                }
              } catch (error) {
                totalFailed++;
              }
            })
          );
          
          // Small delay between chunks
          if (j + CONCURRENT_LIMIT < batch.length) {
            await delay(100);
          }
        }

        // Add delay between batches
        if (i + BATCH_SIZE < validatedRecipients.length) {
          await delay(DELAY_BETWEEN_BATCHES);
        }
      } catch (error) {
        console.error(`[BULK SMS QUICK BATCH] Error in batch ${batchNumber}:`, error);
        throw error;
      }
    }

    // Check if message is Unicode
    const unicode = isUnicodeMessage(message);

    // Calculate SMS count
    const smsCount = calculateSMSCount(message, unicode);

    // Estimate cost (Fast2SMS Quick SMS is ₹5 per SMS)
    const costPerSMS = 5.00;
    const estimatedCost = estimateSMSCost(smsCount, validatedRecipients.length, costPerSMS);

    const allSuccess = totalFailed === 0;

    return {
      success: allSuccess,
      message: [`Quick SMS sent to ${validatedRecipients.length} contacts (Batched: ${Math.ceil(validatedRecipients.length / BATCH_SIZE)} batches)`],
      requestId: lastRequestId,
      estimatedCost: estimatedCost,
      scheduledAt: scheduledTime ? new Date(scheduledTime * 1000).toISOString() : undefined,
      error: allSuccess ? undefined : `Sent: ${totalSent}, Failed: ${totalFailed}`
    };
  } catch (error) {
    console.error('sendBulkSMSViaFast2SMSAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS campaign via Fast2SMS'
    };
  }
}

/**
 * Send OTP via Fast2SMS
 */
export async function sendOTPViaFast2SMSAction(input: {
  idToken: string;
  phone: string;
  otp: string;
}): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> {
  try {
    const { idToken, phone, otp } = input;

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

    if (!company?.apiKeys?.fast2sms) {
      return {
        success: false,
        error: 'Fast2SMS not configured. Please add your API key in Settings.'
      };
    }

    // Decrypt API keys
    const config: Fast2SMSConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
      senderId: company.apiKeys.fast2sms.senderId
        ? decryptApiKeyServerSide(company.apiKeys.fast2sms.senderId)
        : undefined
    };

    // Send OTP
    const result = await sendOTPFast2SMS(config, phone, otp);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      requestId: result.requestId
    };
  } catch (error) {
    console.error('sendOTPViaFast2SMSAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP via Fast2SMS'
    };
  }
}

/**
 * Validate Fast2SMS connection
 */
export async function validateFast2SMSConnectionAction(
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

    if (!company?.apiKeys?.fast2sms) {
      return {
        success: false,
        error: 'Fast2SMS not configured. Please add your API key in Settings.'
      };
    }

    // Decrypt API keys
    const config: Fast2SMSConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
      senderId: company.apiKeys.fast2sms.senderId
        ? decryptApiKeyServerSide(company.apiKeys.fast2sms.senderId)
        : undefined
    };

    // Validate connection
    return await validateFast2SMSConnection(config);
  } catch (error) {
    console.error('validateFast2SMSConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate Fast2SMS connection'
    };
  }
}
