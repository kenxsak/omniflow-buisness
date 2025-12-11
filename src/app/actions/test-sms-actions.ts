'use server';

/**
 * Test SMS Action for Fast2SMS DLT
 * Used for testing transactional templates before production use
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
 * Test Fast2SMS DLT SMS with multiple recipients and personalized variables
 * Perfect for testing customer name personalization before bulk campaigns
 */
export async function testFast2SMSBulkDLTAction(input: {
  idToken: string;
  recipients: Array<{ phone: string; name: string }>;
  templateId: string;
}): Promise<{
  success: boolean;
  results: Array<{ phone: string; name: string; success: boolean; requestId?: string; error?: string }>;
  error?: string;
}> {
  try {
    const { idToken, recipients, templateId } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, results: [], error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, results: [], error: 'Database not initialized' };
    }

    // Get user to retrieve companyId
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, results: [], error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, results: [], error: 'User is not associated with a company' };
    }

    // Get company data
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, results: [], error: 'Company not found' };
    }

    const company = companyDoc.data();

    if (!company?.apiKeys?.fast2sms) {
      return {
        success: false,
        results: [],
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

    // Validate template ID
    if (!templateId || templateId.trim() === '') {
      return { success: false, results: [], error: 'Template ID is required' };
    }

    // Send to each recipient with their personalized name
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const formattedPhone = formatPhoneForFast2SMS(recipient.phone);
          
          if (formattedPhone.length !== 10) {
            return {
              phone: recipient.phone,
              name: recipient.name,
              success: false,
              error: `Invalid phone number format (expected 10 digits, got ${formattedPhone.length})`
            };
          }

          console.log('[TEST SMS BULK DLT] Sending to', {
            phone: formattedPhone,
            name: recipient.name,
            templateId
          });

          // Send via Fast2SMS DLT route with name as variable
          const result = await sendBulkSMSFast2SMS(config, {
            message: 'test',
            recipients: [formattedPhone],
            route: 'dlt',
            dltTemplateId: templateId,
            variables: recipient.name // Use contact name as variable value
          });

          return {
            phone: recipient.phone,
            name: recipient.name,
            success: result.success,
            requestId: result.requestId,
            error: result.error
          };
        } catch (error) {
          return {
            phone: recipient.phone,
            name: recipient.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const allSuccess = results.every(r => r.success);

    return {
      success: allSuccess,
      results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TEST SMS BULK DLT] Error:', error);
    return {
      success: false,
      results: [],
      error: errorMessage
    };
  }
}

/**
 * Test Fast2SMS DLT SMS send
 */
export async function testFast2SMSDLTAction(input: {
  idToken: string;
  phoneNumber: string;
  templateId: string;
  variables?: string;
}): Promise<{
  success: boolean;
  requestId?: string;
  message?: string[];
  smsCount?: number;
  apiResponse?: any;
  error?: string;
}> {
  try {
    const { idToken, phoneNumber, templateId, variables } = input;

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

    // Validate template ID
    if (!templateId || templateId.trim() === '') {
      return { success: false, error: 'Template ID is required' };
    }

    // Calculate SMS count for dummy message (template-based, so single SMS)
    const smsCount = 1;

    console.log('[TEST SMS DLT] Sending test SMS:', {
      phone: formattedPhone,
      templateId,
      variables: variables || 'none',
      senderId: config.senderId,
      smsCount
    });

    // Send via Fast2SMS DLT route
    const result = await sendBulkSMSFast2SMS(config, {
      message: 'test', // Template ID is passed via dltTemplateId
      recipients: [formattedPhone],
      route: 'dlt',
      dltTemplateId: templateId,
      variables: variables || '|' // Use pipe separator if no variables provided
    });

    console.log('[TEST SMS DLT] Response:', result);

    return {
      success: result.success,
      requestId: result.requestId,
      message: result.message,
      smsCount,
      apiResponse: result,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TEST SMS DLT] Error:', error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
