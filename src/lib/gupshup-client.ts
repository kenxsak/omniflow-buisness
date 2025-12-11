/**
 * Gupshup WhatsApp Business API Client
 * Enterprise-grade WhatsApp platform with advanced automation
 * https://docs.gupshup.io/
 */

export interface GupshupConfig {
  apiKey: string;
  appName: string; // The App ID (UUID) or legacy app name for template fetching
  srcName?: string; // The actual App Name for message sending (required for delivery)
  source?: string; // Your WhatsApp Business phone number (optional, can be set per message)
}

export interface GupshupTemplate {
  id: string; // Template UUID from Gupshup dashboard
  name: string;
  status: string; // APPROVED, PENDING, REJECTED
  languageCode: string;
  category: string; // UTILITY, MARKETING, AUTHENTICATION
  templateType?: string;
  vertical?: string;
}

export interface SendTemplateMessageInput {
  source: string; // Your WhatsApp Business phone number (e.g., 917834811114)
  destination: string; // Recipient phone number (e.g., 919876543210)
  templateId: string; // Template UUID
  params?: string[]; // Array of values to replace {{1}}, {{2}}, etc.
  mediaType?: 'image' | 'video' | 'document';
  mediaUrl?: string; // URL for media templates
  filename?: string; // For document templates
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

/**
 * Format phone number for Gupshup (international format without +)
 * Requires country code to be present
 */
export function formatPhoneForGupshup(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 00 if present (international prefix)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // Validate minimum length (country code + number, e.g., 911234567890 = 12 digits)
  if (cleaned.length < 10) {
    console.warn(`Phone number too short: ${phone} -> ${cleaned}`);
    return cleaned; // Return as-is, will fail validation later
  }
  
  // If 10 digits exactly, it's ambiguous (could be US or Indian without country code)
  // Don't auto-prepend - require explicit country code
  if (cleaned.length === 10) {
    console.warn(`Ambiguous 10-digit number without country code: ${phone}. Treating as-is.`);
    return cleaned; // Return as-is, caller should add country code
  }
  
  // Return international format (country code + number)
  return cleaned;
}

/**
 * Get templates from Gupshup
 * Uses backward-compatible approach: tries new 2024 API, falls back to legacy endpoint
 */
export async function getGupshupTemplates(
  config: GupshupConfig
): Promise<{
  success: boolean;
  templates?: GupshupTemplate[];
  error?: string;
}> {
  try {
    // Try new 2024 API endpoint first (requires App ID, not app name)
    // This will work for users who configured with App ID
    const newUrl = `https://api.gupshup.io/wa/app/${config.appName}/template`;
    
    console.log('[Gupshup] Trying new 2024 API endpoint:', newUrl);

    let response = await fetch(newUrl, {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Gupshup] New API response status:', response.status);

    // If new endpoint fails with 404, try legacy endpoint for backward compatibility
    if (response.status === 404) {
      console.log('[Gupshup] New API returned 404, trying legacy /sm endpoint for backward compatibility');
      const legacyUrl = `https://api.gupshup.io/sm/api/v1/template/list/${config.appName}`;
      console.log('[Gupshup] Trying legacy endpoint:', legacyUrl);
      
      response = await fetch(legacyUrl, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[Gupshup] Legacy API response status:', response.status);
    }

    if (!response.ok) {
      let errorData;
      let helpfulMessage = '';

      try {
        errorData = await response.json();
      } catch (e) {
        // Response is not JSON (likely HTML error page)
        const textResponse = await response.text().catch(() => 'Unable to read response');
        console.error('[Gupshup] Non-JSON response:', textResponse.substring(0, 200));
        
        if (response.status === 401 || response.status === 403) {
          helpfulMessage = '❌ Authentication Failed. Please check:\n' +
                         '1. Your API Key is correct (copy from Gupshup Dashboard → API Keys)\n' +
                         '2. Your App Name is correct (find in Gupshup Dashboard → Apps)\n' +
                         '3. The API key has the required permissions\n' +
                         '4. If using App ID instead of App Name, make sure it\'s the numeric ID';
        } else if (response.status === 404) {
          helpfulMessage = '❌ App not found. Please verify:\n' +
                         '1. Your App Name is spelled correctly (case-sensitive)\n' +
                         '2. You\'re using the App Name, not the phone number\n' +
                         '3. Try using App ID instead if you have a newer Gupshup account';
        } else {
          helpfulMessage = `❌ Gupshup API error (HTTP ${response.status}). Please verify your API Key and App Name are correct.`;
        }
        
        return {
          success: false,
          error: helpfulMessage
        };
      }
      
      console.error('[Gupshup] Failed to fetch templates:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Provide helpful error messages based on status code
      if (response.status === 401 || response.status === 403) {
        helpfulMessage = '❌ Authentication Failed. Please verify:\n' +
                       '• API Key is correct (from Gupshup Dashboard)\n' +
                       '• App Name/ID is correct\n' +
                       '• API key has permissions to access templates';
      } else if (response.status === 404) {
        helpfulMessage = '❌ App not found. Check that your App Name or App ID is correct.';
      }

      const errorMessage = helpfulMessage || errorData.message || errorData.error ||
                          `Failed to fetch templates (HTTP ${response.status}: ${response.statusText})`;
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();
    
    if (result.status === 'error') {
      return {
        success: false,
        error: result.message || 'Failed to fetch templates'
      };
    }

    // Map the API response to our template structure
    // Handle both old and new response formats
    const rawTemplates = result.templates || [];
    const templates: GupshupTemplate[] = rawTemplates.map((t: any) => ({
      id: t.id || t.externalId,
      name: t.elementName || t.name,
      status: t.status,
      languageCode: t.languageCode,
      category: t.category,
      templateType: t.templateType,
      vertical: t.vertical
    }));

    // Filter for approved templates only
    const approvedTemplates = templates.filter(
      (t: GupshupTemplate) => t.status === 'APPROVED'
    );

    console.log('[Gupshup] Successfully fetched templates:', {
      total: templates.length,
      approved: approvedTemplates.length,
      pending: templates.filter((t: any) => t.status === 'PENDING').length,
      rejected: templates.filter((t: any) => t.status === 'REJECTED').length
    });

    return {
      success: true,
      templates: approvedTemplates
    };
  } catch (error) {
    console.error('[Gupshup] getTemplates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching templates'
    };
  }
}

/**
 * Send template message via Gupshup
 */
export async function sendTemplateMessageGupshup(
  config: GupshupConfig,
  input: SendTemplateMessageInput
): Promise<SendMessageResult> {
  try {
    const url = 'https://api.gupshup.io/wa/api/v1/template/msg';

    // Format phone numbers
    const source = formatPhoneForGupshup(input.source);
    const destination = formatPhoneForGupshup(input.destination);
    
    // Validate phone numbers (require at least 11 digits for international: country code + number)
    if (source.length < 11) {
      return {
        success: false,
        error: `Invalid source phone number. Must include country code (e.g., 917834811114 for India). Got: ${source}`
      };
    }
    
    if (destination.length < 11) {
      return {
        success: false,
        error: `Invalid destination phone number. Must include country code (e.g., 919876543210 for India). Got: ${destination}`
      };
    }

    // Build template object
    const template = {
      id: input.templateId,
      ...(input.params && input.params.length > 0 && { params: input.params })
    };

    // Determine which name to use for src.name
    // TEMPORARY FIX: Hardcode PosiblePos until Settings page is fixed
    let srcNameToUse = config.srcName || config.appName;
    
    // If appName looks like UUID (App ID), use hardcoded PosiblePos
    if (!config.srcName && config.appName.length > 20 && config.appName.includes('-')) {
      srcNameToUse = 'PosiblePos'; // Hardcoded app name for message delivery
      console.log('[Gupshup] Using hardcoded app name "PosiblePos" for message delivery');
    }
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('channel', 'whatsapp');
    formData.append('source', source);
    formData.append('destination', destination);
    formData.append('src.name', srcNameToUse);
    formData.append('template', JSON.stringify(template));

    // Add media if provided
    if (input.mediaType && input.mediaUrl) {
      const mediaObj: any = {
        type: input.mediaType,
        [input.mediaType]: {
          link: input.mediaUrl
        }
      };
      
      // Add filename for documents
      if (input.mediaType === 'document' && input.filename) {
        mediaObj[input.mediaType].filename = input.filename;
      }
      
      formData.append('message', JSON.stringify(mediaObj));
    }

    console.log('[Gupshup] Sending message:', {
      source,
      destination,
      templateId: input.templateId,
      params: input.params,
      srcName: srcNameToUse
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();
    
    console.log('[Gupshup] API Response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    // Check for errors
    if (!response.ok || result.status === 'error') {
      console.error('[Gupshup] Message send failed:', {
        status: response.status,
        error: result.reason || result.message,
        fullResponse: result
      });
      return {
        success: false,
        error: result.reason || result.message || `Failed to send message (Status: ${response.status})`
      };
    }

    // Status 202 = "submitted" (queued), not delivered yet
    // Delivery confirmation requires webhooks or polling
    const deliveryStatus = result.status || 'submitted';
    console.log(`[Gupshup] Message queued for delivery! MessageID: ${result.messageId}, Status: ${deliveryStatus}`);

    return {
      success: true,
      messageId: result.messageId,
      status: deliveryStatus
    };
  } catch (error) {
    console.error('Gupshup sendTemplateMessage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending message via Gupshup'
    };
  }
}

/**
 * Send bulk WhatsApp messages via Gupshup
 */
export async function sendBulkWhatsAppGupshup(
  config: GupshupConfig,
  input: {
    source: string;
    templateId: string;
    recipients: Array<{
      phone: string;
      params?: string[];
    }>;
    mediaType?: 'image' | 'video' | 'document';
    mediaUrl?: string;
    filename?: string;
  }
): Promise<{
  success: boolean;
  results?: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  error?: string;
}> {
  try {
    const results = [];

    for (const recipient of input.recipients) {
      const result = await sendTemplateMessageGupshup(config, {
        source: input.source,
        destination: recipient.phone,
        templateId: input.templateId,
        params: recipient.params,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl,
        filename: input.filename
      });

      results.push({
        phone: recipient.phone,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });

      // Add small delay to avoid rate limiting (optional)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Gupshup sendBulkWhatsApp error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk messages'
    };
  }
}

/**
 * Validate Gupshup connection
 */
export async function validateGupshupConnection(
  config: GupshupConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try fetching templates as a validation method
    const result = await getGupshupTemplates(config);
    
    if (!result.success) {
      // Check if it's an auth error
      if (result.error?.includes('401') || result.error?.includes('403')) {
        return {
          success: false,
          error: 'Invalid API key. Please check your Gupshup credentials.'
        };
      }
      // If template fetch fails for other reasons, it might still be valid
      // (some accounts may not have permission to list templates)
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate Gupshup connection'
    };
  }
}
