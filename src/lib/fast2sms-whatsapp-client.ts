/**
 * Fast2SMS WhatsApp Business API Client
 * Zero setup fee, no monthly costs - Pay only for delivered messages
 * Unified SMS + WhatsApp platform for Indian SMEs
 * 
 * Documentation: https://www.fast2sms.com/whatsapp
 */

export interface Fast2SMSWhatsAppConfig {
  apiKey: string;
}

export interface Fast2SMSWhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  components?: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  }[];
}

export interface SendFast2SMSWhatsAppInput {
  templateName: string;
  recipients: {
    phone: string; // With country code, e.g., 919876543210 or 10-digit
    parameters?: string[]; // Template variable values in order [param1, param2, ...]
  }[];
}

export interface SendFast2SMSWhatsAppResult {
  success: boolean;
  messageId?: string;
  results?: {
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
  totalSent?: number;
  totalFailed?: number;
  error?: string;
}

const FAST2SMS_WHATSAPP_API_BASE = 'https://www.fast2sms.com/dev/whatsapp';

/**
 * Format phone number for Fast2SMS WhatsApp
 * Fast2SMS accepts both formats: 919999999999 or 9999999999
 */
export function formatPhoneForFast2SMSWhatsApp(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 91, keep it; otherwise assume 10-digit Indian number
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned; // Keep 91 prefix
  }
  
  // If 10 digits, add 91 prefix
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // Return as-is if already has country code
  return cleaned;
}

/**
 * Validate Fast2SMS WhatsApp configuration
 */
export async function validateFast2SMSWhatsAppConnection(
  config: Fast2SMSWhatsAppConfig
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('[Fast2SMS WhatsApp] Validating connection...');

    if (!config.apiKey) {
      return {
        success: false,
        error: 'API Key is required'
      };
    }

    // Test connection by attempting to get templates (if endpoint available)
    // For now, just validate API key format
    if (config.apiKey.length < 20) {
      return {
        success: false,
        error: 'Invalid API Key format. Please check your Fast2SMS API key.'
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}

/**
 * Get WhatsApp templates from Fast2SMS
 * Note: Template management is primarily done via Fast2SMS dashboard
 */
export async function getFast2SMSWhatsAppTemplates(
  config: Fast2SMSWhatsAppConfig
): Promise<{
  success: boolean;
  templates?: Fast2SMSWhatsAppTemplate[];
  error?: string;
}> {
  try {
    console.log('[Fast2SMS WhatsApp] Templates are managed via Fast2SMS Dashboard');

    // Fast2SMS templates are managed through their dashboard
    // After onboarding, users get 3 default templates (Marketing, Utility, Authentication)
    
    return {
      success: true,
      templates: [],
      error: 'Template management is done via Fast2SMS Dashboard. Please create and approve templates at https://www.fast2sms.com/dashboard'
    };
  } catch (error) {
    console.error('[Fast2SMS WhatsApp] Get templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Send WhatsApp template message to a single recipient
 */
export async function sendSingleFast2SMSWhatsApp(
  config: Fast2SMSWhatsAppConfig,
  input: {
    templateName: string;
    to: string;
    parameters?: string[];
  }
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const url = FAST2SMS_WHATSAPP_API_BASE;

    // Format phone number
    const formattedPhone = formatPhoneForFast2SMSWhatsApp(input.to);

    // Build request payload
    const payload: Record<string, any> = {
      template_name: input.templateName,
      mobile: formattedPhone
    };

    // Add parameters if provided (param1, param2, param3, etc.)
    if (input.parameters && input.parameters.length > 0) {
      input.parameters.forEach((value, index) => {
        payload[`param${index + 1}`] = value;
      });
    }

    console.log('[Fast2SMS WhatsApp] Sending message:', {
      template: input.templateName,
      to: formattedPhone,
      params: input.parameters?.length || 0
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    console.log('[Fast2SMS WhatsApp] Send response:', {
      status: response.status,
      ok: response.ok,
      result
    });

    // Fast2SMS returns { return: true/false, request_id, message }
    if (!result.return || !response.ok) {
      return {
        success: false,
        error: result.message || `Failed to send message (HTTP ${response.status})`
      };
    }

    return {
      success: true,
      messageId: result.request_id || result.id
    };
  } catch (error) {
    console.error('[Fast2SMS WhatsApp] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending WhatsApp message'
    };
  }
}

/**
 * Send bulk WhatsApp template messages
 */
export async function sendBulkFast2SMSWhatsApp(
  config: Fast2SMSWhatsAppConfig,
  input: SendFast2SMSWhatsAppInput
): Promise<SendFast2SMSWhatsAppResult> {
  try {
    console.log('[Fast2SMS WhatsApp] Sending bulk messages:', {
      template: input.templateName,
      recipientCount: input.recipients.length
    });

    const results: {
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }[] = [];

    // Send messages in parallel (with rate limiting consideration)
    const batchSize = 10; // Process 10 at a time to avoid rate limits
    for (let i = 0; i < input.recipients.length; i += batchSize) {
      const batch = input.recipients.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const result = await sendSingleFast2SMSWhatsApp(config, {
            templateName: input.templateName,
            to: recipient.phone,
            parameters: recipient.parameters
          });

          return {
            phone: recipient.phone,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          };
        })
      );

      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < input.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log('[Fast2SMS WhatsApp] Bulk send complete:', {
      totalSent,
      totalFailed
    });

    return {
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed
    };
  } catch (error) {
    console.error('[Fast2SMS WhatsApp] Bulk send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk messages'
    };
  }
}
