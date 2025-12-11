'use server';

import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { sendBulkSMSMSG91, formatPhoneForMSG91 } from '@/lib/msg91-client';

/**
 * Send a single SMS via MSG91 platform
 * For quick testing and individual messages
 */
export async function sendSingleSmsAction(input: {
  idToken: string;
  toPhoneNumber: string;
  message: string;
  dltTemplateId: string; // TRAI DLT Template ID - Required for India
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  platform?: string;
}> {
  try {
    const { idToken, toPhoneNumber, message, dltTemplateId } = input;

    if (!dltTemplateId || !dltTemplateId.trim()) {
      return { success: false, error: 'TRAI DLT Template ID is required for India' };
    }

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

    if (!company?.apiKeys?.msg91?.authKey) {
      return {
        success: false,
        error: 'MSG91 not configured. Please add your MSG91 API key in Settings → API Integrations.'
      };
    }

    // Decrypt API key
    const authKey = decryptApiKeyServerSide(company.apiKeys.msg91.authKey);
    
    // Get senderId from company config
    const senderId = company.apiKeys.msg91.senderId || 'OmniFlow';
    
    // Format phone number to MSG91 format (remove +, spaces, etc.)
    const formattedPhone = formatPhoneForMSG91(toPhoneNumber);
    console.log(`📱 Sending SMS to ${toPhoneNumber} → formatted as ${formattedPhone}`);

    // Send via MSG91 with DLT template (TRAI compliant)
    const result = await sendBulkSMSMSG91(
      {
        authKey,
        senderId,
      },
      {
        recipients: [formattedPhone],
        message: message,
        dltTemplateId: dltTemplateId,
        route: 'transactional',
      }
    );

    if (result.success) {
      return {
        success: true,
        messageId: result.requestId || 'sent',
        platform: 'MSG91'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send SMS',
        platform: 'MSG91'
      };
    }
  } catch (error) {
    console.error('sendSingleSmsAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}
