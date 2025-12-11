/**
 * Meta WhatsApp Cloud API Client
 * Direct integration with Meta's WhatsApp Business Platform
 * Zero markup - pay only Meta's official rates
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface MetaWhatsAppConfig {
  phoneNumberId: string;  // WhatsApp Business Phone Number ID
  accessToken: string;    // Permanent access token from Meta
  wabaId?: string;        // WhatsApp Business Account ID (optional)
}

export interface MetaWhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
  }[];
}

export interface SendMetaWhatsAppInput {
  to: string;              // Phone number with country code (e.g., 919876543210)
  templateName: string;
  languageCode: string;    // e.g., 'en', 'hi', 'en_US'
  components?: {
    type: 'header' | 'body' | 'button';
    parameters: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }[];
  }[];
}

export interface SendMetaWhatsAppBulkInput {
  templateName: string;
  languageCode: string;
  recipients: {
    phone: string;
    parameters?: string[]; // Template variable values in order
  }[];
}

export interface SendMetaWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorDetails?: any;
}

export interface SendMetaWhatsAppBulkResult {
  success: boolean;
  results: {
    phone: string;
    messageId?: string;
    success: boolean;
    error?: string;
  }[];
  totalSent: number;
  totalFailed: number;
}

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Format phone number for Meta API (remove + symbol, keep digits only)
 */
export function formatPhoneForMeta(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Validate Meta WhatsApp configuration
 */
export async function validateMetaConnection(config: MetaWhatsAppConfig): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('[Meta] Validating connection...');

    if (!config.phoneNumberId || !config.accessToken) {
      return {
        success: false,
        error: 'Phone Number ID and Access Token are required'
      };
    }

    // Verify phone number access
    const response = await fetch(
      `${META_API_BASE}/${config.phoneNumberId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Meta] Validation failed:', errorData);
      
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData
      };
    }

    const data = await response.json();
    console.log('[Meta] Validation successful:', data);

    return {
      success: true,
      details: {
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating
      }
    };
  } catch (error) {
    console.error('[Meta] Validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Get all message templates from Meta
 */
export async function getMetaWhatsAppTemplates(config: MetaWhatsAppConfig): Promise<{
  success: boolean;
  templates?: MetaWhatsAppTemplate[];
  error?: string;
}> {
  try {
    console.log('[Meta] Fetching templates...');

    if (!config.wabaId) {
      return {
        success: false,
        error: 'WABA ID is required to fetch templates'
      };
    }

    const response = await fetch(
      `${META_API_BASE}/${config.wabaId}/message_templates?limit=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Meta] Failed to fetch templates:', errorData);
      
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    const templates: MetaWhatsAppTemplate[] = (data.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      status: t.status,
      language: t.language,
      components: t.components || []
    }));

    console.log(`[Meta] Fetched ${templates.length} templates`);

    return {
      success: true,
      templates: templates.filter(t => t.status === 'APPROVED')
    };
  } catch (error) {
    console.error('[Meta] Templates fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send a single WhatsApp message via Meta Cloud API
 */
export async function sendMetaWhatsAppMessage(
  config: MetaWhatsAppConfig,
  input: SendMetaWhatsAppInput
): Promise<SendMetaWhatsAppResult> {
  try {
    console.log('[Meta] Sending message to:', input.to);

    const formattedPhone = formatPhoneForMeta(input.to);

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: input.templateName,
        language: {
          code: input.languageCode
        }
      }
    };

    // Add components if provided
    if (input.components && input.components.length > 0) {
      payload.template.components = input.components;
    }

    const response = await fetch(
      `${META_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Meta] Message send failed:', responseData);
      return {
        success: false,
        error: responseData.error?.message || `HTTP ${response.status}`,
        errorDetails: responseData
      };
    }

    console.log('[Meta] Message sent successfully:', responseData);

    return {
      success: true,
      messageId: responseData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[Meta] Message send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send bulk WhatsApp messages via Meta Cloud API
 * Note: Meta doesn't have a true bulk API, so we send individual messages
 */
export async function sendBulkMetaWhatsApp(
  config: MetaWhatsAppConfig,
  input: SendMetaWhatsAppBulkInput
): Promise<SendMetaWhatsAppBulkResult> {
  try {
    console.log(`[Meta] Sending bulk messages to ${input.recipients.length} recipients`);

    const results = await Promise.all(
      input.recipients.map(async (recipient) => {
        try {
          // Build components from parameters
          const components: SendMetaWhatsAppInput['components'] = [];
          
          if (recipient.parameters && recipient.parameters.length > 0) {
            components.push({
              type: 'body',
              parameters: recipient.parameters.map(param => ({
                type: 'text',
                text: param
              }))
            });
          }

          const result = await sendMetaWhatsAppMessage(config, {
            to: recipient.phone,
            templateName: input.templateName,
            languageCode: input.languageCode,
            components
          });

          return {
            phone: recipient.phone,
            messageId: result.messageId,
            success: result.success,
            error: result.error
          };
        } catch (error) {
          return {
            phone: recipient.phone,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log(`[Meta] Bulk send complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed
    };
  } catch (error) {
    console.error('[Meta] Bulk send error:', error);
    return {
      success: false,
      results: [],
      totalSent: 0,
      totalFailed: input.recipients.length
    };
  }
}
