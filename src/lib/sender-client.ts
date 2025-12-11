'use server';

/**
 * Sender.net API Client
 * 
 * IMPORTANT: API Payload Format Differences
 * ==========================================
 * 
 * Sender.net has DIFFERENT payload formats for different endpoints:
 * 
 * 1. Transactional Email API (/v2/email):
 *    - Uses 'from' as an OBJECT: { email: string, name: string }
 *    
 * 2. Campaign API (/v2/campaigns):
 *    - Uses 'from' as a STRING: "email@domain.com"
 *    - Uses separate 'sender_name' field for display name
 *    
 * This inconsistency in the Sender.net API is documented here to prevent confusion.
 * 
 * Verified Sender: support@worldmart.in (pre-verified in Sender.net dashboard)
 */

export interface SenderContact {
  email: string;
  firstname?: string;
  lastname?: string;
  fields?: Record<string, any>;
  groups?: string[];
}

export interface AddOrUpdateContactResult {
  id?: string;
  success: boolean;
  message?: string;
  isNewContact?: boolean;
}

export interface SenderCampaignSender {
  name: string;
  email: string;
}

export interface SenderCampaignCreationPayload {
  name: string;
  subject: string;
  html: string;
  previewText?: string; // Email preview text for inbox preview pane
  sender: SenderCampaignSender;
  groups: string[];
}

export interface CreateCampaignResult {
  id?: number;
  htmlId?: string;
  success: boolean;
  error?: string;
}

export interface SendCampaignResult {
  success: boolean;
  error?: string;
}

export interface SendTransactionalEmailResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

export interface SenderAPICampaign {
  id: number;
  name: string;
  subject: string;
  status: 'draft' | 'sent' | 'scheduled' | 'sending' | string;
  html_content?: string;
  created_at: string;
  updated_at: string;
  list_ids?: number[];
  statistics?: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
    unsubscribed?: number;
  };
  sender?: {
    name: string;
    email: string;
  };
}

export interface GetCampaignsResult {
  campaigns?: SenderAPICampaign[];
  total?: number;
  success: boolean;
  error?: string;
}

export interface SenderContactList {
  id: string;
  title: string;
  total: number;
  active: number;
  created_at: string;
}

export interface GetListsResult {
  lists?: SenderContactList[];
  total?: number;
  success: boolean;
  error?: string;
}

const SENDER_API_BASE_URL = 'https://api.sender.net/v2';
const SENDER_API_TIMEOUT = 60000; // 60 seconds timeout for API calls

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = SENDER_API_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Sender.net API request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

export async function addOrUpdateSenderContact(
  apiKey: string,
  contactDetails: SenderContact
): Promise<AddOrUpdateContactResult> {
  if (!apiKey) {
    return { success: false, message: 'Sender.net API Key not provided.' };
  }

  const senderApiUrl = `${SENDER_API_BASE_URL}/subscribers`;
  const payload = {
    email: contactDetails.email,
    firstname: contactDetails.firstname || '',
    lastname: contactDetails.lastname || '',
    fields: contactDetails.fields || {},
    groups: contactDetails.groups || [],
  };

  console.log('[Sender.net addOrUpdateContact] Adding contact:', {
    email: contactDetails.email,
    groups: payload.groups,
    note: 'IMPORTANT: Sender.net API may add contacts as "Unverified". Check Sender.net dashboard to ensure contacts are "Active" before sending marketing campaigns.',
  });

  try {
    const response = await fetchWithTimeout(senderApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      console.log('[Sender.net addOrUpdateContact] Contact added:', {
        contactId: data.data?.id || data.id,
        email: contactDetails.email,
        note: '⚠️ Verify contact status is "Active" in Sender.net dashboard (Audience → Groups) before sending campaigns.',
      });
      return {
        success: true,
        id: data.data?.id || data.id,
        isNewContact: response.status === 201,
        message: response.status === 201 ? 'Contact created in Sender.net. Verify status is "Active" in dashboard.' : 'Contact updated in Sender.net.',
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Sender.net API Error (addOrUpdateContact):', errorData);
      return {
        success: false,
        message: errorData.message || `Failed to sync contact with Sender.net (Status: ${response.status})`,
      };
    }
  } catch (error: any) {
    console.error('Error syncing contact with Sender.net:', error);
    return {
      success: false,
      message: error.message || 'Network error or other issue syncing contact.',
    };
  }
}

export async function sendTransactionalEmail(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string
): Promise<SendTransactionalEmailResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const senderApiUrl = `${SENDER_API_BASE_URL}/email`;
  const payload = {
    subject: subject,
    html: htmlContent,
    from: {
      email: senderEmail,
      name: senderName,
    },
    to: [
      {
        email: recipientEmail,
        name: recipientName,
      },
    ],
  };

  try {
    const response = await fetchWithTimeout(senderApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Sender.net API Error (sendTransactionalEmail):', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to send email via Sender.net.',
      };
    }

    const data = await response.json();
    return {
      messageId: data.data?.id || data.id,
      success: true,
    };
  } catch (error: any) {
    console.error('Error sending email via Sender.net:', error);
    return {
      success: false,
      error: error.message || 'Network error or other issue sending email.',
    };
  }
}

/**
 * Strip HTML tags and decode HTML entities to create plain text
 */
function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<\/p>/gi, '\n\n') // Convert </p> to double newlines
    .replace(/<\/div>/gi, '\n') // Convert </div> to newlines
    .replace(/<\/tr>/gi, '\n') // Convert </tr> to newlines
    .replace(/<\/li>/gi, '\n') // Convert </li> to newlines
    .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Generate preview text from HTML content
 * Strips HTML tags and returns first ~100 characters
 */
function generatePreviewText(html: string, maxLength: number = 100): string {
  const plainText = stripHtmlToPlainText(html)
    .replace(/\s+/g, ' ') // Collapse all whitespace for preview
    .trim();
  
  return plainText.substring(0, maxLength);
}

/**
 * Wrap HTML content in proper document structure if missing
 * Sender.net REQUIRES standard HTML structure: <html><head></head><body></body></html>
 * Without this structure, the campaign will show "no content" error
 */
function wrapInHtmlDocument(html: string): string {
  // Check if already has proper HTML document structure
  const hasHtmlTag = /<html[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);
  
  if (hasHtmlTag && hasBodyTag) {
    return html;
  }
  
  // Wrap in proper HTML document structure
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
${html}
</body>
</html>`;
}

/**
 * Ensure HTML content has required Sender.net unsubscribe link
 * Must be defined before createSenderEmailCampaign uses it
 */
function addUnsubscribeLinkIfMissing(html: string): string {
  const hasUnsubscribeLink = 
    html.includes('{$unsubscribe_link}') || 
    html.includes('{{unsubscribe}}') ||
    html.includes('{$unsubscribe}') ||
    html.includes('{{unsubscribe_link}}');
  
  if (hasUnsubscribeLink) {
    return html;
  }
  
  const unsubscribeFooter = `
<div style="text-align: center; padding: 20px; margin-top: 20px; font-size: 12px; color: #666;">
  <p>You received this email because you subscribed to our mailing list.</p>
  <p><a href="{$unsubscribe_link}" style="color: #666; text-decoration: underline;">{$unsubscribe_text}</a></p>
</div>`;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${unsubscribeFooter}</body>`);
  }
  
  return html + unsubscribeFooter;
}

export async function createSenderEmailCampaign(
  apiKey: string,
  campaignDetails: SenderCampaignCreationPayload,
  htmlUrl?: string
): Promise<CreateCampaignResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const senderApiUrl = `${SENDER_API_BASE_URL}/campaigns`;
  
  // First wrap in proper HTML document structure (REQUIRED by Sender.net)
  const htmlWrapped = wrapInHtmlDocument(campaignDetails.html);
  
  // Then add unsubscribe link if missing (required by Sender.net)
  const htmlWithUnsubscribe = addUnsubscribeLinkIfMissing(htmlWrapped);
  
  // Generate preview text if not provided
  const previewText = campaignDetails.previewText || generatePreviewText(htmlWithUnsubscribe);
  
  // Generate plain text version for email clients that don't support HTML
  const plainTextContent = stripHtmlToPlainText(htmlWithUnsubscribe);
  
  // Use the sender name (company name) for display - this is what shows in recipient's inbox
  // IMPORTANT: Must be the actual business/company name, NOT the email address
  // If sender.name looks like an email address, use a fallback
  let senderDisplayName = campaignDetails.sender.name || 'OmniFlow';
  
  // Check if the name is actually an email address (common mistake)
  if (senderDisplayName.includes('@') && senderDisplayName.includes('.')) {
    console.warn(`[Sender.net] WARNING: sender.name appears to be an email address: "${senderDisplayName}". Using default.`);
    senderDisplayName = 'OmniFlow';
  }
  
  console.log(`[Sender.net] Using sender display name: "${senderDisplayName}" (from: ${campaignDetails.sender.email})`);
  
  // Sender.net Campaign API payload structure - uses flat fields only
  // API docs: /v2/campaigns expects 'from' (email) and 'sender_name' (display name)
  const payload: Record<string, any> = {
    title: campaignDetails.name,
    name: campaignDetails.name,
    subject: campaignDetails.subject,
    html: htmlWithUnsubscribe,
    html_content: htmlWithUnsubscribe,
    html_body: htmlWithUnsubscribe,
    body: htmlWithUnsubscribe,
    content: htmlWithUnsubscribe,
    plain_text: plainTextContent,
    text: plainTextContent,
    preview_text: previewText,
    preheader: previewText,
    type: 'regular',
    content_type: 'html',
    editor_type: 'custom_html',
    from: campaignDetails.sender.email,
    from_name: senderDisplayName,
    sender_name: senderDisplayName,
    reply_to: campaignDetails.sender.email,
    groups: campaignDetails.groups,
  };
  
  // If html_url is provided, include it as well (import from URL approach)
  if (htmlUrl) {
    payload.html_url = htmlUrl;
    payload.import_url = htmlUrl;
    console.log(`[Sender.net] Including html_url: ${htmlUrl}`);
  }
  
  console.log('[Sender.net] Creating campaign with payload:', JSON.stringify({
    title: campaignDetails.name,
    subject: campaignDetails.subject,
    from: campaignDetails.sender.email,
    from_name: senderDisplayName,
    sender_name: senderDisplayName,
    content_type: 'html',
    editor_type: 'custom_html',
    html_content_length: htmlWithUnsubscribe.length,
    html_url: htmlUrl || 'not provided',
    preview_text: previewText.substring(0, 50) + '...',
    groups: campaignDetails.groups,
  }));

  try {
    const response = await fetchWithTimeout(senderApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Sender.net API Error (createEmailCampaign):', responseData);
      const errorMsg = typeof responseData.message === 'object' 
        ? JSON.stringify(responseData.message) 
        : (responseData.message || `Failed to create campaign in Sender.net (Status: ${response.status})`);
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log('[Sender.net] Campaign created successfully:', JSON.stringify(responseData));
    
    // Extract html.id from response - needed for updating HTML content separately
    const htmlId = responseData.data?.html?.id || responseData.html?.id;
    console.log(`[Sender.net] Campaign HTML template ID: ${htmlId}`);
    
    return {
      success: true,
      id: responseData.data?.id || responseData.id,
      htmlId: htmlId,
    };
  } catch (error: any) {
    console.error('Error creating Sender.net campaign:', error);
    return {
      success: false,
      error: error.message || 'Network error or other issue creating campaign.',
    };
  }
}

export interface UpdateCampaignContentResult {
  success: boolean;
  error?: string;
}

/**
 * Update campaign content (HTML) via multiple approaches
 * Sender.net requires content to be set separately after campaign creation
 * CRITICAL: Must include plain_text and groups fields or API returns "no content" error
 * 
 * Now also tries to update via /html/{htmlId} endpoint if htmlId is provided
 */
export async function updateSenderCampaignContent(
  apiKey: string,
  campaignId: string | number,
  htmlContent: string,
  subject: string,
  previewText?: string,
  groups?: string[],
  htmlId?: string
): Promise<UpdateCampaignContentResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const updateUrl = `${SENDER_API_BASE_URL}/campaigns/${campaignId}`;
  
  // First wrap in proper HTML document structure (REQUIRED by Sender.net)
  const htmlWrapped = wrapInHtmlDocument(htmlContent);
  
  // Then add unsubscribe link if missing
  const htmlWithUnsubscribe = addUnsubscribeLinkIfMissing(htmlWrapped);
  
  // Generate plain text version - REQUIRED by Sender.net API
  const plainTextContent = stripHtmlToPlainText(htmlWithUnsubscribe);
  
  // Auto-generate preview text if not provided
  const generatedPreviewText = previewText || generatePreviewText(htmlWithUnsubscribe);
  
  // Sender.net API requires both html_content AND html_body fields
  // Also try nested html object structure as seen in API responses
  // CRITICAL: editor_type must be 'custom_html' not 'html' for custom HTML campaigns
  const payload: Record<string, any> = {
    html_content: htmlWithUnsubscribe,
    html_body: htmlWithUnsubscribe,
    plain_text: plainTextContent,
    preview_text: generatedPreviewText,
    preheader: generatedPreviewText,
    subject: subject,
    content_type: 'html',
    editor_type: 'custom_html',
    type: 'regular',
    html: {
      html_content: htmlWithUnsubscribe,
      html_body: htmlWithUnsubscribe,
    },
  };
  
  // Only add groups if provided
  if (groups && groups.length > 0) {
    payload.groups = groups;
  }

  try {
    console.log(`[Sender.net] Updating campaign ${campaignId} content`);
    console.log(`[Sender.net] Content length: ${htmlWithUnsubscribe.length} chars, Subject: ${subject}`);
    console.log(`[Sender.net] HTML template ID: ${htmlId || 'not provided'}`);
    
    let response: Response;
    let data: any;
    
    // Approach 1: If we have htmlId, try updating via /html/{htmlId} endpoint first
    if (htmlId) {
      const htmlUrl = `${SENDER_API_BASE_URL}/html/${htmlId}`;
      console.log(`[Sender.net] Trying PUT to ${htmlUrl} (html template endpoint)`);
      
      const htmlPayload = {
        html_content: htmlWithUnsubscribe,
        html_body: htmlWithUnsubscribe,
      };
      
      response = await fetchWithTimeout(htmlUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(htmlPayload),
      }, 30000);

      data = await response.json().catch(() => ({}));
      console.log(`[Sender.net] PUT /html/${htmlId} response (status ${response.status}):`, JSON.stringify(data));
      
      if (response.ok) {
        console.log(`[Sender.net] SUCCESS: HTML template ${htmlId} content updated`);
        return { success: true };
      }
      
      // Try PATCH to html endpoint
      console.log(`[Sender.net] PUT to /html failed, trying PATCH to /html/${htmlId}`);
      response = await fetchWithTimeout(htmlUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(htmlPayload),
      }, 30000);

      data = await response.json().catch(() => ({}));
      console.log(`[Sender.net] PATCH /html/${htmlId} response (status ${response.status}):`, JSON.stringify(data));
      
      if (response.ok) {
        console.log(`[Sender.net] SUCCESS: HTML template ${htmlId} content updated via PATCH`);
        return { success: true };
      }
    }
    
    // Approach 2: Try PUT to /campaigns/{id}/content endpoint
    const contentUrl = `${SENDER_API_BASE_URL}/campaigns/${campaignId}/content`;
    console.log(`[Sender.net] Trying PUT to ${contentUrl}`);
    
    const contentPayload = {
      html_content: htmlWithUnsubscribe,
      plain_text: plainTextContent,
    };
    
    response = await fetchWithTimeout(contentUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(contentPayload),
    }, 30000);

    data = await response.json().catch(() => ({}));
    console.log(`[Sender.net] PUT /content response (status ${response.status}):`, JSON.stringify(data));

    // If /content endpoint failed, try PUT to main campaign endpoint
    if (!response.ok) {
      console.log(`[Sender.net] /content endpoint failed, trying PUT to main endpoint`);
      
      const mainUrl = `${SENDER_API_BASE_URL}/campaigns/${campaignId}`;
      response = await fetchWithTimeout(mainUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }, 30000);

      data = await response.json().catch(() => ({}));
      console.log(`[Sender.net] PUT main endpoint response (status ${response.status}):`, JSON.stringify(data));
    }
    
    // If PUT failed, try PATCH as fallback
    if (!response.ok) {
      console.log(`[Sender.net] PUT failed, trying PATCH as fallback`);
      
      const updateUrl = `${SENDER_API_BASE_URL}/campaigns/${campaignId}`;
      response = await fetchWithTimeout(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }, 30000);

      data = await response.json().catch(() => ({}));
      console.log(`[Sender.net] PATCH response (status ${response.status}):`, JSON.stringify(data));
    }

    if (response.ok) {
      console.log(`[Sender.net] SUCCESS: Campaign ${campaignId} content updated`);
      return { success: true };
    }

    const errorMsg = typeof data.message === 'object' 
      ? JSON.stringify(data.message) 
      : (data.message || data.error || `Failed to update content (HTTP ${response.status})`);
    console.error(`[Sender.net] Failed to update campaign content: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  } catch (error: any) {
    console.error('[Sender.net] Error updating campaign content:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Network error updating campaign content',
    };
  }
}

export async function sendSenderEmailCampaignNow(
  apiKey: string,
  campaignId: string | number
): Promise<SendCampaignResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const sendUrl = `${SENDER_API_BASE_URL}/campaigns/${campaignId}/send`;

  try {
    console.log(`[Sender.net] Sending campaign ${campaignId} via POST ${sendUrl}`);
    
    const response = await fetchWithTimeout(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }, 30000); // 30 second timeout

    const data = await response.json().catch(() => ({}));
    console.log(`[Sender.net] Send response (status ${response.status}):`, JSON.stringify(data));

    if (response.ok) {
      console.log(`[Sender.net] SUCCESS: Campaign ${campaignId} sent`);
      return { success: true };
    }

    // If POST /send fails, return the error - don't crash
    // Handle error message that could be an object (array of error objects)
    let errorMsg: string;
    if (typeof data.message === 'object') {
      errorMsg = JSON.stringify(data.message);
    } else {
      errorMsg = data.message || data.error || `Failed to send (HTTP ${response.status})`;
    }
    console.error(`[Sender.net] Failed to send campaign: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  } catch (error: any) {
    console.error('[Sender.net] Error sending campaign:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Network error sending campaign',
    };
  }
}

export async function getSenderEmailCampaigns(
  apiKey: string,
  limit: number = 10,
  page: number = 1
): Promise<GetCampaignsResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const senderApiUrl = `${SENDER_API_BASE_URL}/campaigns?limit=${limit}&page=${page}`;

  try {
    const response = await fetchWithTimeout(senderApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Sender.net API Error (getSenderEmailCampaigns):', responseData);
      return {
        success: false,
        error: responseData.message || `Failed to fetch campaigns from Sender.net (Status: ${response.status})`,
      };
    }

    return {
      success: true,
      campaigns: responseData.data || responseData.campaigns || [],
      total: responseData.total || responseData.data?.length || 0,
    };
  } catch (error: any) {
    console.error('Error fetching Sender.net campaigns:', error);
    return {
      success: false,
      error: error.message || 'Network error or other issue fetching campaigns.',
    };
  }
}

export async function getSenderLists(
  apiKey: string,
  limit: number = 50,
  page: number = 1
): Promise<GetListsResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const url = `${SENDER_API_BASE_URL}/groups?limit=${limit}&page=${page}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Sender.net API Error (getSenderLists):', data);
      return {
        success: false,
        error: data.message || `Failed to fetch lists (Status: ${response.status})`,
      };
    }

    // Debug: Log raw API response to identify correct field names for subscriber counts
    console.log('[Sender.net getSenderLists] Raw API response:', JSON.stringify(data, null, 2));
    if (data.data && data.data.length > 0) {
      console.log('[Sender.net getSenderLists] First list item fields:', Object.keys(data.data[0]));
      console.log('[Sender.net getSenderLists] First list item:', JSON.stringify(data.data[0], null, 2));
    }

    // Map the lists with correct field names - Sender.net uses various fields for subscriber counts
    // IMPORTANT: Sender.net API returns 'subscribers_count' in the response
    // If that's not available, we need to fetch actual subscriber count from /groups/{id}/subscribers
    const mappedLists: SenderContactList[] = [];
    
    for (const list of (data.data || [])) {
      // Extract subscriber count from any available field - ensure it's a number
      const getNumericValue = (val: any): number => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (typeof val === 'string' && !isNaN(parseInt(val))) return parseInt(val);
        return 0;
      };
      
      // CRITICAL: Use the field names Sender.net actually provides
      // API returns: recipient_count, active_subscribers, etc.
      // DO NOT make additional API calls - they hit rate limits and are unnecessary
      let subscriberCount = 
        getNumericValue(list.recipient_count) ||      // Primary field returned by Sender.net /groups endpoint
        getNumericValue(list.active_subscribers) ||   // Alternative field in /groups endpoint
        getNumericValue(list.total) ||
        getNumericValue(list.subscribers_count) ||
        getNumericValue(list.count) ||
        getNumericValue(list.member_count) ||
        getNumericValue(list.active_subscribers_count) ||
        getNumericValue(list.active_count) || 
        getNumericValue(list.active) || 
        0;
      
      // REMOVED: No longer fetch from /groups/{id}/subscribers endpoint
      // This was causing "Too Many Attempts" rate limit errors
      // The /groups endpoint already provides recipient_count and active_subscribers
      
      console.log(`[Sender.net getSenderLists] List "${list.title || list.name}" (ID: ${list.id}) subscriber count: ${subscriberCount}, raw fields:`, {
        subscribers_count: list.subscribers_count,
        active_subscribers_count: list.active_subscribers_count,
        active_count: list.active_count,
        active: list.active,
        total: list.total,
      });
      
      mappedLists.push({
        id: list.id,
        title: list.title || list.name,
        total: subscriberCount,
        active: getNumericValue(list.active_count) || getNumericValue(list.active) || subscriberCount,
        created_at: list.created_at || '',
      });
    }

    return {
      success: true,
      lists: mappedLists,
      total: data.total || data.data?.length || 0,
    };
  } catch (error: any) {
    console.error('Error fetching Sender.net lists:', error);
    return {
      success: false,
      error: error.message || 'Network error fetching lists.',
    };
  }
}

export interface SenderContactInList {
  email: string;
  firstname?: string;
  lastname?: string;
  fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GetContactsInListResult {
  contacts?: SenderContactInList[];
  total?: number;
  success: boolean;
  error?: string;
}

export async function getContactsFromSenderList(
  apiKey: string,
  listId: string,
  limit: number = 500,
  page: number = 1
): Promise<GetContactsInListResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const url = `${SENDER_API_BASE_URL}/groups/${listId}/subscribers?limit=${limit}&page=${page}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Sender.net API Error (getContactsFromSenderList):', data);
      return {
        success: false,
        error: data.message || `Failed to fetch contacts from list (Status: ${response.status})`,
      };
    }

    return {
      success: true,
      contacts: data.data || [],
      total: data.total || data.data?.length || 0,
    };
  } catch (error: any) {
    console.error(`Error fetching contacts from Sender.net list ${listId}:`, error);
    return {
      success: false,
      error: error.message || 'Network error fetching contacts.',
    };
  }
}

export interface CreateGroupResult {
  groupId?: string;
  success: boolean;
  error?: string;
}

export async function createSenderGroup(
  apiKey: string,
  groupName: string
): Promise<CreateGroupResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const url = `${SENDER_API_BASE_URL}/groups`;
  const payload = {
    title: groupName,
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Sender.net API Error (createSenderGroup):', data);
      return {
        success: false,
        error: data.message || `Failed to create group (Status: ${response.status})`,
      };
    }

    const groupId = data.data?.id || data.id;
    console.log(`[Sender.net] Created group "${groupName}" with ID: ${groupId}`);
    return { success: true, groupId };
  } catch (error: any) {
    console.error('Error creating Sender.net group:', error);
    return {
      success: false,
      error: error.message || 'Network error creating group.',
    };
  }
}

export interface BulkAddContactsResult {
  success: boolean;
  added?: number;
  error?: string;
}

export async function bulkAddContactsToSenderGroup(
  apiKey: string,
  groupId: string,
  contacts: Array<{ email: string; firstname?: string; lastname?: string; fields?: Record<string, any> }>
): Promise<BulkAddContactsResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  if (!contacts || contacts.length === 0) {
    return { success: false, error: 'No contacts provided for import.' };
  }

  let addedCount = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    try {
      const result = await addOrUpdateSenderContact(apiKey, {
        email: contact.email,
        firstname: contact.firstname || '',
        lastname: contact.lastname || '',
        fields: contact.fields || {},
        groups: [groupId],
      });

      if (result.success) {
        addedCount++;
      } else {
        errors.push(`${contact.email}: ${result.message}`);
      }
    } catch (error: any) {
      errors.push(`${contact.email}: ${error.message}`);
    }
  }

  console.log(`[Sender.net] Added ${addedCount}/${contacts.length} contacts to group ${groupId}`);

  if (errors.length > 0 && errors.length < contacts.length) {
    console.warn(`[Sender.net] Some contacts failed to add:`, errors.slice(0, 5));
  }

  if (addedCount === 0) {
    return {
      success: false,
      error: `Failed to add any contacts. Errors: ${errors.slice(0, 3).join(', ')}`,
    };
  }

  return { success: true, added: addedCount };
}

export interface DeleteGroupResult {
  success: boolean;
  error?: string;
}

export async function deleteSenderGroup(
  apiKey: string,
  groupId: string
): Promise<DeleteGroupResult> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const url = `${SENDER_API_BASE_URL}/groups/${groupId}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('Sender.net API Error (deleteSenderGroup):', data);
      return {
        success: false,
        error: data.message || `Failed to delete group (Status: ${response.status})`,
      };
    }

    console.log(`[Sender.net] Deleted group ID: ${groupId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Sender.net group:', error);
    return {
      success: false,
      error: error.message || 'Network error deleting group.',
    };
  }
}

export interface SenderCampaignStatistics {
  success: boolean;
  error?: string;
  stats?: {
    campaignId: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    uniqueOpens: number;
    uniqueClicks: number;
  };
}

export async function getSenderCampaignStatistics(
  apiKey: string,
  campaignId: number
): Promise<SenderCampaignStatistics> {
  if (!apiKey) {
    return { success: false, error: 'Sender.net API Key not provided.' };
  }

  const url = `${SENDER_API_BASE_URL}/campaigns/${campaignId}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('Sender.net API Error (getCampaignStatistics):', data);
      return {
        success: false,
        error: data.message || `Failed to fetch campaign statistics (Status: ${response.status})`,
      };
    }

    const data = await response.json();
    const stats = data.data?.stats || {};

    const sent = stats.sent || 0;
    const delivered = stats.delivered || 0;
    const opened = stats.unique_opens || 0;
    const clicked = stats.unique_clicks || 0;
    const unsubscribed = stats.unsubscribed || 0;
    const bounced = stats.bounced || 0;

    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;

    console.log(`[Sender.net] Fetched statistics for campaign ID: ${campaignId}`);
    return {
      success: true,
      stats: {
        campaignId,
        sent,
        delivered,
        opened,
        clicked,
        unsubscribed,
        bounced,
        openRate,
        clickRate,
        uniqueOpens: opened,
        uniqueClicks: clicked,
      },
    };
  } catch (error: any) {
    console.error('Error fetching Sender.net campaign statistics:', error);
    return {
      success: false,
      error: error.message || 'Network error fetching campaign statistics.',
    };
  }
}
