'use server';

import {
  getSenderEmailCampaigns,
  sendSenderEmailCampaignNow,
  createSenderEmailCampaign,
  updateSenderCampaignContent,
  sendTransactionalEmail,
  addOrUpdateSenderContact,
  getSenderLists,
  type SenderAPICampaign,
  type GetCampaignsResult,
  type SendCampaignResult,
  type CreateCampaignResult,
  type SendTransactionalEmailResult,
  type AddOrUpdateContactResult,
  type GetListsResult,
  type SenderCampaignCreationPayload,
} from '@/lib/sender-client';

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

export interface FetchSenderCampaignsActionResponse {
  success: boolean;
  campaigns?: SenderAPICampaign[];
  total?: number;
  error?: string;
  message?: string;
}

export interface SendSenderCampaignActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CreateSenderCampaignActionResponse {
  success: boolean;
  campaignId?: number;
  message?: string;
  error?: string;
}

export interface SendSenderEmailActionResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export interface AddSenderContactActionResponse {
  success: boolean;
  contactId?: string;
  message?: string;
  isNewContact?: boolean;
}

export async function fetchSenderCampaignsAction(
  apiKey: string,
  limit: number = 10,
  page: number = 1
): Promise<FetchSenderCampaignsActionResponse> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API key not provided.' };
  }

  try {
    const result: GetCampaignsResult = await withTimeout(
      getSenderEmailCampaigns(apiKey, limit, page),
      30000,
      'Fetch Sender.net campaigns'
    );
    if (result.success) {
      return {
        success: true,
        campaigns: result.campaigns,
        total: result.total,
        message: 'Campaigns fetched successfully.',
      };
    } else {
      return { success: false, error: result.error || 'Failed to fetch campaigns from Sender.net.' };
    }
  } catch (error: any) {
    console.error('Error in fetchSenderCampaignsAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while fetching campaigns.',
    };
  }
}

export async function sendSenderCampaignAction(
  apiKey: string,
  campaignId: number
): Promise<SendSenderCampaignActionResponse> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API key not provided.' };
  }
  if (!campaignId) {
    return { success: false, error: 'Campaign ID is required to send a campaign.' };
  }

  try {
    const result: SendCampaignResult = await withTimeout(
      sendSenderEmailCampaignNow(apiKey, campaignId),
      60000,
      'Send Sender.net campaign'
    );
    if (result.success) {
      return {
        success: true,
        message: `Campaign ID ${campaignId} sent successfully via Sender.net.`,
      };
    } else {
      return {
        success: false,
        error: result.error || `Failed to send campaign ID ${campaignId} via Sender.net.`,
      };
    }
  } catch (error: any) {
    console.error(`Error in sendSenderCampaignAction for campaign ID ${campaignId}:`, error);
    return {
      success: false,
      error: error.message || `An unexpected error occurred while sending campaign ID ${campaignId}.`,
    };
  }
}

async function storeHtmlContent(htmlContent: string, contentId: string): Promise<boolean> {
  try {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5000';
    
    const response = await fetch(`${baseUrl}/api/sender-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlContent, contentId }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Sender.net Action] Failed to store HTML content:', error);
    return false;
  }
}

function getHtmlUrl(contentId: string): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5000';
  
  return `${baseUrl}/api/sender-html?id=${contentId}`;
}

export async function createSenderCampaignAction(
  apiKey: string,
  campaignDetails: SenderCampaignCreationPayload
): Promise<CreateSenderCampaignActionResponse> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API key not provided.' };
  }

  if (!campaignDetails.name || !campaignDetails.subject || !campaignDetails.html) {
    return {
      success: false,
      error: 'Campaign name, subject, and HTML content are required.',
    };
  }

  try {
    // Generate unique content ID and store HTML for URL import
    const contentId = `sender-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const htmlUrl = getHtmlUrl(contentId);
    
    // Store the HTML content first so Sender.net can fetch it
    const stored = await storeHtmlContent(campaignDetails.html, contentId);
    if (stored) {
      console.log(`[Sender.net Action] HTML content stored at: ${htmlUrl}`);
    } else {
      console.log('[Sender.net Action] Failed to store HTML, will try direct content approach');
    }
    
    const result: CreateCampaignResult = await withTimeout(
      createSenderEmailCampaign(apiKey, campaignDetails, stored ? htmlUrl : undefined),
      30000,
      'Create Sender.net campaign'
    );
    
    if (!result.success || !result.id) {
      return {
        success: false,
        error: result.error || 'Failed to create campaign in Sender.net.',
      };
    }

    const campaignId = result.id;
    const htmlId = result.htmlId;
    
    console.log(`[Sender.net Action] Campaign created with ID: ${campaignId}, HTML ID: ${htmlId}`);
    
    // IMPORTANT: If html_url was used and worked, DO NOT try to update content
    // The update via PATCH seems to clear the content even though it returns success
    // Only try to update if we didn't use html_url
    if (!stored) {
      console.log('[Sender.net Action] html_url not used, attempting content update...');
      const updateResult = await withTimeout(
        updateSenderCampaignContent(
          apiKey,
          campaignId,
          campaignDetails.html,
          campaignDetails.subject,
          campaignDetails.previewText,
          campaignDetails.groups,
          htmlId
        ),
        30000,
        'Update Sender.net campaign content'
      );
      
      if (!updateResult.success) {
        console.error('Failed to update campaign content:', updateResult.error);
        return {
          success: false,
          error: updateResult.error || 'Campaign created but failed to set content.',
        };
      }
    } else {
      console.log('[Sender.net Action] Skipping content update - html_url import was used');
    }

    return {
      success: true,
      campaignId: campaignId,
      message: 'Campaign created and content set successfully in Sender.net.',
    };
  } catch (error: any) {
    console.error('Error in createSenderCampaignAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while creating the campaign.',
    };
  }
}

export async function sendEmailViaSender(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string
): Promise<SendSenderEmailActionResponse> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API key not provided.' };
  }

  if (!senderEmail || !senderName) {
    return {
      success: false,
      error: 'Sender email and name are required. Please configure them in settings.',
    };
  }

  if (!recipientEmail || !subject || !htmlContent) {
    return {
      success: false,
      error: 'Recipient email, subject, and HTML content are required.',
    };
  }

  try {
    const result: SendTransactionalEmailResult = await withTimeout(
      sendTransactionalEmail(
        apiKey,
        senderEmail,
        senderName,
        recipientEmail,
        recipientName,
        subject,
        htmlContent
      ),
      30000,
      'Send transactional email via Sender.net'
    );

    if (result.success) {
      return {
        success: true,
        messageId: result.messageId,
        message: `Email sent successfully to ${recipientEmail} via Sender.net.`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send email via Sender.net.',
      };
    }
  } catch (error: any) {
    console.error('Error in sendEmailViaSender:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while sending the email.',
    };
  }
}

export async function addSenderContactAction(
  apiKey: string,
  email: string,
  firstname?: string,
  lastname?: string,
  groups?: string[]
): Promise<AddSenderContactActionResponse> {
  if (!apiKey) {
    return { success: false, message: 'Sender.net API key not provided.' };
  }

  if (!email) {
    return { success: false, message: 'Email is required to add a contact.' };
  }

  try {
    const result: AddOrUpdateContactResult = await withTimeout(
      addOrUpdateSenderContact(apiKey, {
        email,
        firstname,
        lastname,
        groups,
      }),
      30000,
      'Add/update Sender.net contact'
    );

    if (result.success) {
      return {
        success: true,
        contactId: result.id,
        message: result.message,
        isNewContact: result.isNewContact,
      };
    } else {
      return {
        success: false,
        message: result.message || 'Failed to add/update contact in Sender.net.',
      };
    }
  } catch (error: any) {
    console.error('Error in addSenderContactAction:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while adding the contact.',
    };
  }
}

export async function fetchSenderListsAction(
  apiKey: string,
  limit: number = 50,
  page: number = 1
): Promise<GetListsResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API key not provided.' };
  }

  try {
    const result = await withTimeout(
      getSenderLists(apiKey, limit, page),
      30000,
      'Fetch Sender.net lists'
    );
    return result;
  } catch (error: any) {
    console.error('Error in fetchSenderListsAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while fetching lists.',
    };
  }
}
