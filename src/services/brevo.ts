
'use server';

/**
 * @fileOverview Service functions for interacting with the Brevo (formerly Sendinblue) API.
 * This file handles the direct communication with the Brevo REST API.
 * It requires the BREVO_API_KEY to be passed from the actions, not read from environment variables directly.
 */

/**
 * Represents a contact in Brevo.
 */
export interface BrevoContact {
  email: string;
  attributes?: Record<string, any>; // e.g., { FIRSTNAME: 'John', LASTNAME: 'Doe' }
  listIds?: number[]; // List(s) to add the contact to
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  updateEnabled?: boolean; // Set to true to update existing contact
  smtpBlacklistSender?: string[];
}

/**
 * Represents the result of adding or updating a contact in Brevo.
 */
export interface AddOrUpdateContactResult {
  id?: number; // Contact ID, present if contact is created or found
  success: boolean;
  message?: string; // General message or error
  isNewContact?: boolean; // True if a new contact was created
}

/**
 * Represents a sender for a Brevo email campaign.
 */
export interface BrevoCampaignSender {
  name: string;
  email: string;
  // id?: number; // Optional: If using a pre-configured sender ID from Brevo
}

/**
 * Represents the details for creating an email campaign in Brevo.
 */
export interface BrevoCampaignCreationPayload {
  name: string;
  subject: string;
  htmlContent: string;
  sender: BrevoCampaignSender;
  tag?: string;
  type: 'classic' | 'automation'; // Typically 'classic' for manual sends
  recipients: { listIds: number[]; };
  inlineImageActivation?: boolean;
  mirrorActive?: boolean;
  footer?: string;
  header?: string;
  // ... other campaign settings as per Brevo API
}

/**
 * Result of creating an email campaign in Brevo.
 */
export interface CreateCampaignResult {
  id?: number; // Brevo Campaign ID
  success: boolean;
  error?: string;
}

/**
 * Result of sending an email campaign in Brevo.
 */
export interface SendCampaignResult {
  success: boolean;
  error?: string;
}


/**
 * Represents the result of sending a transactional email via Brevo.
 */
export interface SendTransactionalEmailResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

/**
 * Represents a campaign object as returned by the Brevo API.
 */
export interface BrevoAPICampaign {
  id: number;
  name: string;
  subject: string;
  type: 'classic' | 'automation' | string;
  status: 'draft' | 'sent' | 'queued' | 'suspended' | 'inProcess' | 'archive' | string;
  testSent: boolean;
  header: string;
  htmlContent?: string;
  createdAt: string;
  modifiedAt: string;
  listIds?: number[];
  templateId?: number;
  statistics?: {
    globalStats?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      unsubscribed: number;
      softBounces: number;
      hardBounces: number;
    };
  };
  sender?: {
    name: string;
    email: string;
    id?: number;
  };
}

export interface GetCampaignsResult {
    campaigns?: BrevoAPICampaign[];
    count?: number; // Total number of campaigns matching the query (not just in the current page)
    success: boolean;
    error?: string;
}

/**
 * Represents a contact list from Brevo.
 */
export interface BrevoContactList {
    id: number;
    name: string;
    totalSubscribers: number;
    folderId: number;
    createdAt: string;
}

/**
 * Result of fetching lists from Brevo.
 */
export interface GetListsResult {
    lists?: BrevoContactList[];
    count?: number;
    success: boolean;
    error?: string;
}

/**
 * Represents a contact as returned from a list in Brevo.
 */
export interface BrevoContactInList {
    id: number;
    email: string;
    emailBlacklisted: boolean;
    smsBlacklisted: boolean;
    createdAt: string;
    modifiedAt: string;
    listIds: number[];
    listUnsubscribed?: number[];
    attributes: {
        [key: string]: any; // Allow any string key
        FIRSTNAME?: string;
        LASTNAME?: string;
    };
}

/**
 * Result of fetching contacts from a list in Brevo.
 */
export interface GetContactsInListResult {
    contacts?: BrevoContactInList[];
    count?: number;
    success: boolean;
    error?: string;
}


const OMNIFLOW_BREVO_DEFAULT_LIST_ID = parseInt(process.env.OMNIFLOW_BREVO_DEFAULT_LIST_ID || "2");

export async function addOrUpdateBrevoContact(apiKey: string, contactDetails: BrevoContact): Promise<AddOrUpdateContactResult> {
  if (!apiKey) {
    return { success: false, message: 'Brevo API Key not provided.' };
  }

  const brevoApiUrl = 'https://api.brevo.com/v3/contacts';
  const payload: BrevoContact = {
    ...contactDetails,
    updateEnabled: true,
    emailBlacklisted: false, // Ensure contact is not blocklisted
    listIds: contactDetails.listIds && contactDetails.listIds.length > 0 ? contactDetails.listIds : [OMNIFLOW_BREVO_DEFAULT_LIST_ID],
  };

  console.log('[Brevo addOrUpdateContact] Adding/updating contact:', {
    email: contactDetails.email,
    listIds: payload.listIds,
    note: 'IMPORTANT: Brevo API adds contacts as "Unconfirmed" by default. To send marketing emails, contacts must be manually changed to "Subscribed" in Brevo dashboard, OR use double opt-in signup forms.',
  });

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = await response.json();
      console.log('[Brevo addOrUpdateContact] Contact created successfully:', {
        contactId: data.id,
        email: contactDetails.email,
        note: '⚠️ IMPORTANT: Brevo API limitation - contacts are added as "Unconfirmed" by default. To send marketing campaigns, you MUST: 1) Manually change status to "Subscribed" in Brevo dashboard (Contacts → Lists → Select contact), OR 2) Use Brevo signup forms with double opt-in confirmation.',
      });
      return { success: true, id: data.id, isNewContact: true, message: 'Contact added to Brevo as "Unconfirmed". Change to "Subscribed" in Brevo dashboard to send marketing emails.' };
    } else if (response.status === 204) {
      console.log('[Brevo addOrUpdateContact] Contact updated successfully:', {
        email: contactDetails.email,
        note: 'Contact was updated. Check Brevo to ensure contact status is "Subscribed" to count as subscriber.',
      });
      return { success: true, isNewContact: false, message: 'Contact updated in Brevo.' };
    } else if (response.ok) {
        const data = await response.json();
        console.log('[Brevo addOrUpdateContact] Contact operation successful:', data);
        return { success: true, isNewContact: false, message: 'Contact updated in Brevo (details might be in response).' };
    }
     else {
      const errorData = await response.json();
      console.error('[Brevo addOrUpdateContact] API Error:', {
        status: response.status,
        error: errorData,
        email: contactDetails.email,
      });
      return { success: false, message: errorData.message || `Failed to sync contact with Brevo (Status: ${response.status})` };
    }
  } catch (error: any) {
    console.error('[Brevo addOrUpdateContact] Exception:', error);
    return { success: false, message: error.message || 'Network error or other issue syncing contact.' };
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
    return { success: false, error: 'Brevo API Key not provided.' };
  }

  if (!senderEmail || !recipientEmail) {
    return { success: false, error: 'Both sender and recipient email addresses are required.' };
  }

  const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: subject,
    htmlContent: htmlContent,
  };

  console.log('[Brevo sendTransactionalEmail] Sending email:', {
    from: senderEmail,
    to: recipientEmail,
    subject: subject,
  });

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Brevo sendTransactionalEmail] API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });
      
      // Provide more specific error messages
      let errorMessage = data.message || 'Failed to send email via Brevo.';
      
      if (response.status === 400) {
        if (data.message?.includes('sender')) {
          errorMessage = `Sender email "${senderEmail}" is not verified in Brevo. Please verify this email in your Brevo account Settings → Senders & IP.`;
        } else if (data.message?.includes('unauthorized')) {
          errorMessage = 'Brevo API key does not have permission to send emails. Check your API key permissions.';
        }
      } else if (response.status === 401) {
        errorMessage = 'Invalid Brevo API key. Please check your API key in Settings.';
      } else if (response.status === 402) {
        errorMessage = 'Brevo account has insufficient credits. Please add credits to your Brevo account.';
      }
      
      return { success: false, error: errorMessage };
    }

    const messageId = data.messageId || (data.messageIds && data.messageIds[0]);
    console.log('[Brevo sendTransactionalEmail] Email sent successfully:', {
      messageId,
      to: recipientEmail,
    });
    
    return { messageId, success: true };
  } catch (error: any) {
    console.error('[Brevo sendTransactionalEmail] Exception:', error);
    return { success: false, error: error.message || 'Network error or other issue sending email.' };
  }
}

export async function createBrevoEmailCampaign(apiKey: string, campaignDetails: BrevoCampaignCreationPayload): Promise<CreateCampaignResult> {
  if (!apiKey) {
    return { success: false, error: 'Brevo API Key not provided.' };
  }

  const brevoApiUrl = 'https://api.brevo.com/v3/emailCampaigns';

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(campaignDetails),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Brevo API Error (createEmailCampaign):', responseData);
      return { success: false, error: responseData.message || `Failed to create campaign in Brevo (Status: ${response.status})` };
    }

    return { success: true, id: responseData.id };
  } catch (error: any) {
    console.error('Error creating Brevo campaign:', error);
    return { success: false, error: error.message || 'Network error or other issue creating campaign.' };
  }
}

export async function sendBrevoEmailCampaignNow(apiKey: string, brevoCampaignId: number): Promise<SendCampaignResult> {
  if (!apiKey) {
    return { success: false, error: 'Brevo API Key not provided.' };
  }

  const brevoApiUrl = `https://api.brevo.com/v3/emailCampaigns/${brevoCampaignId}/sendNow`;

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
        if (response.status === 204) { // 204 No Content is a success for sendNow
             return { success: true };
        }
      const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
      console.error('Brevo API Error (sendEmailCampaignNow):', errorData);
      return { success: false, error: errorData.message || `Failed to send campaign (Status: ${response.status})` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending Brevo campaign:', error);
    return { success: false, error: error.message || 'Network error or other issue sending campaign.' };
  }
}

export async function getBrevoEmailCampaigns(
    apiKey: string,
    limit: number = 10,
    offset: number = 0,
    sort: 'desc' | 'asc' = 'desc',
    status?: BrevoAPICampaign['status']
): Promise<GetCampaignsResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }

    let brevoApiUrl = `https://api.brevo.com/v3/emailCampaigns?limit=${limit}&offset=${offset}&sort=${sort}`;
    if (status) {
        brevoApiUrl += `&status=${status}`;
    }

    try {
        const response = await fetch(brevoApiUrl, {
            method: 'GET',
            headers: {
                'api-key': apiKey,
                'Accept': 'application/json',
            },
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error('Brevo API Error (getBrevoEmailCampaigns):', responseData);
            return { success: false, error: responseData.message || `Failed to fetch campaigns from Brevo (Status: ${response.status})` };
        }

        return { success: true, campaigns: responseData.campaigns, count: responseData.count };
    } catch (error: any) {
        console.error('Error fetching Brevo campaigns:', error);
        return { success: false, error: error.message || 'Network error or other issue fetching campaigns.' };
    }
}

export async function getBrevoLists(
    apiKey: string,
    limit: number = 50, // Fetch more lists by default
    offset: number = 0
): Promise<GetListsResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }
    const url = `https://api.brevo.com/v3/contacts/lists?limit=${limit}&offset=${offset}&sort=desc`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'api-key': apiKey, 'Accept': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Brevo API Error (getBrevoLists):', data);
            return { success: false, error: data.message || `Failed to fetch lists (Status: ${response.status})` };
        }
        
        // Debug: Log raw API response to verify field names
        console.log('[Brevo getBrevoLists] Raw API response - lists count:', data.lists?.length);
        if (data.lists && data.lists.length > 0) {
            console.log('[Brevo getBrevoLists] First list item fields:', Object.keys(data.lists[0]));
            console.log('[Brevo getBrevoLists] First list item:', JSON.stringify(data.lists[0], null, 2));
        }
        
        // Map lists to ensure totalSubscribers is properly set
        // Brevo uses 'totalSubscribers' but we also check for alternatives
        const mappedLists = (data.lists || []).map((list: any) => ({
            id: list.id,
            name: list.name,
            totalSubscribers: list.totalSubscribers || list.total_subscribers || list.uniqueSubscribers || list.subscriberCount || 0,
            folderId: list.folderId,
            createdAt: list.createdAt,
        }));
        
        return { success: true, lists: mappedLists, count: data.count };
    } catch (error: any) {
        console.error('Error fetching Brevo lists:', error);
        return { success: false, error: error.message || 'Network error fetching lists.' };
    }
}

export async function getContactsFromBrevoList(
    apiKey: string,
    listId: number,
    limit: number = 50,
    offset: number = 0
): Promise<GetContactsInListResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }
    const url = `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}&sort=desc`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'api-key': apiKey, 'Accept': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Brevo API Error (getContactsFromBrevoList):', data);
            return { success: false, error: data.message || `Failed to fetch contacts from list (Status: ${response.status})` };
        }
        return { success: true, contacts: data.contacts, count: data.count };
    } catch (error: any) {
        console.error(`Error fetching contacts from Brevo list ${listId}:`, error);
        return { success: false, error: error.message || 'Network error fetching contacts.' };
    }
}

export interface CreateListResult {
    listId?: number;
    success: boolean;
    error?: string;
}

export async function createBrevoList(
    apiKey: string,
    listName: string,
    folderId?: number
): Promise<CreateListResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }

    const url = 'https://api.brevo.com/v3/contacts/lists';
    const payload = {
        name: listName,
        folderId: folderId || 1,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Brevo API Error (createBrevoList):', data);
            return { success: false, error: data.message || `Failed to create list (Status: ${response.status})` };
        }

        console.log(`[Brevo] Created list "${listName}" with ID: ${data.id}`);
        return { success: true, listId: data.id };
    } catch (error: any) {
        console.error('Error creating Brevo list:', error);
        return { success: false, error: error.message || 'Network error creating list.' };
    }
}

export interface BulkImportContactsResult {
    success: boolean;
    imported?: number;
    error?: string;
}

export async function bulkImportContactsToBrevoList(
    apiKey: string,
    listId: number,
    contacts: Array<{ email: string; attributes?: Record<string, any> }>
): Promise<BulkImportContactsResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }

    if (!contacts || contacts.length === 0) {
        return { success: false, error: 'No contacts provided for import.' };
    }

    const url = 'https://api.brevo.com/v3/contacts/import';
    
    // Brevo API expects fileBody as CSV-formatted string
    // Format: "EMAIL;ATTRIBUTE1;ATTRIBUTE2\nemail1@example.com;value1;value2"
    const allAttributes = new Set<string>();
    contacts.forEach(c => {
        if (c.attributes) {
            Object.keys(c.attributes).forEach(key => allAttributes.add(key));
        }
    });
    
    const attributeKeys = Array.from(allAttributes);
    const headers = ['EMAIL', ...attributeKeys];
    const csvLines = [headers.join(';')];
    
    contacts.forEach(c => {
        const row = [
            c.email,
            ...attributeKeys.map(key => {
                const value = c.attributes?.[key] || '';
                // Escape semicolons and quotes in values
                return String(value).replace(/;/g, ',').replace(/"/g, '""');
            })
        ];
        csvLines.push(row.join(';'));
    });
    
    const payload = {
        fileBody: csvLines.join('\n'),
        listIds: [listId],
        emailBlacklist: false,
        smsBlacklist: false,
        updateExistingContacts: true,
        emptyContactsAttributes: false,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Brevo API Error (bulkImportContacts):', data);
            return { success: false, error: data.message || `Failed to import contacts (Status: ${response.status})` };
        }

        console.log(`[Brevo] Bulk import initiated for ${contacts.length} contacts to list ${listId}`);
        return { success: true, imported: contacts.length };
    } catch (error: any) {
        console.error('Error importing contacts to Brevo list:', error);
        return { success: false, error: error.message || 'Network error importing contacts.' };
    }
}

export interface DeleteListResult {
    success: boolean;
    error?: string;
}

export async function deleteBrevoList(
    apiKey: string,
    listId: number
): Promise<DeleteListResult> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }

    const url = `https://api.brevo.com/v3/contacts/lists/${listId}`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'api-key': apiKey,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.error('Brevo API Error (deleteBrevoList):', data);
            return { success: false, error: data.message || `Failed to delete list (Status: ${response.status})` };
        }

        console.log(`[Brevo] Deleted list ID: ${listId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting Brevo list:', error);
        return { success: false, error: error.message || 'Network error deleting list.' };
    }
}

export interface BrevoCampaignStatistics {
    success: boolean;
    error?: string;
    stats?: {
        campaignId: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        unsubscribed: number;
        hardBounces: number;
        softBounces: number;
        openRate: number;
        clickRate: number;
        uniqueOpens: number;
        uniqueClicks: number;
    };
}

export async function getBrevoCampaignStatistics(
    apiKey: string,
    campaignId: number
): Promise<BrevoCampaignStatistics> {
    if (!apiKey) {
        return { success: false, error: 'Brevo API Key not provided.' };
    }

    const url = `https://api.brevo.com/v3/emailCampaigns/${campaignId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'api-key': apiKey,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.error('Brevo API Error (getCampaignStatistics):', data);
            return { success: false, error: data.message || `Failed to fetch campaign statistics (Status: ${response.status})` };
        }

        const data = await response.json();
        
        const sent = data.statistics?.globalStats?.sent || 0;
        const delivered = data.statistics?.globalStats?.delivered || 0;
        const opened = data.statistics?.globalStats?.uniqueOpens || 0;
        const clicked = data.statistics?.globalStats?.uniqueClicks || 0;
        const unsubscribed = data.statistics?.globalStats?.unsubscriptions || 0;
        const hardBounces = data.statistics?.globalStats?.hardBounces || 0;
        const softBounces = data.statistics?.globalStats?.softBounces || 0;

        const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
        const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;

        console.log(`[Brevo] Fetched statistics for campaign ID: ${campaignId}`);
        return {
            success: true,
            stats: {
                campaignId,
                sent,
                delivered,
                opened,
                clicked,
                unsubscribed,
                hardBounces,
                softBounces,
                openRate,
                clickRate,
                uniqueOpens: opened,
                uniqueClicks: clicked,
            },
        };
    } catch (error: any) {
        console.error('Error fetching Brevo campaign statistics:', error);
        return { success: false, error: error.message || 'Network error fetching campaign statistics.' };
    }
}
