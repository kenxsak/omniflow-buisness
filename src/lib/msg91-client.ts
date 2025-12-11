/**
 * MSG91 Bulk SMS API Client
 * Handles bulk SMS messaging through MSG91 platform
 */

export interface MSG91Config {
  authKey: string;
  senderId: string; // Registered sender ID
}

export interface SendBulkSMSInput {
  message?: string; // Optional: full message or empty for template-only
  recipients: string[]; // Phone numbers with country code (e.g., 919876543210)
  route?: 'promotional' | 'transactional';
  templateId?: string; // MSG91 Template/Flow ID
  dltTemplateId?: string; // TRAI DLT Template ID - Required for India
  unicode?: boolean; // Set to true for non-English characters
  variables?: string[]; // Optional: array of variable values [var1, var2, var3, ...]
  perRecipientVariables?: string[][]; // Optional: per-recipient variable values for personalization logging
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  requestId?: string;
  error?: string;
  failed?: {
    phone: string;
    error: string;
  }[];
}

export interface SMSDeliveryReport {
  messageId: string;
  phone: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED' | 'PENDING' | 'REJECTED';
  deliveredAt?: string;
  error?: string;
}

/**
 * Send bulk SMS via MSG91
 * Uses the Send HTTP API (v2) which properly supports DLT_TE_ID
 */
export async function sendBulkSMSMSG91(
  config: MSG91Config,
  input: SendBulkSMSInput
): Promise<SendSMSResult> {
  try {
    // Use SendHTTP API endpoint - this properly supports DLT_TE_ID for India compliance
    const url = 'https://control.msg91.com/api/sendhttp.php';
    
    const params = new URLSearchParams({
      authkey: config.authKey,
      mobiles: input.recipients.join(','),
      sender: config.senderId,
      route: input.route === 'promotional' ? '1' : '4', // 1 = Promotional, 4 = Transactional
      country: '91',
      response: 'json' // Force JSON response from MSG91
    });

    // CRITICAL: If template_id is provided, use MSG91's approved template
    // Do NOT send message parameter when using template_id - let MSG91 use the actual template
    if (input.templateId) {
      params.append('template_id', input.templateId);
    } else {
      // Only send message if no template_id (for non-template SMS)
      params.append('message', input.message || '');
    }

    // CRITICAL: Add DLT_TE_ID (TRAI DLT Template ID) - REQUIRED for MSG91 templates
    if (input.dltTemplateId) {
      params.append('DLT_TE_ID', input.dltTemplateId);
    }
    
    // CRITICAL: Pass variables as separate URL parameters (var1, var2, var3, ...)
    // MSG91 sendhttp.php API uses lowercase var1, var2, etc. for template substitution
    if (input.variables && input.variables.length > 0) {
      input.variables.forEach((value, index) => {
        if (value && value.trim() !== '') {
          params.append(`var${index + 1}`, value);
        }
      });
    }
    
    if (input.unicode !== undefined) {
      params.append('unicode', input.unicode ? '1' : '0');
    }

    console.log('📤 Sending SMS via MSG91 SendHTTP API');
    console.log('   Endpoint: /api/sendhttp.php');
    console.log('   Route:', input.route === 'promotional' ? 'promotional (1)' : 'transactional (4)');
    console.log('   Template ID:', input.templateId || '(MISSING!)');
    console.log('   DLT_TE_ID:', input.dltTemplateId || '(MISSING!)');
    console.log('   Variables (server-side params):', input.variables && input.variables.length > 0 ? input.variables.join(', ') : '(none)');
    console.log('   Template Message:', input.message?.substring(0, 100) || '(empty)');
    console.log('   Recipients:', input.recipients.length);

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET'
    });

    const responseText = await response.text();
    console.log('   Raw response:', responseText.substring(0, 150));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse MSG91 response as JSON:', responseText);
      return {
        success: false,
        error: `Invalid response from MSG91. Make sure your DLT Template ID is correctly configured in MSG91 panel.`
      };
    }

    // MSG91 returns type: 'error' or type: 'success'
    if (result.type === 'error') {
      console.error('❌ MSG91 API Error:', result.message, result.code);
      return {
        success: false,
        error: result.message || `MSG91 Error (Code: ${result.code})`
      };
    }

    if (result.type !== 'success') {
      console.error('❌ Unexpected response type:', result.type);
      return {
        success: false,
        error: `Unexpected MSG91 response: ${JSON.stringify(result)}`
      };
    }

    console.log('✅ SMS sent successfully via MSG91');
    console.log('   Message ID:', result.message);
    
    return {
      success: true,
      requestId: result.message,
      messageId: result.message
    };
  } catch (error) {
    console.error('MSG91 sendBulkSMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending SMS'
    };
  }
}

/**
 * Send SMS using MSG91 v2 API (alternative endpoint with better response)
 */
export async function sendBulkSMSMSG91V2(
  config: MSG91Config,
  input: SendBulkSMSInput
): Promise<SendSMSResult> {
  try {
    const url = 'https://control.msg91.com/api/sendhttp.php';
    
    const params = new URLSearchParams({
      authkey: config.authKey,
      mobiles: input.recipients.join(','),
      message: input.message || '',
      sender: config.senderId,
      route: input.route === 'promotional' ? '1' : '4',
      country: '91'
    });

    if (input.dltTemplateId) {
      params.append('DLT_TE_ID', input.dltTemplateId);
    }

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET' // v2 uses GET
    });

    const result = await response.json();

    if (result.type === 'error' || !response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to send SMS'
      };
    }

    return {
      success: true,
      requestId: result.request_id
    };
  } catch (error) {
    console.error('MSG91 v2 sendBulkSMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending SMS'
    };
  }
}

/**
 * Send OTP via MSG91 (specialized for authentication)
 */
export async function sendOTPMSG91(
  config: MSG91Config,
  phone: string,
  otp: string,
  templateId?: string
): Promise<SendSMSResult> {
  try {
    const url = 'https://control.msg91.com/api/v5/otp';
    
    const requestBody = {
      sender: config.senderId,
      mobile: phone,
      otp: otp,
      ...(templateId && { template_id: templateId })
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': config.authKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (result.type === 'error' || !response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to send OTP'
      };
    }

    return {
      success: true,
      requestId: result.request_id
    };
  } catch (error) {
    console.error('MSG91 sendOTP error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending OTP'
    };
  }
}

/**
 * Get SMS delivery report
 */
export async function getSMSDeliveryReportMSG91(
  config: MSG91Config,
  requestId: string
): Promise<{
  success: boolean;
  reports?: SMSDeliveryReport[];
  error?: string;
}> {
  try {
    const url = `https://control.msg91.com/api/v5/report/${requestId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'authkey': config.authKey
      }
    });

    const result = await response.json();

    if (result.type === 'error' || !response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to fetch delivery report'
      };
    }

    // Parse delivery report
    const reports: SMSDeliveryReport[] = [];
    if (Array.isArray(result.data)) {
      result.data.forEach((item: any) => {
        reports.push({
          messageId: item.message_id,
          phone: item.mobile,
          status: item.status,
          deliveredAt: item.delivered_at,
          error: item.error_description
        });
      });
    }

    return {
      success: true,
      reports
    };
  } catch (error) {
    console.error('MSG91 getDeliveryReport error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching report'
    };
  }
}

/**
 * Get SMS balance from MSG91
 */
export async function getSMSBalanceMSG91(
  config: MSG91Config
): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const url = `https://control.msg91.com/api/balance.php?authkey=${config.authKey}`;
    
    const response = await fetch(url);
    const result = await response.text(); // MSG91 returns plain text for balance

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch balance'
      };
    }

    // Parse balance (can be in format "SMS Balance: 1000" or just "1000")
    const balanceMatch = result.match(/\d+/);
    const balance = balanceMatch ? parseInt(balanceMatch[0]) : 0;

    return {
      success: true,
      balance
    };
  } catch (error) {
    console.error('MSG91 getBalance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching balance'
    };
  }
}

/**
 * Validate MSG91 API connection
 */
export async function validateMSG91Connection(config: MSG91Config): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await getSMSBalanceMSG91(config);
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
 * Calculate SMS count based on message length
 * 160 chars = 1 SMS, 306 chars = 2 SMS, etc. (for English/GSM-7)
 * 70 chars = 1 SMS, 134 chars = 2 SMS, etc. (for Unicode/non-English)
 */
export function calculateSMSCount(message: string, isUnicode: boolean = false): number {
  const length = message.length;
  
  if (isUnicode) {
    // Unicode messages
    if (length <= 70) return 1;
    return Math.ceil(length / 67); // 67 chars per message after first
  } else {
    // GSM-7 (English) messages
    if (length <= 160) return 1;
    return Math.ceil(length / 153); // 153 chars per message after first
  }
}

/**
 * Estimate SMS cost (approximate, varies by country)
 */
export function estimateSMSCost(
  messageCount: number,
  recipientCount: number,
  costPerSMS: number = 0.25 // Default ₹0.25 per SMS in India
): number {
  return messageCount * recipientCount * costPerSMS;
}

/**
 * Format phone number for MSG91 (remove + and spaces, keep country code)
 */
export function formatPhoneForMSG91(phone: string): string {
  // Remove +, spaces, dashes, parentheses
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Check if message contains Unicode characters
 */
export function isUnicodeMessage(message: string): boolean {
  // Check for characters outside GSM-7 character set
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\^\{\}\\\[\]~\|€]*$/;
  return !gsmRegex.test(message);
}

/**
 * Per-recipient data for Flow API
 */
export interface FlowRecipient {
  mobiles: string;
  [key: string]: string; // Any variable names (e.g., name, date, otp, etc.)
}

/**
 * Send bulk SMS via MSG91 Flow API v5 with per-recipient variables
 * Supports personalized messages where each recipient can have different variable values
 */
export async function sendBulkSMSViaFlowAPI(
  config: MSG91Config,
  flowId: string,
  recipients: FlowRecipient[],
  options?: {
    dltTemplateId?: string;
    country?: string;
    sendAt?: string; // Schedule format: YYYY-MM-DD HH:MM:SS
    shortUrl?: '1' | '0';
  }
): Promise<SendSMSResult> {
  try {
    const url = 'https://control.msg91.com/api/v5/flow';

    const requestBody: any = {
      flow_id: flowId  // Use flow_id for Flow API (not template_id)
      // Recipients contain variable values that MSG91 will substitute
    };
    
    // Add recipients with their variables
    requestBody.recipients = recipients;

    // Optional parameters
    if (options?.dltTemplateId) {
      requestBody.DLT_TE_ID = options.dltTemplateId;
    }
    if (options?.country) {
      requestBody.country = options.country;
    }
    if (options?.sendAt) {
      requestBody.send_at = options.sendAt;
    }
    if (options?.shortUrl) {
      requestBody.short_url = options.shortUrl;
    }

    console.log('📤 Sending SMS via MSG91 Flow API v5 (Template Format)');
    console.log('   Endpoint: /api/v5/flow');
    console.log('   Template ID:', flowId);
    console.log('   DLT_TE_ID:', options?.dltTemplateId || '(not specified)');
    console.log('   Recipients:', recipients.length);
    console.log('   Sample recipient:', recipients[0]);
    console.log('   Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': config.authKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('   Raw response:', responseText.substring(0, 200));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse MSG91 Flow API response as JSON:', responseText);
      return {
        success: false,
        error: 'Invalid response from MSG91 Flow API'
      };
    }

    // MSG91 Flow API returns type: 'error' or type: 'success'
    if (result.type === 'error') {
      console.error('❌ MSG91 Flow API Error:', result.message, result.code);
      return {
        success: false,
        error: result.message || `MSG91 Error (Code: ${result.code})`
      };
    }

    if (result.type !== 'success') {
      console.error('❌ Unexpected response type:', result.type);
      return {
        success: false,
        error: `Unexpected MSG91 response: ${JSON.stringify(result)}`
      };
    }

    console.log('✅ SMS batch sent successfully via MSG91 Flow API');
    console.log('   Request ID:', result.message);

    return {
      success: true,
      requestId: result.message,
      messageId: result.message
    };
  } catch (error) {
    console.error('MSG91 Flow API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending SMS'
    };
  }
}
