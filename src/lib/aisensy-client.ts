/**
 * AiSensy WhatsApp Business API Client
 * Handles bulk WhatsApp messaging through AiSensy platform
 * 42% cheaper than WATI ($29/mo vs $49/mo base fee)
 */

export interface AiSensyConfig {
  apiKey: string;
  campaignName?: string; // Optional default campaign name
}

export interface AiSensyTemplate {
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

export interface SendBulkWhatsAppAiSensyInput {
  campaignName: string;
  recipients: {
    whatsappNumber: string; // With country code, e.g., 919876543210 (no + symbol)
    userName: string;
    templateParams?: string[]; // Template variable values in order
  }[];
}

export interface SendWhatsAppAiSensyResult {
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
 * Send bulk WhatsApp messages via AiSensy
 */
export async function sendBulkWhatsAppAiSensy(
  config: AiSensyConfig,
  input: SendBulkWhatsAppAiSensyInput
): Promise<SendWhatsAppAiSensyResult> {
  try {
    const API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';
    
    const failedRecipients: { whatsappNumber: string; error: string }[] = [];
    const successCount = { count: 0 };

    // AiSensy requires individual API calls for each recipient
    // This is less efficient than WATI's batch API but is how their API works
    const sendPromises = input.recipients.map(async (recipient) => {
      try {
        // If no template params provided, use firstName as default
        // Most AiSensy templates use a single parameter for the first name
        let templateParams = recipient.templateParams;
        if (!templateParams || templateParams.length === 0) {
          // Extract first name from userName
          const nameParts = recipient.userName.trim().split(/\s+/);
          const firstName = nameParts[0] || recipient.userName;
          
          // Use only firstName as default parameter
          // This matches most common AiSensy template patterns
          templateParams = [firstName];
        }

        const requestBody = {
          apiKey: config.apiKey,
          campaignName: input.campaignName || config.campaignName || 'OmniFlow Campaign',
          destination: recipient.whatsappNumber,
          userName: recipient.userName,
          templateParams: templateParams,
          source: 'omniflow-bulk-campaign',
          media: {},
          buttons: [],
          carouselCards: [],
          location: {},
          attributes: {},
          paramsFallbackValue: {
            FirstName: recipient.userName.split(' ')[0] || recipient.userName,
            Name: recipient.userName
          }
        };

        console.log(`[AiSensy] Sending to ${recipient.whatsappNumber}:`, {
          campaignName: requestBody.campaignName,
          destination: requestBody.destination,
          userName: requestBody.userName,
          templateParamsCount: requestBody.templateParams.length,
          templateParams: requestBody.templateParams
        });

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        let result;
        try {
          result = await response.json();
        } catch (e) {
          result = { error: 'Invalid JSON response from AiSensy API' };
        }

        console.log(`[AiSensy] Response for ${recipient.whatsappNumber}:`, {
          status: response.status,
          ok: response.ok,
          result: result
        });

        if (!response.ok || !result.success) {
          const errorMessage = result.message || result.error || result.info || 
                              (typeof result === 'string' ? result : null) ||
                              `HTTP ${response.status}: ${response.statusText}`;
          
          console.error(`[AiSensy] Failed for ${recipient.whatsappNumber}:`, {
            status: response.status,
            fullResponse: result,
            errorMessage
          });

          failedRecipients.push({
            whatsappNumber: recipient.whatsappNumber,
            error: errorMessage,
          });
        } else {
          successCount.count++;
          console.log(`[AiSensy] Success for ${recipient.whatsappNumber}`);
        }
      } catch (error) {
        console.error(`[AiSensy] Exception for ${recipient.whatsappNumber}:`, error);
        failedRecipients.push({
          whatsappNumber: recipient.whatsappNumber,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    });

    await Promise.all(sendPromises);

    console.log(`[AiSensy] Campaign complete. Success: ${successCount.count}, Failed: ${failedRecipients.length}`);

    // If all messages failed, return a helpful error
    if (successCount.count === 0 && failedRecipients.length > 0) {
      const firstError = failedRecipients[0].error;
      const uniqueErrors = [...new Set(failedRecipients.map(f => f.error))];
      
      let errorMessage = `All messages failed. `;
      if (uniqueErrors.length === 1) {
        errorMessage += `Reason: ${firstError}`;
      } else {
        errorMessage += `Multiple errors occurred. First error: ${firstError}`;
      }
      
      console.error('[AiSensy] All messages failed:', uniqueErrors);
      
      return {
        success: false,
        error: errorMessage,
        result: {
          id: `aisensy_${Date.now()}`,
          failed: failedRecipients,
        },
      };
    }

    return {
      success: successCount.count > 0,
      result: {
        id: `aisensy_${Date.now()}`,
        failed: failedRecipients.length > 0 ? failedRecipients : undefined,
      },
    };
  } catch (error) {
    console.error('[AiSensy] sendBulkWhatsApp exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending messages',
    };
  }
}

/**
 * Send a single WhatsApp message via AiSensy (for testing)
 */
export async function sendSingleWhatsAppAiSensy(
  config: AiSensyConfig,
  campaignName: string,
  whatsappNumber: string,
  userName: string,
  templateParams?: string[]
): Promise<SendWhatsAppAiSensyResult> {
  return sendBulkWhatsAppAiSensy(config, {
    campaignName,
    recipients: [{ whatsappNumber, userName, templateParams }],
  });
}

/**
 * Validate AiSensy API connection
 * Note: AiSensy doesn't have a dedicated validation endpoint, so we'll try to send to a test number
 */
export async function validateAiSensyConnection(config: AiSensyConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // AiSensy doesn't have a templates endpoint like WATI
    // We can validate by checking if the API key format is correct
    // and attempting a minimal API call (without actually sending)
    
    if (!config.apiKey || config.apiKey.trim() === '') {
      return {
        success: false,
        error: 'API Key is required',
      };
    }

    // For now, we'll just validate the key exists
    // In production, you might want to make a test API call to a specific endpoint
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection',
    };
  }
}

/**
 * Format phone number for AiSensy (remove + and spaces)
 */
export function formatPhoneForAiSensy(phone: string): string {
  // Remove +, spaces, dashes, parentheses
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Validate phone number format (should have country code)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneForAiSensy(phone);
  // Should be 10-15 digits
  return /^\d{10,15}$/.test(cleaned);
}
