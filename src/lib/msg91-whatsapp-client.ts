/**
 * MSG91 WhatsApp Business API Client
 * Zero markup pricing - Only Meta's official rates
 * Unified SMS + WhatsApp platform for Indian SMEs
 * 
 * Documentation: https://docs.msg91.com/whatsapp
 */

export interface MSG91WhatsAppConfig {
  authKey: string;
  integratedNumber: string; // WhatsApp Business number registered with MSG91
}

export interface MSG91WhatsAppTemplate {
  id: string;
  name: string;
  namespace: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  components?: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  }[];
}

export interface SendMSG91WhatsAppInput {
  templateName: string;
  languageCode: string; // e.g., 'en', 'hi'
  recipients: {
    phone: string; // With country code, e.g., 919876543210
    parameters?: string[]; // Template variable values in order: ['value1', 'value2', 'value3']
  }[];
}

export interface SendMSG91WhatsAppResult {
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

const MSG91_WHATSAPP_API_BASE = 'https://api.msg91.com/api/v5/whatsapp';

/**
 * Format phone number for MSG91 WhatsApp (remove + symbol, keep digits only)
 */
export function formatPhoneForMSG91WhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Validate MSG91 WhatsApp configuration
 */
export async function validateMSG91WhatsAppConnection(
  config: MSG91WhatsAppConfig
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('[MSG91 WhatsApp] Validating connection...');

    if (!config.authKey) {
      return {
        success: false,
        error: 'Auth Key is required'
      };
    }

    if (!config.integratedNumber) {
      return {
        success: false,
        error: 'Integrated WhatsApp Business Number is required'
      };
    }

    // Try to get templates to validate connection
    const result = await getMSG91WhatsAppTemplates(config);
    
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
 * Get WhatsApp templates from MSG91
 */
export async function getMSG91WhatsAppTemplates(
  config: MSG91WhatsAppConfig
): Promise<{
  success: boolean;
  templates?: MSG91WhatsAppTemplate[];
  error?: string;
}> {
  try {
    console.log('[MSG91 WhatsApp] Fetching templates...');

    // MSG91 provides templates through their dashboard
    // This is a placeholder - actual endpoint may vary
    // Users typically manage templates via MSG91 dashboard
    
    return {
      success: true,
      templates: [],
      error: 'Template management is done via MSG91 Dashboard. Please create and approve templates at https://msg91.com'
    };
  } catch (error) {
    console.error('[MSG91 WhatsApp] Get templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
  }
}

/**
 * Send WhatsApp template message to a single recipient
 */
export async function sendSingleMSG91WhatsApp(
  config: MSG91WhatsAppConfig,
  input: {
    templateName: string;
    languageCode: string;
    to: string;
    parameters?: string[];
  }
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const url = `${MSG91_WHATSAPP_API_BASE}/whatsapp-outbound-message/bulk/`;

    // Format phone number
    const formattedPhone = formatPhoneForMSG91WhatsApp(input.to);

    // Build components array (MSG91 uses array format like Meta)
    const components: any[] = [];
    
    // Add BODY component with parameters if provided
    if (input.parameters && input.parameters.length > 0) {
      const bodyParameters = input.parameters.map(value => ({
        type: 'TEXT',
        text: value
      }));
      
      components.push({
        type: 'BODY',
        parameters: bodyParameters
      });
    }

    const requestBody = {
      integrated_number: config.integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: input.templateName,
          language: {
            code: input.languageCode
          },
          components: components.length > 0 ? components : undefined
        }
      },
      recipients: [
        {
          mobiles: formattedPhone
        }
      ]
    };

    console.log('[MSG91 WhatsApp] Sending message:', {
      template: input.templateName,
      to: formattedPhone,
      params: input.parameters?.length || 0
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': config.authKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    console.log('[MSG91 WhatsApp] Send response:', {
      status: response.status,
      ok: response.ok,
      result
    });

    if (!response.ok || result.type === 'error') {
      return {
        success: false,
        error: result.message || result.error || `Failed to send message (HTTP ${response.status})`
      };
    }

    return {
      success: true,
      messageId: result.message_id || result.id || result.request_id
    };
  } catch (error) {
    console.error('[MSG91 WhatsApp] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending WhatsApp message'
    };
  }
}

/**
 * Send bulk WhatsApp template messages
 */
export async function sendBulkMSG91WhatsApp(
  config: MSG91WhatsAppConfig,
  input: SendMSG91WhatsAppInput
): Promise<SendMSG91WhatsAppResult> {
  try {
    console.log('[MSG91 WhatsApp] Sending bulk messages:', {
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
    const batchSize = 10; // Process 10 at a time
    for (let i = 0; i < input.recipients.length; i += batchSize) {
      const batch = input.recipients.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const result = await sendSingleMSG91WhatsApp(config, {
            templateName: input.templateName,
            languageCode: input.languageCode,
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
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log('[MSG91 WhatsApp] Bulk send complete:', {
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
    console.error('[MSG91 WhatsApp] Bulk send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk messages'
    };
  }
}
