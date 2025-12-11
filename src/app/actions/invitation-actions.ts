
'use server';

import { sendTransactionalEmail } from '@/services/brevo';
import { generateInvitationEmailHTML, generateInvitationEmailSubject, type InvitationEmailData } from '@/lib/email-templates';
import { trackAIUsage } from '@/lib/ai-usage-tracker';

export interface SendInvitationEmailParams {
  recipientEmail: string;
  companyName: string;
  role: string;
  type: string;
  inviterEmail: string;
  inviterName?: string;
  brevoApiKey: string;
  senderEmail: string;
  senderName: string;
}

export interface SendInvitationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an invitation email to a new user using Brevo transactional email service.
 * This function generates a professional HTML email with all the invitation details
 * and sends it via the company's Brevo API key.
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<SendInvitationEmailResult> {
  try {
    // Validate required parameters
    if (!params.brevoApiKey) {
      return {
        success: false,
        error: 'Brevo API key is not configured. Please set up your Brevo API key in Settings > API Keys.',
      };
    }

    if (!params.senderEmail || !params.senderName) {
      return {
        success: false,
        error: 'Sender email and name are not configured. Please set up your sender information in Settings > API Keys (Brevo section).',
      };
    }

    if (!params.recipientEmail || !params.companyName) {
      return {
        success: false,
        error: 'Recipient email and company name are required.',
      };
    }

    // Generate the signup URL
    // Use REPLIT_DOMAINS for Replit environment, or construct from NEXT_PUBLIC_APP_URL
    const replitDomain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (replitDomain ? `https://${replitDomain}` : 'http://localhost:3000');
    
    const signupUrl = `${baseUrl}/signup`;

    // Prepare email data
    const emailData: InvitationEmailData = {
      recipientEmail: params.recipientEmail,
      companyName: params.companyName,
      role: params.role,
      type: params.type,
      inviterEmail: params.inviterEmail,
      inviterName: params.inviterName,
      signupUrl,
    };

    // Generate email content
    const htmlContent = generateInvitationEmailHTML(emailData);
    const subject = generateInvitationEmailSubject(params.companyName);

    // Extract recipient name from email if not provided
    const recipientName = params.recipientEmail.split('@')[0];

    // Send email via Brevo using the company's configured sender
    const result = await sendTransactionalEmail(
      params.brevoApiKey,
      params.senderEmail, // Use company's verified sender email
      params.senderName, // Use company's sender name
      params.recipientEmail,
      recipientName,
      subject,
      htmlContent
    );

    if (result.success) {
      console.log(`✅ Invitation email sent successfully to ${params.recipientEmail}`, {
        messageId: result.messageId,
        companyName: params.companyName,
      });
      
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      console.error(`❌ Failed to send invitation email to ${params.recipientEmail}:`, result.error);
      
      return {
        success: false,
        error: result.error || 'Failed to send invitation email',
      };
    }
  } catch (error: any) {
    console.error('❌ Unexpected error sending invitation email:', error);
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while sending the invitation email',
    };
  }
}
