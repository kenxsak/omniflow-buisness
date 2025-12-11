/**
 * SMS Templates Auto-Sync
 * Fetches approved templates from Fast2SMS and MSG91 APIs
 * Stores them in Firestore for easy selection in bulk campaigns
 */

export interface TemplateVariable {
  position: number;
  description: string;
  defaultMapping?: string;
  maxLength?: number;
}

export interface SMSTemplate {
  id: string;
  provider: 'fast2sms' | 'msg91';
  templateId: string;
  dltId: string;
  text: string;
  name?: string;
  type?: 'promotional' | 'transactional';
  variables: number;
  variableDetails?: TemplateVariable[];
  createdAt: number;
  syncedAt: number;
  updatedAt?: number;
}

/**
 * Parse template text to detect variables
 * MSG91 uses ##var## format
 * Fast2SMS uses {#var#} format
 */
export function parseTemplateVariables(text: string, provider: 'fast2sms' | 'msg91'): {
  count: number;
  positions: { start: number; end: number; placeholder: string }[];
} {
  const pattern = provider === 'msg91' 
    ? /##[^#]+##/g 
    : /\{#[^}]+#\}/g;
  
  const matches = text.matchAll(pattern);
  const positions: { start: number; end: number; placeholder: string }[] = [];
  
  for (const match of matches) {
    if (match.index !== undefined) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
        placeholder: match[0]
      });
    }
  }
  
  return {
    count: positions.length,
    positions
  };
}

/**
 * Replace variables in template text with actual values
 * Returns the personalized message
 */
export function replaceTemplateVariables(
  text: string, 
  provider: 'fast2sms' | 'msg91',
  values: string[]
): string {
  const pattern = provider === 'msg91' 
    ? /##[^#]+##/g 
    : /\{#[^}]+#\}/g;
  
  let result = text;
  let valueIndex = 0;
  
  result = result.replace(pattern, () => {
    const value = values[valueIndex] || '';
    valueIndex++;
    return value;
  });
  
  return result;
}

/**
 * Generate default variable details for a template
 */
export function generateDefaultVariables(count: number): TemplateVariable[] {
  return Array.from({ length: count }, (_, i) => {
    const variable: TemplateVariable = {
      position: i + 1,
      description: i === 0 ? 'Customer Name' : `Variable ${i + 1}`,
      maxLength: 40
    };
    
    // Only add defaultMapping if it has a value (avoid undefined in Firestore)
    if (i === 0) {
      variable.defaultMapping = 'contact.name';
    }
    
    return variable;
  });
}

/**
 * Get variable value from contact based on mapping
 */
export function getValueFromContact(
  contact: { name?: string; phone?: string; email?: string; [key: string]: any },
  mapping: string | undefined,
  fallback: string = ''
): string {
  if (!mapping) return fallback;
  
  switch (mapping) {
    case 'contact.name':
      return contact.name || fallback;
    case 'contact.phone':
      return contact.phone || fallback;
    case 'contact.email':
      return contact.email || fallback;
    default:
      if (mapping.startsWith('contact.')) {
        const field = mapping.replace('contact.', '');
        return contact[field] || fallback;
      }
      return mapping;
  }
}

/**
 * Fetch templates from Fast2SMS
 * Uses the correct dlt_manager endpoint with type=template
 * Documentation: https://www.fast2sms.com/docs
 * 
 * For GET requests, Fast2SMS requires authorization as query parameter
 */
export async function fetchFast2SMSTemplates(apiKey: string): Promise<{
  success: boolean;
  templates?: SMSTemplate[];
  error?: string;
}> {
  try {
    console.log('📥 Fetching templates from Fast2SMS using dlt_manager API...');
    
    // For GET requests: authorization goes in query string
    // Endpoint: GET https://www.fast2sms.com/dev/dlt_manager?authorization=KEY&type=template
    const url = new URL('https://www.fast2sms.com/dev/dlt_manager');
    url.searchParams.append('authorization', apiKey);
    url.searchParams.append('type', 'template');

    console.log('🔗 Calling Fast2SMS endpoint:', url.toString().replace(apiKey, '***REDACTED***'));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'cache-control': 'no-cache'
      }
    });

    const responseText = await response.text();
    console.log('📄 Fast2SMS raw response:', responseText.substring(0, 300));

    if (!response.ok) {
      console.error('❌ Fast2SMS API error:', response.status, response.statusText);
      
      // Handle specific error codes
      if (response.status === 412) {
        return {
          success: false,
          error: 'Invalid Fast2SMS API key. Please check your credentials in Settings.'
        };
      }
      
      return {
        success: false,
        error: `Fast2SMS API error: ${response.status}`
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Fast2SMS JSON parse error:', responseText.substring(0, 100));
      return {
        success: false,
        error: 'Invalid JSON response from Fast2SMS'
      };
    }

    console.log('✅ Fast2SMS parsed data:', JSON.stringify(data).substring(0, 300));

    // Check for API error response
    if (data.return === false) {
      return {
        success: false,
        error: data.message?.join(', ') || 'Failed to fetch templates from Fast2SMS'
      };
    }

    // Handle successful response - templates are nested inside sender objects
    if (!data.data || !Array.isArray(data.data)) {
      console.warn('⚠️ Fast2SMS no templates found or empty response');
      return {
        success: true,
        templates: []
      };
    }

    // Parse templates - they are nested inside sender/entity objects
    // Structure: data.data[i].templates[]
    const templates: SMSTemplate[] = [];
    let templateIndex = 0;

    for (const senderObj of data.data) {
      if (!senderObj.templates || !Array.isArray(senderObj.templates)) {
        console.warn('⚠️ Sender object has no templates array:', senderObj.sender_id);
        continue;
      }

      for (const template of senderObj.templates) {
        // Parse variable count from message text ({#VAR#} format)
        const text = template.message || template.template_body || template.content || '';
        const variableMatches = text.match(/\{#[^}]+#\}/g);
        const variableCount = variableMatches ? variableMatches.length : 0;

        // Extract unique variable names (e.g., {#VAR#} -> extract "VAR")
        const uniqueVariables = variableMatches ? [...new Set(variableMatches)] : [];

        templates.push({
          id: `fast2sms_${template.message_id || templateIndex}`,
          provider: 'fast2sms' as const,
          templateId: String(template.message_id || ''),
          dltId: String(template.message_id || ''), // Fast2SMS uses message_id as the DLT ID
          text: text,
          name: template.template_name || template.name || `DLT Template ${templateIndex + 1}`,
          type: template.category?.toLowerCase()?.includes('promo') ? 'promotional' : 'transactional',
          variables: variableCount,
          variableDetails: generateDefaultVariables(variableCount),
          createdAt: Date.now(),
          syncedAt: Date.now()
        });

        templateIndex++;
      }
    }

    console.log(`✅ Fast2SMS: Successfully fetched ${templates.length} DLT templates`);
    return { success: true, templates };
  } catch (error) {
    console.error('❌ Fast2SMS fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching templates from Fast2SMS'
    };
  }
}

/**
 * Fetch templates from MSG91
 * 
 * IMPORTANT: MSG91 does NOT have a public API endpoint to fetch DLT templates.
 * This function attempts alternative endpoints but will likely fail.
 * 
 * For MSG91, users must:
 * 1. Login to MSG91 Dashboard
 * 2. Go to SMS → OneAPI/Flow → Download Templates
 * 3. Upload the Excel/CSV file using our bulk import feature
 * 
 * This is a platform limitation, not a bug in OmniFlow.
 */
export async function fetchMSG91Templates(authKey: string): Promise<{
  success: boolean;
  templates?: SMSTemplate[];
  error?: string;
  requiresManualImport?: boolean;
}> {
  try {
    console.log('📥 Attempting to fetch templates from MSG91...');
    console.log('⚠️ Note: MSG91 does not have a public API for fetching DLT templates');
    
    // Try the v5 API endpoint for templates (may not exist but worth trying)
    const endpoints = [
      'https://api.msg91.com/api/v5/sms/templates',
      'https://control.msg91.com/api/v5/templates',
      'https://api.msg91.com/api/v2/template/list'
    ];

    for (const endpoint of endpoints) {
      console.log('🔗 Trying MSG91 endpoint:', endpoint);
      
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'authkey': authKey,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📄 MSG91 response:', JSON.stringify(data).substring(0, 300));
          
          // If we get templates, parse them
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const templates: SMSTemplate[] = data.data.map((template: any, index: number) => {
              const text = template.message || template.template_body || template.text || '';
              const variableMatches = text.match(/##[^#]+##/g);
              const variableCount = variableMatches ? variableMatches.length : 0;

              return {
                id: `msg91_${template.template_id || template.id || index}`,
                provider: 'msg91' as const,
                templateId: String(template.template_id || template.flow_id || ''),
                dltId: String(template.dlt_template_id || template.DLT_TE_ID || ''),
                text: text,
                name: template.template_name || template.name || `MSG91 Template ${index + 1}`,
                type: template.type?.toLowerCase() === 'promotional' ? 'promotional' : 'transactional',
                variables: variableCount,
                variableDetails: generateDefaultVariables(variableCount),
                createdAt: Date.now(),
                syncedAt: Date.now()
              };
            });

            console.log(`✅ MSG91: Fetched ${templates.length} templates from ${endpoint}`);
            return { success: true, templates };
          }
        }
      } catch (e) {
        console.log(`❌ Endpoint ${endpoint} failed:`, e);
        continue;
      }
    }

    // If all endpoints fail, return helpful message about manual import
    console.warn('⚠️ MSG91: No API endpoint available for fetching templates');
    return {
      success: false,
      templates: [],
      requiresManualImport: true,
      error: 'MSG91 does not provide an API to fetch DLT templates. Please use "Import from Excel/CSV" instead. You can download your templates from MSG91 Dashboard → SMS → OneAPI/Flow → Download Templates.'
    };
  } catch (error) {
    console.error('❌ MSG91 fetch error:', error);
    return {
      success: false,
      requiresManualImport: true,
      error: 'MSG91 does not provide an API for template fetching. Please use "Import from Excel/CSV" - download templates from MSG91 Dashboard → SMS → OneAPI/Flow → Download Templates.'
    };
  }
}

/**
 * Parse MSG91 templates from Excel/CSV export
 * This is the recommended way to import MSG91 templates
 * 
 * Expected columns from MSG91 export:
 * - Template Name, Flow ID, DLT Template ID, Message, Type
 */
export function parseMSG91TemplatesFromExcel(data: any[]): SMSTemplate[] {
  console.log('📊 Parsing MSG91 templates from Excel/CSV data...');
  
  const templates: SMSTemplate[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Find columns by common names (handle variations)
    const templateName = row['Template Name'] || row['template_name'] || row['Name'] || row['name'] || '';
    const flowId = row['Flow ID'] || row['flow_id'] || row['Template ID'] || row['template_id'] || '';
    const dltId = row['DLT Template ID'] || row['DLT_TE_ID'] || row['dlt_template_id'] || row['DLT ID'] || '';
    const message = row['Message'] || row['message'] || row['Template Body'] || row['template_body'] || row['Content'] || '';
    const type = row['Type'] || row['type'] || row['Category'] || '';
    
    // Skip empty rows
    if (!message && !dltId && !flowId) {
      continue;
    }
    
    // Count variables in MSG91 format (##var##)
    const variableMatches = message.match(/##[^#]+##/g);
    const variableCount = variableMatches ? variableMatches.length : 0;
    
    templates.push({
      id: `msg91_${flowId || dltId || `imported_${i}`}`,
      provider: 'msg91',
      templateId: String(flowId || ''),
      dltId: String(dltId || ''),
      text: message,
      name: templateName || `MSG91 Template ${i + 1}`,
      type: type?.toLowerCase()?.includes('promo') ? 'promotional' : 'transactional',
      variables: variableCount,
      variableDetails: generateDefaultVariables(variableCount),
      createdAt: Date.now(),
      syncedAt: Date.now()
    });
  }
  
  console.log(`✅ Parsed ${templates.length} MSG91 templates from Excel/CSV`);
  return templates;
}

/**
 * Parse Fast2SMS templates from Excel/CSV export (alternative to API)
 * For users who prefer to import from downloaded file
 */
export function parseFast2SMSTemplatesFromExcel(data: any[]): SMSTemplate[] {
  console.log('📊 Parsing Fast2SMS templates from Excel/CSV data...');
  
  const templates: SMSTemplate[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Find columns by common names
    const templateName = row['Template Name'] || row['template_name'] || row['Name'] || '';
    const templateId = row['Template ID'] || row['template_id'] || row['ID'] || '';
    const dltId = row['DLT Template ID'] || row['dlt_template_id'] || row['DLT ID'] || templateId || '';
    const message = row['Message'] || row['message'] || row['Template Body'] || row['template_body'] || row['Content'] || '';
    const category = row['Category'] || row['category'] || row['Type'] || '';
    
    if (!message && !dltId) {
      continue;
    }
    
    // Count variables in Fast2SMS format ({#var#})
    const variableMatches = message.match(/\{#[^}]+#\}/g);
    const variableCount = variableMatches ? variableMatches.length : 0;
    
    templates.push({
      id: `fast2sms_${templateId || dltId || `imported_${i}`}`,
      provider: 'fast2sms',
      templateId: String(templateId || ''),
      dltId: String(dltId || ''),
      text: message,
      name: templateName || `Fast2SMS Template ${i + 1}`,
      type: category?.toLowerCase()?.includes('promo') ? 'promotional' : 'transactional',
      variables: variableCount,
      variableDetails: generateDefaultVariables(variableCount),
      createdAt: Date.now(),
      syncedAt: Date.now()
    });
  }
  
  console.log(`✅ Parsed ${templates.length} Fast2SMS templates from Excel/CSV`);
  return templates;
}
