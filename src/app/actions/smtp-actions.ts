'use server';

/**
 * SMTP Email Server Actions
 * Works with Gmail, Outlook, SendGrid, or any SMTP provider
 */

import {
  sendEmailSMTP,
  sendBulkEmailSMTP,
  verifySMTPConnection,
  isValidEmail,
  type SMTPConfig,
  type SendEmailInput
} from '@/lib/smtp-client';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Send single email via SMTP
 */
export async function sendEmailViaSMTPAction(input: {
  idToken: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const { idToken, ...emailData } = input;

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

    if (!company?.apiKeys?.smtp) {
      return {
        success: false,
        error: 'SMTP not configured. Please add your SMTP server settings in Settings → API Integrations.'
      };
    }

    // Decrypt API keys
    const config: SMTPConfig = {
      host: decryptApiKeyServerSide(company.apiKeys.smtp.host),
      port: decryptApiKeyServerSide(company.apiKeys.smtp.port),
      username: decryptApiKeyServerSide(company.apiKeys.smtp.username),
      password: decryptApiKeyServerSide(company.apiKeys.smtp.password),
      fromEmail: decryptApiKeyServerSide(company.apiKeys.smtp.fromEmail),
      fromName: decryptApiKeyServerSide(company.apiKeys.smtp.fromName)
    };

    // Validate email addresses
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const invalidEmails = recipients.filter(email => !isValidEmail(email));
    
    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email address(es): ${invalidEmails.join(', ')}`
      };
    }

    // Send email
    const result = await sendEmailSMTP(config, emailData);

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error
    };
  } catch (error) {
    console.error('sendEmailViaSMTPAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email via SMTP'
    };
  }
}

/**
 * Send bulk emails via SMTP
 */
export async function sendBulkEmailViaSMTPAction(input: {
  idToken: string;
  emails: Array<{
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
  }>;
}): Promise<{
  success: boolean;
  results?: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  successCount?: number;
  failCount?: number;
  error?: string;
}> {
  try {
    const { idToken, emails } = input;

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

    if (!company?.apiKeys?.smtp) {
      return {
        success: false,
        error: 'SMTP not configured. Please add your SMTP server settings in Settings.'
      };
    }

    // Decrypt API keys
    const config: SMTPConfig = {
      host: decryptApiKeyServerSide(company.apiKeys.smtp.host),
      port: decryptApiKeyServerSide(company.apiKeys.smtp.port),
      username: decryptApiKeyServerSide(company.apiKeys.smtp.username),
      password: decryptApiKeyServerSide(company.apiKeys.smtp.password),
      fromEmail: decryptApiKeyServerSide(company.apiKeys.smtp.fromEmail),
      fromName: decryptApiKeyServerSide(company.apiKeys.smtp.fromName)
    };

    // Validate all email addresses first
    const allRecipients: string[] = [];
    emails.forEach(email => {
      const recipients = Array.isArray(email.to) ? email.to : [email.to];
      allRecipients.push(...recipients);
    });
    
    const invalidEmails = allRecipients.filter(email => !isValidEmail(email));
    
    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email address(es) found: ${invalidEmails.slice(0, 5).join(', ')}${invalidEmails.length > 5 ? ` and ${invalidEmails.length - 5} more` : ''}`
      };
    }

    // Send bulk emails
    const result = await sendBulkEmailSMTP(config, emails);

    return {
      success: true,
      results: result.results,
      successCount: result.successCount,
      failCount: result.failCount
    };
  } catch (error) {
    console.error('sendBulkEmailViaSMTPAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk emails via SMTP'
    };
  }
}

/**
 * Verify SMTP connection
 */
export async function verifySMTPConnectionAction(
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

    if (!company?.apiKeys?.smtp) {
      return {
        success: false,
        error: 'SMTP not configured. Please add your SMTP server settings in Settings.'
      };
    }

    // Decrypt API keys
    const config: SMTPConfig = {
      host: decryptApiKeyServerSide(company.apiKeys.smtp.host),
      port: decryptApiKeyServerSide(company.apiKeys.smtp.port),
      username: decryptApiKeyServerSide(company.apiKeys.smtp.username),
      password: decryptApiKeyServerSide(company.apiKeys.smtp.password),
      fromEmail: decryptApiKeyServerSide(company.apiKeys.smtp.fromEmail),
      fromName: decryptApiKeyServerSide(company.apiKeys.smtp.fromName)
    };

    // Verify connection
    return await verifySMTPConnection(config);
  } catch (error) {
    console.error('verifySMTPConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify SMTP connection'
    };
  }
}
