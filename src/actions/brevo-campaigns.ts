
'use server';

import { getBrevoEmailCampaigns, sendBrevoEmailCampaignNow, type BrevoAPICampaign, type GetCampaignsResult, type SendCampaignResult, addOrUpdateBrevoContact, sendTransactionalEmail, createBrevoEmailCampaign } from '@/services/brevo';

export interface FetchBrevoCampaignsActionResponse {
  success: boolean;
  campaigns?: BrevoAPICampaign[];
  count?: number;
  error?: string;
  message?: string;
}

export interface SendBrevoCampaignActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FetchBrevoCampaignSummaryActionResponse {
  success: boolean;
  totalCampaigns?: number;
  sentCampaigns?: number;
  draftCampaigns?: number;
  error?: string;
}

export async function fetchBrevoCampaignsAction(
    apiKey: string,
    limit: number = 10,
    offset: number = 0,
    sort: 'desc' | 'asc' = 'desc',
    status?: BrevoAPICampaign['status']
): Promise<FetchBrevoCampaignsActionResponse> {
  if (!apiKey) {
    return { success: false, error: "Brevo API key not provided." };
  }
  try {
    const result: GetCampaignsResult = await getBrevoEmailCampaigns(apiKey, limit, offset, sort, status);
    if (result.success) {
      return { success: true, campaigns: result.campaigns, count: result.count, message: "Campaigns fetched successfully." };
    } else {
      return { success: false, error: result.error || "Failed to fetch campaigns from Brevo." };
    }
  } catch (error: any) {
    console.error("Error in fetchBrevoCampaignsAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred while fetching campaigns." };
  }
}

export async function sendBrevoCampaignAction(apiKey: string, campaignId: number): Promise<SendBrevoCampaignActionResponse> {
  if (!apiKey) {
    return { success: false, error: "Brevo API key not provided." };
  }
  if (!campaignId) {
    return { success: false, error: "Campaign ID is required to send a campaign." };
  }

  try {
    const result: SendCampaignResult = await sendBrevoEmailCampaignNow(apiKey, campaignId);
    if (result.success) {
      return { success: true, message: `Campaign ID ${campaignId} sent successfully via Brevo.` };
    } else {
      return { success: false, error: result.error || `Failed to send campaign ID ${campaignId} via Brevo.` };
    }
  } catch (error: any) {
    console.error(`Error in sendBrevoCampaignAction for campaign ID ${campaignId}:`, error);
    return { success: false, error: error.message || `An unexpected error occurred while sending campaign ID ${campaignId}.` };
  }
}

export async function fetchBrevoCampaignSummaryAction(apiKey: string): Promise<FetchBrevoCampaignSummaryActionResponse> {
  if (!apiKey) {
    return { success: false, error: "Brevo API key not provided." };
  }
  try {
    const sentResult = await getBrevoEmailCampaigns(apiKey, 1, 0, 'desc', 'sent');
    const draftResult = await getBrevoEmailCampaigns(apiKey, 1, 0, 'desc', 'draft');
    
    let sentCampaigns = 0;
    if (sentResult.success && typeof sentResult.count === 'number') {
      sentCampaigns = sentResult.count;
    } else if (!sentResult.success) {
      console.warn("Failed to fetch sent campaign stats for summary:", sentResult.error);
    }

    let draftCampaigns = 0;
    if (draftResult.success && typeof draftResult.count === 'number') {
      draftCampaigns = draftResult.count;
    } else if (!draftResult.success) {
      console.warn("Failed to fetch draft campaign stats for summary:", draftResult.error);
    }

    const totalCampaigns = sentCampaigns + draftCampaigns;

    return {
      success: true,
      totalCampaigns: totalCampaigns,
      sentCampaigns: sentCampaigns,
      draftCampaigns: draftCampaigns,
    };
  } catch (error: any) {
    console.error("Error in fetchBrevoCampaignSummaryAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred while fetching Brevo campaign summary." };
  }
}

export interface CreateAndSendBrevoCampaignInput {
  apiKey: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  brevoListIds: number[];
  tag?: string;
}

export interface CreateAndSendBrevoCampaignResponse {
  success: boolean;
  brevoCampaignId?: number;
  message?: string;
  error?: string;
}

export async function createAndSendBrevoCampaignAction(
  input: CreateAndSendBrevoCampaignInput
): Promise<CreateAndSendBrevoCampaignResponse> {
  if (!input.apiKey) {
    return { success: false, error: "Brevo API key not provided." };
  }
  if (!input.subject || !input.htmlContent) {
    return { success: false, error: "Subject and HTML content are required." };
  }
  if (!input.senderEmail) {
    return { success: false, error: "Sender email is required." };
  }
  if (!input.brevoListIds || input.brevoListIds.length === 0) {
    return { success: false, error: "At least one Brevo list ID is required." };
  }

  try {
    // IMPORTANT: Ensure sender name is the company/business name, NOT the email address
    // The sender name is what recipients see in their inbox "From" field
    let finalSenderName = input.senderName || '';
    
    // If the sender name looks like an email address, extract a reasonable display name
    if (!finalSenderName || (finalSenderName.includes('@') && finalSenderName.includes('.'))) {
      if (finalSenderName) {
        console.warn(`[Brevo] WARNING: senderName appears to be an email address: "${finalSenderName}". Extracting display name.`);
      }
      // Try to extract a reasonable display name from the sender email
      // e.g., "support@worldmart.in" -> "WorldMart Support"
      const emailLocal = input.senderEmail?.split('@')[0] || '';
      const emailDomain = input.senderEmail?.split('@')[1]?.split('.')[0] || '';
      // Capitalize and format: support -> Support, worldmart -> Worldmart
      const formatName = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      finalSenderName = emailDomain ? `${formatName(emailDomain)} ${formatName(emailLocal)}` : formatName(emailLocal) || 'Email Campaign';
    }
    
    console.log(`[Brevo] Creating campaign with sender name: "${finalSenderName}" (email: ${input.senderEmail})`);
    
    const campaignPayload = {
      name: input.campaignName || input.subject.substring(0, 50),
      subject: input.subject,
      htmlContent: input.htmlContent,
      sender: { name: finalSenderName, email: input.senderEmail },
      recipients: { listIds: input.brevoListIds },
      type: 'classic' as const,
      tag: input.tag,
    };

    const createResult = await createBrevoEmailCampaign(input.apiKey, campaignPayload);

    if (!createResult.success || !createResult.id) {
      return { 
        success: false, 
        error: createResult.error || 'Failed to create campaign in Brevo'
      };
    }

    const brevoCampaignId = createResult.id;
    const sendResult = await sendBrevoEmailCampaignNow(input.apiKey, brevoCampaignId);

    if (!sendResult.success) {
      return {
        success: false,
        brevoCampaignId: brevoCampaignId,
        error: `Campaign created (ID: ${brevoCampaignId}), but failed to send: ${sendResult.error || 'Unknown error'}`
      };
    }

    return {
      success: true,
      brevoCampaignId: brevoCampaignId,
      message: `Campaign (ID: ${brevoCampaignId}) created and scheduled for sending via Brevo.`
    };
  } catch (error: any) {
    console.error("Error in createAndSendBrevoCampaignAction:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred while creating and sending the campaign." 
    };
  }
}
