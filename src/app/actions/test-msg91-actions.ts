'use server';

/**
 * Test MSG91 SMS Action
 * Used for testing MSG91 DLT and transactional templates before production use
 */

import {
  sendBulkSMSMSG91,
  formatPhoneForMSG91,
  calculateSMSCount,
  type MSG91Config
} from '@/lib/msg91-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Test MSG91 SMS send
 */
export async function testMSG91SMSAction(input: {
  idToken: string;
  phoneNumber: string;
  message: string;
  messageType: 'promotional' | 'transactional';
  dltTemplateId?: string;
}): Promise<{
  success: boolean;
  requestId?: string;
  messageId?: string;
  smsCount?: number;
  apiResponse?: any;
  error?: string;
}> {
  try {
    const { idToken, phoneNumber, message, messageType, dltTemplateId } = input;

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

    if (!company?.apiKeys?.msg91) {
      return {
        success: false,
        error: 'MSG91 not configured. Please add your MSG91 API key in Settings → API Integrations.'
      };
    }

    // Decrypt API keys
    const config: MSG91Config = {
      authKey: decryptApiKeyServerSide(company.apiKeys.msg91.authKey),
      senderId: decryptApiKeyServerSide(company.apiKeys.msg91.senderId)
    };

    // Format and validate phone number
    const formattedPhone = formatPhoneForMSG91(phoneNumber);
    if (formattedPhone.length < 10) {
      return {
        success: false,
        error: `Invalid phone number. Expected 10+ digits, got ${formattedPhone.length}. Formatted: ${formattedPhone}`
      };
    }

    // Validate message
    if (!message || message.trim() === '') {
      return { success: false, error: 'Message is required' };
    }

    // For DLT, validate template ID
    if (messageType === 'promotional' && !dltTemplateId) {
      return { success: false, error: 'DLT Template ID is required for promotional messages' };
    }

    // Calculate SMS count
    const smsCount = calculateSMSCount(message, false);

    console.log('[TEST SMS MSG91] Sending test SMS:', {
      phone: formattedPhone,
      message,
      messageType,
      dltTemplateId,
      senderId: config.senderId,
      smsCount
    });

    // Send via MSG91
    const result = await sendBulkSMSMSG91(config, {
      message,
      recipients: [formattedPhone],
      route: messageType === 'promotional' ? 'promotional' : 'transactional',
      dltTemplateId: messageType === 'promotional' ? dltTemplateId : undefined
    });

    console.log('[TEST SMS MSG91] Response:', result);

    return {
      success: result.success,
      requestId: result.requestId,
      messageId: result.messageId,
      smsCount,
      apiResponse: result,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TEST SMS MSG91] Error:', error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
