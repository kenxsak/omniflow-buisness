/**
 * Fast2SMS API Client
 * Lightning-fast bulk SMS delivery in India
 * https://docs.fast2sms.com/
 */

export interface Fast2SMSConfig {
  apiKey: string;
  senderId?: string; // Optional 6-character sender ID for promotional SMS
}

export interface SendBulkSMSFast2SMSInput {
  message: string;
  recipients: string[]; // Array of 10-digit mobile numbers
  route?: 'q' | 'dlt' | 'otp'; // q = Quick SMS (no DLT), dlt = DLT approved, otp = OTP messages
  language?: 'english' | 'unicode';
  dltTemplateId?: string; // Required for DLT route, can also be OTP template with {#var#} placeholder
  variables?: string; // Pipe-separated variables for template (e.g., "value1|value2")
  scheduledTime?: number; // Unix timestamp for scheduling (optional) - schedules message for future delivery
}

export interface SendSMSFast2SMSResult {
  success: boolean;
  requestId?: string;
  message?: string[];
  error?: string;
}

/**
 * Format phone number for Fast2SMS (10-digit Indian mobile)
 */
export function formatPhoneForFast2SMS(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with +91, remove it
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.substring(2);
  }
  
  // Return last 10 digits
  const result = cleaned.slice(-10);
  
  // Validate it's exactly 10 digits
  if (result.length !== 10) {
    console.warn(`Invalid phone number format: ${phone} -> ${result}`);
  }
  
  return result;
}

/**
 * Send bulk SMS via Fast2SMS
 * Uses POST with JSON body and Authorization header
 */
export async function sendBulkSMSFast2SMS(
  config: Fast2SMSConfig,
  input: SendBulkSMSFast2SMSInput
): Promise<SendSMSFast2SMSResult> {
  try {
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    
    // Format and validate recipients
    const formattedNumbers = input.recipients.map(formatPhoneForFast2SMS);
    const invalidNumbers = formattedNumbers.filter(num => num.length !== 10);
    
    if (invalidNumbers.length > 0) {
      return {
        success: false,
        error: `Invalid phone numbers detected (must be 10 digits): ${invalidNumbers.slice(0, 3).join(', ')}${invalidNumbers.length > 3 ? ` and ${invalidNumbers.length - 3} more` : ''}`
      };
    }
    
    const numbers = formattedNumbers.join(',');
    
    // Default to Quick SMS route if not specified
    const route = input.route || 'q';
    
    // Build JSON payload for POST request
    const payload: Record<string, any> = {
      route,
      numbers,
      flash: 0, // 0 = no flash, 1 = flash message
    };

    // Add scheduling if provided
    if (input.scheduledTime) {
      payload.time = input.scheduledTime; // Unix timestamp for scheduled delivery
    }
    
    // Add route-specific parameters
    if (route === 'dlt') {
      // DLT route requires sender_id and message (template ID)
      if (!config.senderId) {
        return {
          success: false,
          error: 'DLT route requires a sender ID. Please configure it in Settings.'
        };
      }
      if (!input.dltTemplateId) {
        return {
          success: false,
          error: 'DLT route requires a template ID (message parameter)'
        };
      }
      payload.sender_id = config.senderId;
      payload.message = input.dltTemplateId; // For DLT, message is the template ID
      
      // Add variables if provided - Fast2SMS expects pipe-separated values
      if (input.variables) {
        // Ensure variables are properly formatted (pipe-separated for multiple, pipe-terminated for single)
        const varsString = input.variables.trim();
        // If variables don't end with pipe, add it (Fast2SMS requirement)
        payload.variables_values = varsString.endsWith('|') ? varsString : varsString + '|';
      }
    } else if (route === 'otp') {
      // OTP route requires both message template and variables_values
      // message should contain the template with {#var#} placeholder
      payload.message = input.dltTemplateId || 'Your OTP is {#var#}. Valid for 10 minutes.';
      // For OTP, pass the OTP code as the variable value with pipe terminator
      const otp = input.message.trim();
      payload.variables_values = otp.endsWith('|') ? otp : otp + '|';
    } else {
      // Quick SMS route - message is the actual text
      payload.message = input.message;
    }

    console.log(`[Fast2SMS] Sending ${route} SMS to ${formattedNumbers.length} recipients via POST JSON`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // Fast2SMS returns { return: true/false, request_id, message: [] or string }
    if (!result.return || !response.ok) {
      // Handle message being array, string, or other types
      let errorMessage = `Failed to send SMS (Status: ${response.status})`;
      if (result.message) {
        if (Array.isArray(result.message)) {
          errorMessage = result.message.join(', ');
        } else if (typeof result.message === 'string') {
          errorMessage = result.message;
        } else {
          errorMessage = String(result.message);
        }
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    console.log(`[Fast2SMS] SMS sent successfully. Request ID: ${result.request_id}`);

    return {
      success: true,
      requestId: result.request_id,
      message: result.message
    };
  } catch (error) {
    console.error('Fast2SMS sendBulkSMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending SMS via Fast2SMS'
    };
  }
}

/**
 * Send OTP via Fast2SMS
 */
export async function sendOTPFast2SMS(
  config: Fast2SMSConfig,
  phone: string,
  otp: string
): Promise<SendSMSFast2SMSResult> {
  return sendBulkSMSFast2SMS(config, {
    message: otp,
    recipients: [phone],
    route: 'otp'
  });
}

/**
 * Validate Fast2SMS connection
 */
export async function validateFast2SMSConnection(
  config: Fast2SMSConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // Test with a dry-run to validate API key via POST JSON
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: 'Test',
        numbers: '1234567890', // Dummy number for validation
        flash: 0
      })
    });

    // Even if the message fails, a valid API key will return a proper response structure
    const result = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Invalid API key. Please check your Fast2SMS credentials.'
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate Fast2SMS connection'
    };
  }
}

/**
 * Check if message contains Unicode characters
 */
export function isUnicodeMessage(message: string): boolean {
  // Check for non-ASCII characters (Hindi, emoji, special chars)
  return /[^\x00-\x7F]/.test(message);
}

/**
 * Calculate SMS count based on message length
 * Standard SMS: 160 chars per SMS
 * Unicode SMS: 70 chars per SMS
 */
export function calculateSMSCount(message: string, unicode: boolean = false): number {
  const maxLength = unicode ? 70 : 160;
  const messageLength = message.length;
  
  if (messageLength === 0) return 0;
  if (messageLength <= maxLength) return 1;
  
  // For concatenated messages, each part is slightly smaller (153 for GSM, 67 for Unicode)
  const concatMaxLength = unicode ? 67 : 153;
  return Math.ceil(messageLength / concatMaxLength);
}

/**
 * Estimate SMS cost
 */
export function estimateSMSCost(
  smsCount: number,
  recipientCount: number,
  costPerSMS: number = 0.20 // Default Fast2SMS cost (can vary)
): number {
  return smsCount * recipientCount * costPerSMS;
}
