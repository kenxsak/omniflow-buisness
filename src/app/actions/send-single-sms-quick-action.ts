'use server';

/**
 * Send a single SMS via Fast2SMS Quick SMS mode
 * For immediate sending of any message (AI-generated, test messages, etc.)
 * No template approval needed - works immediately but at higher cost
 */

import { sendBulkSMSFast2SMS, formatPhoneForFast2SMS } from '@/lib/fast2sms-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

export async function sendSingleSmsQuickAction(input: {
  idToken: string;
  toPhoneNumber: string;
  message: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  platform?: string;
}> {
  try {
    const { idToken, toPhoneNumber, message } = input;

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

    if (!company?.apiKeys?.fast2sms) {
      return {
        success: false,
        error: 'Fast2SMS not configured. Please add your Fast2SMS API key in Settings → API Integrations.'
      };
    }

    // Format phone number to Fast2SMS format (10-digit number)
    const formattedPhone = formatPhoneForFast2SMS(toPhoneNumber);
    console.log(`📱 Sending Quick SMS to ${toPhoneNumber} → formatted as ${formattedPhone}`);

    // Send via Fast2SMS Quick SMS (route='q') - no templates needed, any message works
    const result = await sendBulkSMSFast2SMS(
      {
        apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
        senderId: company.apiKeys.fast2sms.senderId 
          ? decryptApiKeyServerSide(company.apiKeys.fast2sms.senderId)
          : undefined
      },
      {
        recipients: [formattedPhone], // Array of phone numbers (strings)
        message: message,
        route: 'q', // Quick SMS - no template needed
      }
    );

    if (result.success) {
      console.log(`✅ Quick SMS sent successfully`);
      return {
        success: true,
        messageId: result.requestId,
        platform: 'Fast2SMS (Quick SMS)'
      };
    } else {
      console.error(`❌ Quick SMS failed:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to send Quick SMS'
      };
    }
  } catch (error: any) {
    console.error('❌ Error in sendSingleSmsQuickAction:', error);
    return {
      success: false,
      error: error.message || 'Internal server error'
    };
  }
}
