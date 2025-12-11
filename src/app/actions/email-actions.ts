
'use server';

import { sendTransactionalEmail, type SendTransactionalEmailResult } from '@/services/brevo';
import { trackAIUsage } from '@/lib/ai-usage-tracker';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

export interface EmailProviderConfig {
  brevo?: {
    apiKey: string;
    defaultSenderEmail?: string;
    defaultSenderName?: string;
  };
  sender?: {
    apiKey: string;
    defaultSenderEmail?: string;
    defaultSenderName?: string;
  };
}

export async function getEmailProviderConfigAction(idToken: string): Promise<{
  success: boolean;
  config?: EmailProviderConfig;
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
      return { success: false, error: 'User is not associated with a company' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();
    const config: EmailProviderConfig = {};

    if (company?.apiKeys?.brevo?.apiKey) {
      config.brevo = {
        apiKey: decryptApiKeyServerSide(company.apiKeys.brevo.apiKey),
        defaultSenderEmail: company.apiKeys.brevo.senderEmail 
          ? decryptApiKeyServerSide(company.apiKeys.brevo.senderEmail) 
          : undefined,
        defaultSenderName: company.apiKeys.brevo.senderName 
          ? decryptApiKeyServerSide(company.apiKeys.brevo.senderName) 
          : undefined,
      };
    }

    if (company?.apiKeys?.sender?.apiKey) {
      config.sender = {
        apiKey: decryptApiKeyServerSide(company.apiKeys.sender.apiKey),
        defaultSenderEmail: company.apiKeys.sender.senderEmail 
          ? decryptApiKeyServerSide(company.apiKeys.sender.senderEmail) 
          : undefined,
        defaultSenderName: company.apiKeys.sender.senderName 
          ? decryptApiKeyServerSide(company.apiKeys.sender.senderName) 
          : undefined,
      };
    }

    return { success: true, config };
  } catch (error) {
    console.error('getEmailProviderConfigAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get email provider config'
    };
  }
}

export async function sendEmailAction({
  apiKey,
  senderEmail,
  senderName,
  recipientEmail,
  recipientName,
  subject,
  htmlContent,
}: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
}): Promise<SendTransactionalEmailResult> {
  try {
    const result = await sendTransactionalEmail(
      apiKey,
      senderEmail,
      senderName,
      recipientEmail,
      recipientName,
      subject,
      htmlContent
    );
    return result;
  } catch (error: any) {
    console.error('Error in sendEmailAction:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
