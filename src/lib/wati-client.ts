/**
 * WATI WhatsApp Business API Client
 * Handles bulk WhatsApp messaging through WATI platform
 */

export interface WATIConfig {
  apiKey: string;
  accountUrl: string; // e.g., "https://live-server-12345.wati.io"
}

export interface WATITemplate {
  id: string;
  name: string;
  elementName: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  components?: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  }[];
}

export interface SendBulkWhatsAppInput {
  templateName: string;
  recipients: {
    whatsappNumber: string; // With country code, e.g., 919876543210 (no + symbol)
    customParams?: string[]; // Template variable values in order
  }[];
  broadcastName?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  result?: {
    id?: string;
    failed?: {
      whatsappNumber: string;
      error: string;
    }[];
  };
  error?: string;
}

/**
 * Get all WhatsApp templates from WATI
 */
export async function getWATITemplates(config: WATIConfig): Promise<{
  success: boolean;
  templates?: WATITemplate[];
  error?: string;
}> {
  try {
    console.log('[WATI] Fetching templates from:', config.accountUrl);

    // Validate account URL format
    if (!config.accountUrl || !config.accountUrl.includes('wati.io')) {
      return {
        success: false,
        error: 'Invalid WATI Account URL. It should look like: https://live-server-12345.wati.io (without trailing slash)'
      };
    }

    // Ensure no trailing slash
    const cleanUrl = config.accountUrl.replace(/\/$/, '');

    const response = await fetch(`${cleanUrl}/api/v1/getMessageTemplates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[WATI] Templates response status:', response.status);
    console.log('[WATI] Response content-type:', response.headers.get('content-type'));

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      let errorData;
      let helpfulMessage = '';

      try {
        if (isJson) {
          errorData = await response.json();
        } else {
          // Response is HTML or text (likely an error page)
          const textResponse = await response.text();
          console.error('[WATI] Non-JSON response:', textResponse.substring(0, 200));
          
          if (response.status === 401 || response.status === 403) {
            helpfulMessage = '❌ Authentication failed. Please check:\n' +
                           '1. Your API Key is correct (copy from WATI Dashboard → API Docs)\n' +
                           '2. Your Account URL format is correct (e.g., https://live-server-12345.wati.io)\n' +
                           '3. The API key has the required permissions';
          } else if (response.status === 404) {
            helpfulMessage = '❌ API endpoint not found. Please verify your Account URL is correct and doesn\'t have extra paths or trailing slashes.';
          } else {
            helpfulMessage = `❌ WATI API returned an error (HTTP ${response.status}). The response was not in JSON format. Please check your Account URL and try again.`;
          }
          
          return {
            success: false,
            error: helpfulMessage
          };
        }
      } catch (e) {
        return {
          success: false,
          error: `Failed to communicate with WATI API (HTTP ${response.status}). Please verify your Account URL and API Key are correct.`
        };
      }
      
      console.error('[WATI] Failed to fetch templates:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      const errorMessage = errorData.message || errorData.error || errorData.info ||
                          `Failed to fetch templates (HTTP ${response.status}: ${response.statusText})`;
      
      return { 
        success: false, 
        error: errorMessage
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return {
        success: false,
        error: '❌ WATI API returned invalid JSON. Please check your Account URL is correct and points to the WATI API server.'
      };
    }
    const templates = data.messageTemplates || [];

    console.log('[WATI] Successfully fetched templates:', {
      total: templates.length,
      approved: templates.filter((t: any) => t.status === 'APPROVED').length,
      pending: templates.filter((t: any) => t.status === 'PENDING').length,
      rejected: templates.filter((t: any) => t.status === 'REJECTED').length
    });

    return { success: true, templates };
  } catch (error) {
    console.error('[WATI] getTemplates exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error fetching templates' 
    };
  }
}

/**
 * Send bulk WhatsApp messages via WATI
 */
export async function sendBulkWhatsAppWATI(
  config: WATIConfig,
  input: SendBulkWhatsAppInput
): Promise<SendWhatsAppResult> {
  try {
    const requestBody = {
      template_name: input.templateName,
      broadcast_name: input.broadcastName || `Campaign ${Date.now()}`,
      receivers: input.recipients
    };

    console.log('[WATI] Sending bulk messages:', {
      template: requestBody.template_name,
      broadcast: requestBody.broadcast_name,
      recipientCount: requestBody.receivers.length
    });

    const response = await fetch(`${config.accountUrl}/api/v1/sendTemplateMessages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = { error: 'Invalid JSON response from WATI API' };
    }

    console.log('[WATI] Bulk send response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    if (!response.ok) {
      const errorMessage = result.message || result.error || result.info ||
                          `Failed to send messages (HTTP ${response.status}: ${response.statusText})`;
      
      console.error('[WATI] Bulk send failed:', {
        status: response.status,
        fullResponse: result,
        errorMessage
      });

      return { 
        success: false, 
        error: errorMessage
      };
    }

    // Check for partial failures
    const failed = result.failed || [];
    
    console.log('[WATI] Bulk send complete:', {
      campaignId: result.id,
      totalRecipients: input.recipients.length,
      failedCount: failed.length
    });

    return { 
      success: true, 
      result: {
        id: result.id,
        failed: failed.length > 0 ? failed : undefined
      }
    };
  } catch (error) {
    console.error('[WATI] sendBulkWhatsApp exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error sending messages' 
    };
  }
}

/**
 * Send a single WhatsApp message via WATI (for testing)
 */
export async function sendSingleWhatsAppWATI(
  config: WATIConfig,
  templateName: string,
  whatsappNumber: string,
  customParams?: string[]
): Promise<SendWhatsAppResult> {
  return sendBulkWhatsAppWATI(config, {
    templateName,
    recipients: [{ whatsappNumber, customParams }],
    broadcastName: `Test Message ${Date.now()}`
  });
}

/**
 * Validate WATI API connection
 */
export async function validateWATIConnection(config: WATIConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await getWATITemplates(config);
    return {
      success: result.success,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}

/**
 * Format phone number for WATI (remove + and spaces)
 */
export function formatPhoneForWATI(phone: string): string {
  // Remove +, spaces, dashes, parentheses
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Validate phone number format (should have country code)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneForWATI(phone);
  // Should be 10-15 digits
  return /^\d{10,15}$/.test(cleaned);
}
