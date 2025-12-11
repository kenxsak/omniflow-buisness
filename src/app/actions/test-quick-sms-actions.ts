'use server';

/**
 * Test Quick SMS Action (Fast2SMS Custom Text)
 * Used for testing Fast2SMS Quick SMS route before production use
 */

import {
  sendBulkSMSFast2SMS,
  formatPhoneForFast2SMS,
  calculateSMSCount,
  type Fast2SMSConfig
} from '@/lib/fast2sms-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Test Fast2SMS Quick SMS send (custom message, no template)
 */
export async function testQuickSMSFast2SMSAction(input: {
  idToken: string;
  phoneNumber: string;
  message: string;
}): Promise<{
  success: boolean;
  requestId?: string;
  message?: string[];
  smsCount?: number;
  estimatedCost?: number;
  apiResponse?: any;
  error?: string;
}> {
  try {
    const { idToken, phoneNumber, message } = input;

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

    // Decrypt API keys
    const config: Fast2SMSConfig = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
      senderId: company.apiKeys.fast2sms.senderId 
        ? decryptApiKeyServerSide(company.apiKeys.fast2sms.senderId)
        : undefined
    };

    // Format and validate phone number
    const formattedPhone = formatPhoneForFast2SMS(phoneNumber);
    if (formattedPhone.length !== 10) {
      return {
        success: false,
        error: `Invalid phone number. Expected 10 digits, got ${formattedPhone.length}. Formatted: ${formattedPhone}`
      };
    }

    // Validate message
    if (!message || message.trim() === '') {
      return { success: false, error: 'Message is required' };
    }

    // Calculate SMS count
    const smsCount = calculateSMSCount(message, false);

    // Estimate cost (Quick SMS is ₹5.00 per SMS)
    const costPerSMS = 5.00;
    const estimatedCost = smsCount * costPerSMS;

    console.log('[TEST SMS QUICK] Sending test Quick SMS:', {
      phone: formattedPhone,
      message,
      smsCount,
      estimatedCost,
      senderId: config.senderId
    });

    // Send via Fast2SMS Quick route
    const result = await sendBulkSMSFast2SMS(config, {
      message,
      recipients: [formattedPhone],
      route: 'q' // Quick SMS route
    });

    console.log('[TEST SMS QUICK] Response:', result);

    return {
      success: result.success,
      requestId: result.requestId,
      message: result.message,
      smsCount,
      estimatedCost,
      apiResponse: result,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TEST SMS QUICK] Error:', error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
