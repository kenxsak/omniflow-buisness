/**
 * WMart CPaaS (Authkey) WhatsApp & Multi-Channel API Client
 * Pay-as-you-go pricing with no monthly fees
 * Supports WhatsApp, SMS, Email, Voice from single platform
 * 
 * Documentation: https://wmart.in/cpaas/
 */

export interface AuthkeyConfig {
  apiKey: string;
}

export interface AuthkeyWhatsAppTemplate {
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

export interface SendAuthkeyWhatsAppInput {
  to: string;              // Phone number with country code (e.g., 919876543210)
  templateName: string;
  parameters?: string[];   // Template variable values in order
}

export interface SendAuthkeyWhatsAppBulkInput {
  templateName: string;
  templateType?: 'text' | 'media';
  headerImageUrl?: string;
  recipients: {
    phone: string;
    parameters?: string[];
  }[];
}

export interface SendAuthkeyWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorDetails?: any;
}

export interface SendAuthkeyWhatsAppBulkResult {
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

const AUTHKEY_API_BASE = 'https://cpaas.wmart.in/restapi/requestjson.php';
const AUTHKEY_BALANCE_API = 'https://cpaas.wmart.in/restapi/getbalance.php';
const AUTHKEY_TEMPLATES_API = 'https://console.authkey.io/restapi/getAllTemplate.php';

/**
 * Format phone number for Authkey (remove + symbol, keep digits only)
 * @deprecated Use parseAuthkeyPhone instead for proper country code separation
 */
export function formatPhoneForAuthkey(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Country code configuration for accurate E.164 parsing
 * Maps country code prefix to the expected total length (country code + national number)
 * This ensures we correctly parse international numbers
 */
const COUNTRY_CODE_PATTERNS: Array<{ code: string; totalLength: number }> = [
  // 1-digit country codes
  { code: '1', totalLength: 11 },      // US, Canada (+1)
  
  // 2-digit country codes (most common)
  { code: '7', totalLength: 11 },      // Russia, Kazakhstan (+7)
  { code: '20', totalLength: 12 },     // Egypt (+20)
  { code: '27', totalLength: 11 },     // South Africa (+27)
  { code: '30', totalLength: 12 },     // Greece (+30)
  { code: '31', totalLength: 11 },     // Netherlands (+31)
  { code: '32', totalLength: 11 },     // Belgium (+32)
  { code: '33', totalLength: 11 },     // France (+33)
  { code: '34', totalLength: 11 },     // Spain (+34)
  { code: '36', totalLength: 11 },     // Hungary (+36)
  { code: '39', totalLength: 12 },     // Italy (+39)
  { code: '40', totalLength: 11 },     // Romania (+40)
  { code: '41', totalLength: 11 },     // Switzerland (+41)
  { code: '43', totalLength: 13 },     // Austria (+43)
  { code: '44', totalLength: 12 },     // UK (+44)
  { code: '45', totalLength: 10 },     // Denmark (+45)
  { code: '46', totalLength: 11 },     // Sweden (+46)
  { code: '47', totalLength: 10 },     // Norway (+47)
  { code: '48', totalLength: 11 },     // Poland (+48)
  { code: '49', totalLength: 13 },     // Germany (+49)
  { code: '51', totalLength: 11 },     // Peru (+51)
  { code: '52', totalLength: 12 },     // Mexico (+52)
  { code: '53', totalLength: 10 },     // Cuba (+53)
  { code: '54', totalLength: 12 },     // Argentina (+54)
  { code: '55', totalLength: 13 },     // Brazil (+55)
  { code: '56', totalLength: 11 },     // Chile (+56)
  { code: '57', totalLength: 12 },     // Colombia (+57)
  { code: '58', totalLength: 12 },     // Venezuela (+58)
  { code: '60', totalLength: 11 },     // Malaysia (+60)
  { code: '61', totalLength: 11 },     // Australia (+61)
  { code: '62', totalLength: 12 },     // Indonesia (+62)
  { code: '63', totalLength: 12 },     // Philippines (+63)
  { code: '64', totalLength: 11 },     // New Zealand (+64)
  { code: '65', totalLength: 10 },     // Singapore (+65)
  { code: '66', totalLength: 11 },     // Thailand (+66)
  { code: '81', totalLength: 12 },     // Japan (+81)
  { code: '82', totalLength: 11 },     // South Korea (+82)
  { code: '84', totalLength: 11 },     // Vietnam (+84)
  { code: '86', totalLength: 13 },     // China (+86)
  { code: '90', totalLength: 12 },     // Turkey (+90)
  { code: '91', totalLength: 12 },     // India (+91)
  { code: '92', totalLength: 12 },     // Pakistan (+92)
  { code: '93', totalLength: 11 },     // Afghanistan (+93)
  { code: '94', totalLength: 11 },     // Sri Lanka (+94)
  { code: '95', totalLength: 11 },     // Myanmar (+95)
  { code: '98', totalLength: 12 },     // Iran (+98)
  
  // 3-digit country codes
  { code: '212', totalLength: 12 },    // Morocco (+212)
  { code: '213', totalLength: 12 },    // Algeria (+213)
  { code: '216', totalLength: 11 },    // Tunisia (+216)
  { code: '218', totalLength: 12 },    // Libya (+218)
  { code: '220', totalLength: 10 },    // Gambia (+220)
  { code: '221', totalLength: 12 },    // Senegal (+221)
  { code: '222', totalLength: 11 },    // Mauritania (+222)
  { code: '223', totalLength: 11 },    // Mali (+223)
  { code: '224', totalLength: 12 },    // Guinea (+224)
  { code: '225', totalLength: 12 },    // Ivory Coast (+225)
  { code: '226', totalLength: 11 },    // Burkina Faso (+226)
  { code: '227', totalLength: 11 },    // Niger (+227)
  { code: '228', totalLength: 11 },    // Togo (+228)
  { code: '229', totalLength: 11 },    // Benin (+229)
  { code: '230', totalLength: 11 },    // Mauritius (+230)
  { code: '231', totalLength: 11 },    // Liberia (+231)
  { code: '232', totalLength: 11 },    // Sierra Leone (+232)
  { code: '233', totalLength: 12 },    // Ghana (+233)
  { code: '234', totalLength: 13 },    // Nigeria (+234)
  { code: '235', totalLength: 11 },    // Chad (+235)
  { code: '236', totalLength: 11 },    // Central African Republic (+236)
  { code: '237', totalLength: 12 },    // Cameroon (+237)
  { code: '238', totalLength: 10 },    // Cape Verde (+238)
  { code: '239', totalLength: 10 },    // São Tomé and Príncipe (+239)
  { code: '240', totalLength: 12 },    // Equatorial Guinea (+240)
  { code: '241', totalLength: 11 },    // Gabon (+241)
  { code: '242', totalLength: 12 },    // Republic of Congo (+242)
  { code: '243', totalLength: 12 },    // DR Congo (+243)
  { code: '244', totalLength: 12 },    // Angola (+244)
  { code: '245', totalLength: 10 },    // Guinea-Bissau (+245)
  { code: '246', totalLength: 10 },    // British Indian Ocean Territory (+246)
  { code: '248', totalLength: 10 },    // Seychelles (+248)
  { code: '249', totalLength: 12 },    // Sudan (+249)
  { code: '250', totalLength: 12 },    // Rwanda (+250)
  { code: '251', totalLength: 12 },    // Ethiopia (+251)
  { code: '252', totalLength: 11 },    // Somalia (+252)
  { code: '253', totalLength: 11 },    // Djibouti (+253)
  { code: '254', totalLength: 12 },    // Kenya (+254)
  { code: '255', totalLength: 12 },    // Tanzania (+255)
  { code: '256', totalLength: 12 },    // Uganda (+256)
  { code: '257', totalLength: 11 },    // Burundi (+257)
  { code: '258', totalLength: 12 },    // Mozambique (+258)
  { code: '260', totalLength: 12 },    // Zambia (+260)
  { code: '261', totalLength: 12 },    // Madagascar (+261)
  { code: '262', totalLength: 12 },    // Reunion/Mayotte (+262)
  { code: '263', totalLength: 12 },    // Zimbabwe (+263)
  { code: '264', totalLength: 12 },    // Namibia (+264)
  { code: '265', totalLength: 12 },    // Malawi (+265)
  { code: '266', totalLength: 11 },    // Lesotho (+266)
  { code: '267', totalLength: 11 },    // Botswana (+267)
  { code: '268', totalLength: 11 },    // Swaziland (+268)
  { code: '269', totalLength: 10 },    // Comoros (+269)
  { code: '290', totalLength: 8 },     // Saint Helena (+290)
  { code: '291', totalLength: 10 },    // Eritrea (+291)
  { code: '297', totalLength: 10 },    // Aruba (+297)
  { code: '298', totalLength: 9 },     // Faroe Islands (+298)
  { code: '299', totalLength: 9 },     // Greenland (+299)
  { code: '350', totalLength: 11 },    // Gibraltar (+350)
  { code: '351', totalLength: 12 },    // Portugal (+351)
  { code: '352', totalLength: 12 },    // Luxembourg (+352)
  { code: '353', totalLength: 12 },    // Ireland (+353)
  { code: '354', totalLength: 10 },    // Iceland (+354)
  { code: '355', totalLength: 12 },    // Albania (+355)
  { code: '356', totalLength: 11 },    // Malta (+356)
  { code: '357', totalLength: 11 },    // Cyprus (+357)
  { code: '358', totalLength: 12 },    // Finland (+358)
  { code: '359', totalLength: 12 },    // Bulgaria (+359)
  { code: '370', totalLength: 11 },    // Lithuania (+370)
  { code: '371', totalLength: 11 },    // Latvia (+371)
  { code: '372', totalLength: 11 },    // Estonia (+372)
  { code: '373', totalLength: 11 },    // Moldova (+373)
  { code: '374', totalLength: 11 },    // Armenia (+374)
  { code: '375', totalLength: 12 },    // Belarus (+375)
  { code: '376', totalLength: 9 },     // Andorra (+376)
  { code: '377', totalLength: 11 },    // Monaco (+377)
  { code: '378', totalLength: 12 },    // San Marino (+378)
  { code: '380', totalLength: 12 },    // Ukraine (+380)
  { code: '381', totalLength: 12 },    // Serbia (+381)
  { code: '382', totalLength: 11 },    // Montenegro (+382)
  { code: '383', totalLength: 11 },    // Kosovo (+383)
  { code: '385', totalLength: 12 },    // Croatia (+385)
  { code: '386', totalLength: 11 },    // Slovenia (+386)
  { code: '387', totalLength: 11 },    // Bosnia and Herzegovina (+387)
  { code: '389', totalLength: 11 },    // North Macedonia (+389)
  { code: '420', totalLength: 12 },    // Czech Republic (+420)
  { code: '421', totalLength: 12 },    // Slovakia (+421)
  { code: '423', totalLength: 10 },    // Liechtenstein (+423)
  { code: '500', totalLength: 8 },     // Falkland Islands (+500)
  { code: '501', totalLength: 10 },    // Belize (+501)
  { code: '502', totalLength: 11 },    // Guatemala (+502)
  { code: '503', totalLength: 11 },    // El Salvador (+503)
  { code: '504', totalLength: 11 },    // Honduras (+504)
  { code: '505', totalLength: 11 },    // Nicaragua (+505)
  { code: '506', totalLength: 11 },    // Costa Rica (+506)
  { code: '507', totalLength: 11 },    // Panama (+507)
  { code: '508', totalLength: 9 },     // St Pierre & Miquelon (+508)
  { code: '509', totalLength: 11 },    // Haiti (+509)
  { code: '590', totalLength: 12 },    // Guadeloupe (+590)
  { code: '591', totalLength: 11 },    // Bolivia (+591)
  { code: '592', totalLength: 10 },    // Guyana (+592)
  { code: '593', totalLength: 12 },    // Ecuador (+593)
  { code: '594', totalLength: 12 },    // French Guiana (+594)
  { code: '595', totalLength: 12 },    // Paraguay (+595)
  { code: '596', totalLength: 12 },    // Martinique (+596)
  { code: '597', totalLength: 10 },    // Suriname (+597)
  { code: '598', totalLength: 11 },    // Uruguay (+598)
  { code: '599', totalLength: 11 },    // Netherlands Antilles (+599)
  { code: '670', totalLength: 11 },    // East Timor (+670)
  { code: '672', totalLength: 9 },     // Norfolk Island (+672)
  { code: '673', totalLength: 10 },    // Brunei (+673)
  { code: '674', totalLength: 10 },    // Nauru (+674)
  { code: '675', totalLength: 11 },    // Papua New Guinea (+675)
  { code: '676', totalLength: 8 },     // Tonga (+676)
  { code: '677', totalLength: 10 },    // Solomon Islands (+677)
  { code: '678', totalLength: 10 },    // Vanuatu (+678)
  { code: '679', totalLength: 10 },    // Fiji (+679)
  { code: '680', totalLength: 10 },    // Palau (+680)
  { code: '681', totalLength: 9 },     // Wallis and Futuna (+681)
  { code: '682', totalLength: 8 },     // Cook Islands (+682)
  { code: '683', totalLength: 7 },     // Niue (+683)
  { code: '685', totalLength: 10 },    // Samoa (+685)
  { code: '686', totalLength: 11 },    // Kiribati (+686)
  { code: '687', totalLength: 9 },     // New Caledonia (+687)
  { code: '688', totalLength: 9 },     // Tuvalu (+688)
  { code: '689', totalLength: 11 },    // French Polynesia (+689)
  { code: '690', totalLength: 7 },     // Tokelau (+690)
  { code: '691', totalLength: 10 },    // Micronesia (+691)
  { code: '692', totalLength: 10 },    // Marshall Islands (+692)
  { code: '850', totalLength: 12 },    // North Korea (+850)
  { code: '852', totalLength: 11 },    // Hong Kong (+852)
  { code: '853', totalLength: 11 },    // Macau (+853)
  { code: '855', totalLength: 12 },    // Cambodia (+855)
  { code: '856', totalLength: 12 },    // Laos (+856)
  { code: '880', totalLength: 13 },    // Bangladesh (+880)
  { code: '886', totalLength: 12 },    // Taiwan (+886)
  { code: '960', totalLength: 10 },    // Maldives (+960)
  { code: '961', totalLength: 11 },    // Lebanon (+961)
  { code: '962', totalLength: 12 },    // Jordan (+962)
  { code: '963', totalLength: 12 },    // Syria (+963)
  { code: '964', totalLength: 12 },    // Iraq (+964)
  { code: '965', totalLength: 11 },    // Kuwait (+965)
  { code: '966', totalLength: 12 },    // Saudi Arabia (+966)
  { code: '967', totalLength: 12 },    // Yemen (+967)
  { code: '968', totalLength: 11 },    // Oman (+968)
  { code: '970', totalLength: 12 },    // Palestine (+970)
  { code: '971', totalLength: 12 },    // UAE (+971)
  { code: '972', totalLength: 12 },    // Israel (+972)
  { code: '973', totalLength: 11 },    // Bahrain (+973)
  { code: '974', totalLength: 11 },    // Qatar (+974)
  { code: '975', totalLength: 11 },    // Bhutan (+975)
  { code: '976', totalLength: 11 },    // Mongolia (+976)
  { code: '977', totalLength: 12 },    // Nepal (+977)
  { code: '992', totalLength: 12 },    // Tajikistan (+992)
  { code: '993', totalLength: 11 },    // Turkmenistan (+993)
  { code: '994', totalLength: 12 },    // Azerbaijan (+994)
  { code: '995', totalLength: 12 },    // Georgia (+995)
  { code: '996', totalLength: 12 },    // Kyrgyzstan (+996)
  { code: '998', totalLength: 12 },    // Uzbekistan (+998)
];

/**
 * Parse phone number into country code and national number for Authkey API
 * The Authkey API requires country_code and mobile to be sent separately.
 * 
 * Uses a comprehensive country code database for accurate E.164 parsing.
 * 
 * Examples:
 * - "+919699663636" → { countryCode: "91", nationalNumber: "9699663636" }
 * - "+14155552671" → { countryCode: "1", nationalNumber: "4155552671" }
 * - "+61234567890" → { countryCode: "61", nationalNumber: "234567890" }
 * - "9699663636" (no country code) → defaults to India { countryCode: "91", nationalNumber: "9699663636" }
 */
export function parseAuthkeyPhone(phone: string): {
  countryCode: string;
  nationalNumber: string;
} {
  // Normalize: trim and remove spaces, dashes, parentheses
  let normalized = phone.trim().replace(/[\s\-\(\)]/g, '');
  
  // Handle international prefix formats: + or 00
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  } else if (normalized.startsWith('00')) {
    // 00 is an alternative to + in many countries (e.g., 0014155552671 = +14155552671)
    normalized = normalized.substring(2);
  }
  
  const digitsOnly = normalized;
  
  if (!digitsOnly || !/^\d+$/.test(digitsOnly)) {
    console.error('[Authkey] Invalid phone number format:', phone);
    throw new Error('Invalid phone number format. Expected format: +[country code][number] or 00[country code][number]');
  }
  
  // If it's a 10-digit number without country code, default to India
  if (digitsOnly.length === 10) {
    console.warn('[Authkey] 10-digit phone number without country code detected, defaulting to India (+91):', phone);
    return {
      countryCode: '91',
      nationalNumber: digitsOnly
    };
  }
  
  // Try to match against known country code patterns
  // Sort by code length (longest first) to match 3-digit codes before 2-digit
  const sortedPatterns = [...COUNTRY_CODE_PATTERNS].sort((a, b) => b.code.length - a.code.length);
  
  for (const pattern of sortedPatterns) {
    if (digitsOnly.startsWith(pattern.code) && digitsOnly.length === pattern.totalLength) {
      const nationalNumber = digitsOnly.substring(pattern.code.length);
      console.log('[Authkey] Parsed phone:', {
        original: phone,
        countryCode: pattern.code,
        nationalNumber,
        full: `+${pattern.code}${nationalNumber}`
      });
      return {
        countryCode: pattern.code,
        nationalNumber
      };
    }
  }
  
  // If no exact match found, try a more lenient approach
  // This handles cases where the number might have a different length than expected
  for (const pattern of sortedPatterns) {
    if (digitsOnly.startsWith(pattern.code) && digitsOnly.length >= pattern.code.length + 7) {
      const nationalNumber = digitsOnly.substring(pattern.code.length);
      console.warn('[Authkey] Phone number length mismatch, but using best match:', {
        original: phone,
        countryCode: pattern.code,
        nationalNumber,
        expectedLength: pattern.totalLength,
        actualLength: digitsOnly.length
      });
      return {
        countryCode: pattern.code,
        nationalNumber
      };
    }
  }
  
  // Ultimate fallback: if we can't determine the country code, default to India (91)
  // This maintains backward compatibility with the existing behavior
  console.error('[Authkey] Could not determine country code for phone number, defaulting to India (+91):', phone);
  return {
    countryCode: '91',
    nationalNumber: digitsOnly
  };
}

/**
 * Validate Authkey connection
 */
export async function validateAuthkeyConnection(config: AuthkeyConfig): Promise<{
  success: boolean;
  error?: string;
  balance?: number;
}> {
  try {
    console.log('[Authkey] Validating connection...');

    if (!config.apiKey) {
      return {
        success: false,
        error: 'API Key is required'
      };
    }

    // Check balance endpoint to validate API key
    const response = await fetch(
      `${AUTHKEY_BALANCE_API}?authkey=${config.apiKey}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Authkey] Validation failed:', errorData);
      
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    console.log('[Authkey] Validation successful');

    return {
      success: true,
      balance: data.balance || 0
    };
  } catch (error) {
    console.error('[Authkey] Validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Send a single WhatsApp message via Authkey
 */
export async function sendAuthkeyWhatsAppMessage(
  config: AuthkeyConfig,
  input: SendAuthkeyWhatsAppInput
): Promise<SendAuthkeyWhatsAppResult> {
  try {
    console.log('[Authkey] Sending message to:', input.to);

    // Parse phone number to extract country code and national number
    const { countryCode, nationalNumber } = parseAuthkeyPhone(input.to);

    // Build the request body according to Authkey API docs
    // Format: direct fields at top level, no data array wrapper
    const requestBody: any = {
      country_code: countryCode,
      mobile: nationalNumber,
      wid: input.templateName, // templateName is actually the WhatsApp template ID (wid)
      type: "text"
    };
    
    // Add bodyValues if parameters are provided
    // Authkey API expects "1", "2", "3"... format (NOT var1, var2)
    if (input.parameters && input.parameters.length > 0) {
      requestBody.bodyValues = {};
      input.parameters.forEach((param, index) => {
        requestBody.bodyValues[String(index + 1)] = param;
      });
    }

    console.log('[Authkey] Request payload:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(AUTHKEY_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    
    console.log('[Authkey] API Response:', {
      status: response.status,
      ok: response.ok,
      responseData: responseData
    });

    // CRITICAL: Check actual API response status, not just HTTP 200
    const apiStatus = (responseData?.status || responseData?.Status || '').toString();
    const isSuccess = apiStatus.toLowerCase() === 'success';

    if (!response.ok || !isSuccess) {
      const errorMessage = responseData?.Message || responseData?.message || 
                          responseData?.error || `HTTP ${response.status}`;
      console.error('[Authkey] Message send failed:', {
        httpStatus: response.status,
        apiStatus: apiStatus,
        errorMessage: errorMessage,
        fullResponse: responseData
      });
      return {
        success: false,
        error: errorMessage,
        errorDetails: responseData
      };
    }

    console.log('[Authkey] Message queued for delivery! MessageID:', responseData.message_id || responseData.request_id);

    return {
      success: true,
      messageId: responseData.message_id || responseData.request_id
    };
  } catch (error) {
    console.error('[Authkey] Message send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send bulk WhatsApp messages via Authkey
 * Uses the new JSON API format with up to 200 numbers per request
 */
export async function sendBulkAuthkeyWhatsApp(
  config: AuthkeyConfig,
  input: SendAuthkeyWhatsAppBulkInput
): Promise<SendAuthkeyWhatsAppBulkResult> {
  try {
    console.log(`[Authkey] Sending bulk messages to ${input.recipients.length} recipients`);

    const results: SendAuthkeyWhatsAppBulkResult['results'] = [];

    // Step 1: Group recipients by country code to handle multi-country campaigns
    const recipientsByCountry = new Map<string, typeof input.recipients>();
    
    for (const recipient of input.recipients) {
      try {
        const { countryCode } = parseAuthkeyPhone(recipient.phone);
        if (!recipientsByCountry.has(countryCode)) {
          recipientsByCountry.set(countryCode, []);
        }
        recipientsByCountry.get(countryCode)!.push(recipient);
      } catch (parseError) {
        // If parsing fails for this recipient, mark it as failed immediately
        console.error('[Authkey] Failed to parse phone number:', recipient.phone, parseError);
        results.push({
          phone: recipient.phone,
          success: false,
          error: parseError instanceof Error ? parseError.message : 'Invalid phone number format'
        });
      }
    }

    console.log(`[Authkey] Grouped recipients into ${recipientsByCountry.size} country code(s)`);

    // Step 2: Process each country code group separately
    for (const [countryCode, countryRecipients] of recipientsByCountry.entries()) {
      console.log(`[Authkey] Processing ${countryRecipients.length} recipients for country code +${countryCode}`);

      // Step 3: Send individual requests for each recipient
      // Authkey doesn't support bulk data arrays - need to send one request per recipient
      for (let i = 0; i < countryRecipients.length; i++) {
        const recipient = countryRecipients[i];
        
        // Parse phone number to get the national number without country code
        const { nationalNumber } = parseAuthkeyPhone(recipient.phone);
        
        // Build the request body for this single recipient
        const requestBody: any = {
          country_code: countryCode,
          mobile: nationalNumber,
          wid: input.templateName,
          type: input.templateType || "text"
        };
        
        // Add headerValues for media templates
        if (input.templateType === 'media' && input.headerImageUrl) {
          requestBody.headerValues = {
            headerFileName: "media",
            headerData: input.headerImageUrl
          };
        }
        
        // Add bodyValues if parameters are provided
        // Authkey API expects "1", "2", "3"... format (NOT var1, var2)
        if (recipient.parameters && recipient.parameters.length > 0) {
          requestBody.bodyValues = {};
          recipient.parameters.forEach((param, index) => {
            requestBody.bodyValues[String(index + 1)] = param;
          });
        }

      console.log('[Authkey] Sending request for', recipient.phone, ':', JSON.stringify(requestBody, null, 2));

      try {
        const response = await fetch(AUTHKEY_API_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('[Authkey] Response status:', response.status);
        console.log('[Authkey] Response text:', responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('[Authkey] Failed to parse response as JSON:', responseText);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }

        // Process the response for this single recipient
        // CRITICAL: Check actual API response status, not just HTTP 200
        const apiStatus = (responseData?.status || responseData?.Status || '').toString();
        const isSuccess = apiStatus.toLowerCase() === 'success';
        
        if (response.ok && responseData && isSuccess) {
          // API explicitly returned success status
          console.log('[Authkey] Message accepted for', recipient.phone);
          
          results.push({
            phone: recipient.phone,
            success: true,
            messageId: responseData.message_id || responseData.request_id || `msg_${i}`
          });
        } else {
          // If the API returned failure status or HTTP error
          const errorMessage = responseData?.Message || responseData?.message || 
                              responseData?.error || `HTTP ${response.status}`;
          console.error('[Authkey] Message failed for', recipient.phone, ':', {
            httpStatus: response.status,
            apiStatus: apiStatus,
            errorMessage: errorMessage,
            fullResponse: responseData
          });
          
          results.push({
            phone: recipient.phone,
            success: false,
            error: errorMessage
          });
        }
      } catch (sendError) {
        console.error('[Authkey] Request error for', recipient.phone, ':', sendError);
        results.push({
          phone: recipient.phone,
          success: false,
          error: sendError instanceof Error ? sendError.message : 'Request failed'
        });
      }

        // Small delay between individual sends to respect rate limits
        if (i + 1 < countryRecipients.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second between sends
        }
      }
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log(`[Authkey] Bulk send complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed
    };
  } catch (error) {
    console.error('[Authkey] Bulk send error:', error);
    return {
      success: false,
      results: input.recipients.map(r => ({
        phone: r.phone,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })),
      totalSent: 0,
      totalFailed: input.recipients.length
    };
  }
}

/**
 * Get WhatsApp templates from Authkey/WMart CPaaS
 * Uses the getAllTemplate.php endpoint to fetch approved templates
 */
export async function getAuthkeyTemplates(
  config: AuthkeyConfig
): Promise<{
  success: boolean;
  templates?: AuthkeyWhatsAppTemplate[];
  error?: string;
}> {
  try {
    console.log('[Authkey] Fetching WhatsApp templates...');

    const response = await fetch(AUTHKEY_TEMPLATES_API, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        channel: 'whatsapp'
      })
    });

    console.log('[Authkey] Templates API response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const textResponse = await response.text().catch(() => 'Unable to read response');
        console.error('[Authkey] Non-JSON response:', textResponse.substring(0, 200));
        
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: 'Authentication failed. Please check your WMart CPaaS API Key in Settings.'
          };
        }
        return {
          success: false,
          error: `Failed to fetch templates (HTTP ${response.status})`
        };
      }
      
      console.error('[Authkey] Failed to fetch templates:', errorData);
      return {
        success: false,
        error: errorData?.message || errorData?.Message || `Failed to fetch templates (HTTP ${response.status})`
      };
    }

    const result = await response.json();
    console.log('[Authkey] Templates API response:', JSON.stringify(result).substring(0, 500));

    // Check if the API returned an error status
    const apiStatus = (result?.status || result?.Status || '').toString().toLowerCase();
    if (apiStatus === 'error' || apiStatus === 'failed') {
      return {
        success: false,
        error: result?.message || result?.Message || 'Failed to fetch templates'
      };
    }

    // Parse the templates from the response
    // The API might return templates in different formats, handle common patterns
    let rawTemplates: any[] = [];
    
    if (Array.isArray(result)) {
      rawTemplates = result;
    } else if (result?.templates && Array.isArray(result.templates)) {
      rawTemplates = result.templates;
    } else if (result?.data && Array.isArray(result.data)) {
      rawTemplates = result.data;
    } else if (result?.result && Array.isArray(result.result)) {
      rawTemplates = result.result;
    }

    console.log('[Authkey] Found', rawTemplates.length, 'templates');

    // Map to our template structure
    // NOTE: Authkey getAllTemplate.php only returns APPROVED templates
    // Response format: {"wid": 19137, "temp_name": "...", "temp_body": "..."}
    const templates: AuthkeyWhatsAppTemplate[] = rawTemplates.map((t: any) => {
      // Handle Authkey-specific field names (temp_name, wid, temp_body)
      const templateId = t.wid?.toString() || t.id || t.templateId || t.template_id || t.elementId || '';
      const templateName = t.temp_name || t.name || t.templateName || t.template_name || t.elementName || '';
      const templateBody = t.temp_body || t.body || '';
      
      // Templates from getAllTemplate.php are already APPROVED (API only returns approved ones)
      // Check for explicit status field first, otherwise default to APPROVED
      const rawStatus = (t.status || t.Status || '').toString().toUpperCase();
      const templateStatus = rawStatus === 'PENDING' || rawStatus === 'REJECTED' ? rawStatus : 'APPROVED';
      
      const templateCategory = (t.category || t.Category || t.temp_category || 'MARKETING').toUpperCase();
      const templateLanguage = t.language || t.languageCode || t.language_code || t.temp_language || 'en';
      
      // Parse components if available (for header type detection)
      const components: Array<{
        type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
        text?: string;
        format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      }> = [];
      
      // Add BODY component from temp_body if available
      if (templateBody) {
        components.push({
          type: 'BODY',
          text: templateBody,
          format: 'TEXT'
        });
      }
      
      if (t.components && Array.isArray(t.components)) {
        for (const c of t.components) {
          components.push({
            type: (c.type || '').toUpperCase() as 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS',
            text: c.text,
            format: c.format ? (c.format.toUpperCase() as 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT') : undefined
          });
        }
      } else if (t.headerType || t.header_type || t.temp_header_type) {
        // If API returns header type directly
        const headerFormat = (t.headerType || t.header_type || t.temp_header_type || '').toUpperCase();
        if (headerFormat && headerFormat !== 'NONE' && headerFormat !== 'TEXT') {
          components.push({
            type: 'HEADER',
            format: headerFormat as 'IMAGE' | 'VIDEO' | 'DOCUMENT'
          });
        }
      }

      const templateObj: AuthkeyWhatsAppTemplate = {
        id: templateId,
        name: templateName,
        category: templateCategory as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
        status: templateStatus as 'APPROVED' | 'PENDING' | 'REJECTED',
        language: templateLanguage,
        components: components.length > 0 ? components : undefined
      };
      
      return templateObj;
    });

    // Filter for approved templates (should be all of them from this API)
    const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

    console.log('[Authkey] Successfully processed templates:', {
      total: templates.length,
      approved: approvedTemplates.length,
      pending: templates.filter(t => t.status === 'PENDING').length,
      rejected: templates.filter(t => t.status === 'REJECTED').length
    });

    return {
      success: true,
      templates: approvedTemplates
    };
  } catch (error) {
    console.error('[Authkey] getTemplates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching templates'
    };
  }
}

/**
 * Send SMS via Authkey (bonus feature - same API key works)
 */
export async function sendAuthkeySMS(
  config: AuthkeyConfig,
  input: {
    to: string;
    message: string;
    senderId?: string;
  }
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    console.log('[Authkey] Sending SMS to:', input.to);

    const params = new URLSearchParams({
      authkey: config.apiKey,
      mobile: formatPhoneForAuthkey(input.to),
      message: input.message,
      sender: input.senderId || 'AUTHKY',
      country_code: '91'
    });

    const response = await fetch(
      `${AUTHKEY_API_BASE}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const responseData = await response.json();

    if (!response.ok || !responseData.success) {
      return {
        success: false,
        error: responseData.message || 'SMS send failed'
      };
    }

    return {
      success: true,
      messageId: responseData.message_id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
