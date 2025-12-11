/**
 * Twilio SMS Client
 * Handles SMS sending via Twilio API
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhoneNumber: string;
}

export interface SendTwilioSMSInput {
  toPhoneNumber: string;
  message: string;
}

export interface SendTwilioSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendTwilioSMS(
  config: TwilioConfig,
  input: SendTwilioSMSInput
): Promise<SendTwilioSMSResult> {
  try {
    const { accountSid, authToken, fromPhoneNumber } = config;
    const { toPhoneNumber, message } = input;

    // Format phone numbers
    const from = formatPhoneForTwilio(fromPhoneNumber);
    const to = formatPhoneForTwilio(toPhoneNumber);

    // Twilio API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Create form data
    const formData = new URLSearchParams();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', message);

    // Make request with Basic Auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();

    if (response.ok && result.sid) {
      return {
        success: true,
        messageId: result.sid
      };
    } else {
      return {
        success: false,
        error: result.message || 'Failed to send SMS'
      };
    }
  } catch (error) {
    console.error('Error sending Twilio SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format phone number for Twilio (E.164 format)
 */
function formatPhoneForTwilio(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with +91
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}
