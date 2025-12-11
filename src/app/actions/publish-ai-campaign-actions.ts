'use server';

/**
 * Publish AI Campaign Actions
 * 
 * Converts AI-generated campaign drafts into real campaigns
 * and queues them for sending via the background job system.
 * 
 * IMPORTANT: Email Sender Configuration
 * ========================================
 * All email campaigns use the VERIFIED sender email: support@worldmart.in
 * This email is pre-verified in both Brevo and Sender.net dashboards.
 * 
 * DO NOT use logged-in user's email as sender - it will fail if not verified.
 * 
 * Verification Status:
 * - Brevo: support@worldmart.in (Verified ✓)
 * - Sender.net: support@worldmart.in (Verified ✓)
 * 
 * API Requirements:
 * - Brevo Campaign API: Sender must be verified in Brevo dashboard (Settings → Senders & IP)
 * - Sender.net Campaign API: 
 *   - Sender must be verified in Sender.net dashboard (Settings → Domains)
 *   - 'from' field must be a STRING (email), not an object
 *   - Use separate 'sender_name' field for display name
 */

import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { getServerAICampaignDraft, updateServerAICampaignDraft } from '@/lib/ai-campaign-drafts-data-server';
import { createEmailCampaignJob, createSMSCampaignJob, createWhatsAppCampaignJob } from '@/lib/campaign-queue';
import { getContactsFromBrevoList } from '@/services/brevo';
import { getContactsFromSenderList } from '@/lib/sender-client';
import { getServerWhatsAppContacts } from '@/lib/whatsapp-marketing-data-server';
import { getServerLeads } from '@/lib/leads-data-server';
import type { CampaignRecipient } from '@/types/campaign-jobs';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';

/**
 * Helper function to add timeout protection to any async operation.
 * Prevents hung API calls from crashing the server.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
}

export interface PublishAICampaignResult {
  success: boolean;
  error?: string;
  jobIds?: {
    emailJobId?: string;
    smsJobId?: string;
    whatsappJobId?: string;
  };
}

export async function publishAICampaignAction(input: {
  idToken: string;
  draftId: string;
}): Promise<PublishAICampaignResult> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    // Fetch company data to get API keys
    const companyDoc = await adminDb.collection('companies').doc(userData.companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }
    const companyData = companyDoc.data();

    const draft = await getServerAICampaignDraft(userData.companyId, input.draftId);
    if (!draft) {
      return { success: false, error: 'Campaign draft not found' };
    }

    if (draft.status === 'published') {
      return { success: false, error: 'Campaign has already been published' };
    }

    if (!draft.parsedBrief) {
      return { success: false, error: 'Campaign is not ready to publish. Please complete all stages first.' };
    }

    // FIX Issue 2: Handle legacy drafts without selectedChannels
    // If selectedChannels is missing or empty, AND email content exists, default to ['email']
    // This prevents legacy drafts from spawning unwanted multi-channel jobs
    let selectedChannels = draft.selectedChannels;
    if (!selectedChannels || selectedChannels.length === 0) {
      // Legacy draft - infer channels from available content
      if (draft.emailContent && draft.emailConfig) {
        selectedChannels = ['email'];
      } else {
        return { success: false, error: 'Campaign is not ready to publish. Please complete all stages first.' };
      }
    }

    await updateServerAICampaignDraft({
      id: input.draftId,
      companyId: userData.companyId,
      status: 'publishing',
    });

    const jobIds: { emailJobId?: string; smsJobId?: string; whatsappJobId?: string } = {};
    const errors: string[] = [];

    if (selectedChannels.includes('email') && draft.emailContent && draft.emailConfig) {
      try {
        // Backward compatibility: normalize old drafts that have brevoListId instead of listId
        const emailConfig = draft.emailConfig as any; // Cast to handle legacy shape
        const emailProvider = emailConfig.provider || 'brevo';
        const listId = emailConfig.listId || emailConfig.brevoListId; // Fallback for old drafts
        
        if (!listId) {
          throw new Error('Email list ID not configured');
        }

        let recipients: CampaignRecipient[] = [];

        if (emailProvider === 'brevo') {
          const brevoApiKeyRaw = companyData?.apiKeys?.brevo?.apiKey;
          if (!brevoApiKeyRaw) {
            throw new Error('Brevo API key not configured');
          }
          
          const brevoApiKey = decryptApiKeyServerSide(brevoApiKeyRaw);
          const brevoListIdParsed = parseInt(listId);
          
          if (isNaN(brevoListIdParsed)) {
            throw new Error(`Invalid Brevo list ID: ${listId}`);
          }
          
          const brevoResult = await withTimeout(
            getContactsFromBrevoList(brevoApiKey, brevoListIdParsed, 500),
            30000,
            'Fetch Brevo contacts'
          );
          
          if (!brevoResult.success || !brevoResult.contacts) {
            throw new Error(brevoResult.error || 'Failed to fetch Brevo contacts');
          }

          recipients = brevoResult.contacts.map((contact: any) => ({
            email: contact.email,
            name: contact.attributes?.FIRSTNAME || contact.email,
            customFields: {
              FIRSTNAME: contact.attributes?.FIRSTNAME || '',
              LASTNAME: contact.attributes?.LASTNAME || '',
            },
          }));
        } else if (emailProvider === 'sender') {
          const senderApiKeyRaw = companyData?.apiKeys?.sender?.apiKey;
          if (!senderApiKeyRaw) {
            throw new Error('Sender.net API key not configured');
          }
          
          const senderApiKey = decryptApiKeyServerSide(senderApiKeyRaw);
          const senderResult = await withTimeout(
            getContactsFromSenderList(senderApiKey, listId, 500),
            30000,
            'Fetch Sender.net contacts'
          );
          
          if (!senderResult.success || !senderResult.contacts) {
            throw new Error(senderResult.error || 'Failed to fetch Sender.net contacts');
          }

          recipients = senderResult.contacts.map((contact: any) => ({
            email: contact.email,
            name: contact.firstname || contact.email,
            customFields: {
              FIRSTNAME: contact.firstname || '',
              LASTNAME: contact.lastname || '',
            },
          }));
        } else if (emailProvider === 'smtp') {
          throw new Error('SMTP provider requires manual recipient configuration and is not supported in AI Campaign Studio');
        } else {
          throw new Error(`Unknown email provider: ${emailProvider}`);
        }

        if (recipients.length === 0) {
          throw new Error('No recipients found in selected email list');
        }

        const selectedSubject = draft.emailContent.subjectLines[draft.emailContent.selectedSubjectIndex] || draft.emailContent.subjectLines[0];

        // Use verified sender email instead of logged-in user's email
        // This email is pre-verified in both Brevo and Sender.net dashboards
        const verifiedSenderEmail = 'support@worldmart.in';
        const verifiedSenderName = companyData?.name || 'WMart Online Services';

        const emailJobResult = await createEmailCampaignJob(
          userData.companyId,
          authResult.uid,
          `AI Campaign: ${draft.parsedBrief.campaignGoal.substring(0, 50)}`,
          {
            subject: selectedSubject,
            htmlContent: draft.emailContent.htmlBody,
            senderName: verifiedSenderName,
            senderEmail: verifiedSenderEmail,
            tag: 'ai-campaign',
          },
          recipients,
          emailProvider // FIX: Pass provider as 6th parameter, not inside emailData
        );

        if (emailJobResult.success && emailJobResult.jobId) {
          jobIds.emailJobId = emailJobResult.jobId;
        } else {
          throw new Error(emailJobResult.error || 'Failed to create email campaign job');
        }
      } catch (error: any) {
        console.error('Error publishing email campaign:', error);
        errors.push(`Email: ${error.message}`);
      }
    }

    if (selectedChannels.includes('sms') && draft.smsContent && draft.smsConfig) {
      try {
        const leads = await getServerLeads(userData.companyId);
        const recipients: CampaignRecipient[] = leads
          .filter((lead: any) => lead.phone)
          .map((lead: any) => ({
            phone: lead.phone,
            name: lead.name || lead.phone,
            customFields: {
              FIRSTNAME: lead.name?.split(' ')[0] || '',
            },
          }));

        if (recipients.length === 0) {
          throw new Error('No recipients with phone numbers found');
        }

        const smsJobResult = await createSMSCampaignJob(
          userData.companyId,
          authResult.uid,
          `AI Campaign: ${draft.parsedBrief.campaignGoal.substring(0, 50)}`,
          {
            message: draft.smsContent.message,
            senderId: 'OMNIFL',
            messageType: 'promotional',
          },
          recipients
        );

        if (smsJobResult.success && smsJobResult.jobId) {
          jobIds.smsJobId = smsJobResult.jobId;
        } else {
          throw new Error(smsJobResult.error || 'Failed to create SMS campaign job');
        }
      } catch (error: any) {
        console.error('Error publishing SMS campaign:', error);
        errors.push(`SMS: ${error.message}`);
      }
    }

    if (selectedChannels.includes('whatsapp') && draft.whatsappContent && draft.whatsappConfig) {
      try {
        const whatsappContacts = await getServerWhatsAppContacts(draft.whatsappConfig.listId, userData.companyId);
        const recipients: CampaignRecipient[] = whatsappContacts
          .filter((contact: any) => contact.phoneNumber)
          .map((contact: any) => ({
            phone: contact.phoneNumber,
            name: contact.name || contact.phoneNumber,
            customFields: {
              FIRSTNAME: contact.name?.split(' ')[0] || '',
            },
          }));

        if (recipients.length === 0) {
          throw new Error('No WhatsApp contacts found');
        }

        const whatsappJobResult = await createWhatsAppCampaignJob(
          userData.companyId,
          authResult.uid,
          `AI Campaign: ${draft.parsedBrief.campaignGoal.substring(0, 50)}`,
          {
            templateName: 'custom_message',
            broadcastName: `AI Campaign: ${draft.parsedBrief.campaignGoal.substring(0, 30)}`,
            parameters: [draft.whatsappContent.message],
          },
          recipients
        );

        if (whatsappJobResult.success && whatsappJobResult.jobId) {
          jobIds.whatsappJobId = whatsappJobResult.jobId;
        } else {
          throw new Error(whatsappJobResult.error || 'Failed to create WhatsApp campaign job');
        }
      } catch (error: any) {
        console.error('Error publishing WhatsApp campaign:', error);
        errors.push(`WhatsApp: ${error.message}`);
      }
    }

    if (Object.keys(jobIds).length === 0) {
      await updateServerAICampaignDraft({
        id: input.draftId,
        companyId: userData.companyId,
        status: 'failed',
      });
      return { 
        success: false, 
        error: errors.length > 0 ? errors.join('; ') : 'No campaigns were created' 
      };
    }

    await updateServerAICampaignDraft({
      id: input.draftId,
      companyId: userData.companyId,
      status: 'published',
    });

    if (errors.length > 0) {
      return {
        success: true,
        jobIds,
        error: `Partial success. Some channels failed: ${errors.join('; ')}`,
      };
    }

    return {
      success: true,
      jobIds,
    };
  } catch (error: any) {
    console.error('Error in publishAICampaignAction:', error);
    return { success: false, error: error.message || 'Failed to publish campaign' };
  }
}
