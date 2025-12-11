'use server';

/**
 * Server Actions for Campaign Queue
 * 
 * These actions allow the UI to queue bulk campaigns for background processing
 * instead of sending them directly (which would timeout for large campaigns).
 */

import { 
  createEmailCampaignJob,
  createSMSCampaignJob,
  createWhatsAppCampaignJob,
  getCompanyCampaignJobs,
  getCampaignJob,
} from '@/lib/campaign-queue';
import type { 
  CampaignRecipient,
  EmailCampaignData,
  SMSCampaignData,
  WhatsAppCampaignData,
  CampaignJob,
} from '@/types/campaign-jobs';
import { verifyAuthToken } from '@/lib/firebase-admin';
import { getAppUser } from '@/lib/saas-data';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Queue an email campaign for background processing
 */
export async function queueEmailCampaignAction(input: {
  idToken: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  senderName?: string; // Optional - will use company settings if not provided
  senderEmail?: string; // Optional - will use company settings if not provided
  recipients: CampaignRecipient[];
  tag?: string;
  provider?: 'brevo' | 'sender' | 'smtp'; // Optional - will auto-detect if not provided
}): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
  message?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(input.idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId
    const user = await getAppUser(authResult.uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate inputs
    if (!input.campaignName || !input.subject || !input.htmlContent) {
      return { success: false, error: 'Campaign name, subject, and content are required' };
    }

    if (!input.recipients || input.recipients.length === 0) {
      return { success: false, error: 'At least one recipient is required' };
    }

    // Auto-populate sender details from company settings if not provided
    let finalSenderName = input.senderName;
    let finalSenderEmail = input.senderEmail;
    let finalProvider = input.provider;

    // Fetch company settings if sender details or provider not provided
    if (!finalSenderName || !finalSenderEmail || !finalProvider) {
      const db = getFirebaseDb();
      if (db) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
          if (companyDoc.exists()) {
            const company = companyDoc.data() as any;

            // Auto-detect provider based on available API keys if not specified
            if (!finalProvider) {
              if (company.apiKeys?.sender?.apiKey) {
                finalProvider = 'sender';
              } else if (company.apiKeys?.brevo?.apiKey) {
                finalProvider = 'brevo';
              } else if (company.apiKeys?.smtp?.host) {
                finalProvider = 'smtp';
              } else {
                finalProvider = 'brevo'; // Default fallback
              }
            }

            // Use provider-specific sender email
            finalSenderName = finalSenderName || company.name || 'OmniFlow';
            if (!finalSenderEmail) {
              // CRITICAL: Use provider-specific sender email to avoid mixing Brevo/Sender.net configs
              if (finalProvider === 'sender') {
                finalSenderEmail = company.apiKeys?.sender?.senderEmail || user.email;
              } else if (finalProvider === 'brevo') {
                finalSenderEmail = company.apiKeys?.brevo?.senderEmail || user.email;
              } else if (finalProvider === 'smtp') {
                finalSenderEmail = company.apiKeys?.smtp?.fromEmail || user.email;
              } else {
                finalSenderEmail = user.email;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching company settings:', error);
          // Continue with provided values, they'll be validated below
        }
      }
    }

    // Validate that we have sender details
    if (!finalSenderEmail) {
      return { success: false, error: 'Sender email is required. Please configure it in Settings.' };
    }

    if (!finalSenderName) {
      return { success: false, error: 'Sender name is required. Please configure it in Settings.' };
    }

    // Create email campaign data with provider
    const emailData: EmailCampaignData = {
      subject: input.subject,
      htmlContent: input.htmlContent,
      senderName: finalSenderName,
      senderEmail: finalSenderEmail,
      tag: input.tag,
      provider: finalProvider as 'brevo' | 'sender' | 'smtp',
    };

    // Queue the campaign job
    const result = await createEmailCampaignJob(
      user.companyId,
      authResult.uid,
      input.campaignName,
      emailData,
      input.recipients,
      finalProvider
    );

    if (result.success) {
      return {
        success: true,
        jobId: result.jobId,
        message: `Email campaign queued successfully! ${input.recipients.length} emails will be sent in the background.`,
      };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Error queueing email campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error queueing campaign',
    };
  }
}

/**
 * Queue an SMS campaign for background processing
 */
export async function queueSMSCampaignAction(input: {
  idToken: string;
  campaignName: string;
  message: string;
  senderId: string;
  messageType: 'promotional' | 'transactional';
  recipients: CampaignRecipient[];
  dltTemplateId?: string;
}): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
  message?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(input.idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId
    const user = await getAppUser(authResult.uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate inputs
    if (!input.campaignName || !input.message) {
      return { success: false, error: 'Campaign name and message are required' };
    }

    if (!input.recipients || input.recipients.length === 0) {
      return { success: false, error: 'At least one recipient is required' };
    }

    // Create SMS campaign data
    const smsData: SMSCampaignData = {
      message: input.message,
      senderId: input.senderId,
      messageType: input.messageType,
      dltTemplateId: input.dltTemplateId,
    };

    // Queue the campaign job
    const result = await createSMSCampaignJob(
      user.companyId,
      authResult.uid,
      input.campaignName,
      smsData,
      input.recipients
    );

    if (result.success) {
      return {
        success: true,
        jobId: result.jobId,
        message: `SMS campaign queued successfully! ${input.recipients.length} messages will be sent in the background.`,
      };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Error queueing SMS campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error queueing campaign',
    };
  }
}

/**
 * Queue a WhatsApp campaign for background processing
 */
export async function queueWhatsAppCampaignAction(input: {
  idToken: string;
  campaignName: string;
  templateName: string;
  broadcastName: string;
  recipients: CampaignRecipient[];
}): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
  message?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(input.idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId
    const user = await getAppUser(authResult.uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate inputs
    if (!input.campaignName || !input.templateName) {
      return { success: false, error: 'Campaign name and template name are required' };
    }

    if (!input.recipients || input.recipients.length === 0) {
      return { success: false, error: 'At least one recipient is required' };
    }

    // Create WhatsApp campaign data
    const whatsappData: WhatsAppCampaignData = {
      templateName: input.templateName,
      broadcastName: input.broadcastName,
    };

    // Queue the campaign job
    const result = await createWhatsAppCampaignJob(
      user.companyId,
      authResult.uid,
      input.campaignName,
      whatsappData,
      input.recipients
    );

    if (result.success) {
      return {
        success: true,
        jobId: result.jobId,
        message: `WhatsApp campaign queued successfully! ${input.recipients.length} messages will be sent in the background.`,
      };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Error queueing WhatsApp campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error queueing campaign',
    };
  }
}

/**
 * Get campaign job status
 */
export async function getCampaignJobStatusAction(input: {
  idToken: string;
  jobId: string;
}): Promise<{
  success: boolean;
  job?: CampaignJob;
  error?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(input.idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId
    const user = await getAppUser(authResult.uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get the job
    const job = await getCampaignJob(input.jobId);
    if (!job) {
      return { success: false, error: 'Campaign job not found' };
    }

    // Verify the job belongs to the user's company
    if (job.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized access to campaign job' };
    }

    return {
      success: true,
      job,
    };
  } catch (error) {
    console.error('Error getting campaign job status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting job status',
    };
  }
}

/**
 * Get all campaign jobs for the company
 */
export async function getCompanyCampaignJobsAction(input: {
  idToken: string;
}): Promise<{
  success: boolean;
  jobs?: CampaignJob[];
  error?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(input.idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId
    const user = await getAppUser(authResult.uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get all campaign jobs for the company
    const jobs = await getCompanyCampaignJobs(user.companyId);

    return {
      success: true,
      jobs,
    };
  } catch (error) {
    console.error('Error getting company campaign jobs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting campaign jobs',
    };
  }
}
