'use server';

/**
 * MSG91 Bulk SMS Server Actions
 * Handles bulk SMS messaging through MSG91
 * Uses secure authentication with Firebase ID tokens
 */

import { 
  sendBulkSMSMSG91, 
  sendBulkSMSViaFlowAPI,
  sendOTPMSG91, 
  getSMSDeliveryReportMSG91,
  getSMSBalanceMSG91,
  validateMSG91Connection,
  calculateSMSCount,
  estimateSMSCost,
  formatPhoneForMSG91,
  isUnicodeMessage,
  type SendSMSResult,
  type SMSDeliveryReport,
  type FlowRecipient
} from '@/lib/msg91-client';
import { getValueFromContact } from '@/lib/sms-templates-sync';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';

/**
 * Variable mapping type from the UI component
 */
interface VariableMappingInput {
  position: number;
  placeholder: string;
  mappingType: 'field' | 'static';
  fieldMapping?: string;
  staticValue?: string;
}

/**
 * Check if any variable mappings are personalized (field-based vs static)
 */
function hasPersonalizedMappings(mappings: VariableMappingInput[]): boolean {
  return mappings.some(m => m.mappingType === 'field');
}

/**
 * Validate all mappings have values
 */
function validateMappings(mappings: VariableMappingInput[]): { valid: boolean; error?: string } {
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    if (mapping.mappingType === 'static' && (!mapping.staticValue || mapping.staticValue.trim() === '')) {
      return { valid: false, error: `Variable ${i + 1} (${mapping.placeholder}) requires a static value` };
    }
    if (mapping.mappingType === 'field' && !mapping.fieldMapping) {
      return { valid: false, error: `Variable ${i + 1} (${mapping.placeholder}) requires a contact field mapping` };
    }
  }
  return { valid: true };
}

/**
 * Send bulk SMS campaign via MSG91
 * Supports multiple variables per template with flexible mapping
 * For personalized messages (field-based mappings), sends individual API calls per recipient
 * For static-only mappings, sends batch request
 */
export async function sendBulkSMSViaMSG91Action(input: {
  idToken: string;
  message?: string;
  recipients: { phone: string; name?: string; email?: string }[];
  messageType?: 'promotional' | 'transactional';
  templateId?: string;
  dltTemplateId?: string;
  variableMappings?: VariableMappingInput[];
}): Promise<{
  success: boolean;
  campaignId?: string;
  requestId?: string;
  messageId?: string;
  error?: string;
  smsCount?: number;
  estimatedCost?: number;
  sent?: number;
  failed?: number;
  failedRecipients?: { phone: string; error: string }[];
}> {
  try {
    const { idToken, message, recipients, messageType, templateId, dltTemplateId, variableMappings } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user to retrieve companyId using Firebase Admin
    if (!adminDb) {
      return { success: false, error: 'Database connection failed' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }
    
    const user = userDoc.data() as any;
    if (!user.companyId) {
      return { success: false, error: 'User has no company assigned' };
    }

    // Verify company exists and has MSG91 configured
    const companyDoc = await adminDb.collection('companies').doc(user.companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }
    
    const company = companyDoc.data() as any;
    
    if (!company?.apiKeys?.msg91) {
      return { 
        success: false, 
        error: 'MSG91 not configured. Please add your MSG91 Auth Key in Settings.' 
      };
    }

    // Server-side validation: DLT Template ID is required for promotional SMS in India
    if (messageType === 'promotional' && (!dltTemplateId || (typeof dltTemplateId === 'string' && dltTemplateId.trim() === ''))) {
      return {
        success: false,
        error: 'DLT Template ID is mandatory for promotional SMS in India. Please register your template with TRAI DLT.'
      };
    }
    
    // Validate template ID exists
    if (!templateId || (typeof templateId === 'string' && templateId.trim() === '')) {
      return {
        success: false,
        error: 'MSG91 Template ID is required. Please provide your template ID from MSG91 dashboard.'
      };
    }

    // Validate variable mappings if provided
    if (variableMappings && variableMappings.length > 0) {
      const validation = validateMappings(variableMappings);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    const config = {
      authKey: company.apiKeys.msg91.authKey,
      senderId: company.apiKeys.msg91.senderId
    };

    // Use provided message or a default template
    const templateMessage = message || `Dear ##var##, Thank you for being our valued customer.`;
    
    // Check if message is Unicode
    const unicode = isUnicodeMessage(templateMessage);
    
    // Calculate SMS count per message
    const smsCount = calculateSMSCount(templateMessage, unicode);
    
    // Estimate cost (₹0.25 per SMS default)
    const estimatedCost = estimateSMSCost(smsCount, recipients.length, 0.25);

    // CORRECT APPROACH: Use MSG91 Flow API with variables passed directly
    // MSG91 will substitute them in the template - no need for manual substitution!
    const hasTemplate = templateId && templateId.trim() !== '';
    const hasVariables = variableMappings && variableMappings.length > 0;

    console.log('📤 MSG91 Action: Sending SMS Campaign');
    console.log('   Template/Flow ID:', templateId);
    console.log('   DLT_TE_ID:', dltTemplateId);
    console.log('   Route:', messageType);
    console.log('   Variable Count:', variableMappings?.length || 0);
    console.log('   Recipients:', recipients.length);

    if (hasTemplate && hasVariables) {
      // Check if we have field-based (personalized) mappings
      const isPersonalized = variableMappings!.some(m => m.mappingType === 'field');
      
      if (isPersonalized) {
        // PER-RECIPIENT PERSONALIZATION: Each recipient gets their own variable values
        // Use memory-efficient batch processing with limited concurrency
        console.log('   Strategy: Per-recipient personalization (field-based variables)');
        
        let successCount = 0;
        let failedCount = 0;
        let lastMessageId: string | undefined;
        
        const BATCH_SIZE = 50; // Process 50 recipients per batch
        const CONCURRENT_LIMIT = 5; // Maximum concurrent API calls
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process in batches with limited concurrency to avoid memory overload
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
          const batch = recipients.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);
          
          console.log(`   Batch ${batchNumber}/${totalBatches} (${batch.length} recipients)`);
          
          // Process batch with limited concurrency
          for (let j = 0; j < batch.length; j += CONCURRENT_LIMIT) {
            const chunk = batch.slice(j, j + CONCURRENT_LIMIT);
            
            await Promise.all(chunk.map(async (recipient) => {
              try {
                const formattedPhone = formatPhoneForMSG91(recipient.phone);
                
                // Substitute variables for THIS specific recipient
                let substitutedMessage = message || templateMessage;
                
                variableMappings!.forEach((mapping, index) => {
                  let value = '';
                  if (mapping.mappingType === 'static') {
                    value = mapping.staticValue || '';
                  } else {
                    value = getValueFromContact(recipient as any, mapping.fieldMapping, '');
                  }
                  const varPattern = new RegExp(`##var${index + 1}##`, 'gi');
                  substitutedMessage = substitutedMessage.replace(varPattern, value);
                });

                const result = await sendBulkSMSMSG91(config, {
                  message: substitutedMessage,
                  recipients: [formattedPhone],
                  route: messageType || 'transactional',
                  dltTemplateId,
                  unicode
                });

                if (result.success) {
                  successCount++;
                  if (result.messageId) lastMessageId = result.messageId;
                } else {
                  failedCount++;
                }
              } catch (error) {
                failedCount++;
              }
            }));
            
            // Small delay between chunks
            if (j + CONCURRENT_LIMIT < batch.length) {
              await delay(100);
            }
          }
          
          // Delay between batches
          if (i + BATCH_SIZE < recipients.length) {
            await delay(500);
          }
        }

        console.log(`✅ Campaign complete: ${successCount} sent, ${failedCount} failed`);

        return {
          success: failedCount === 0,
          requestId: lastMessageId,
          messageId: lastMessageId,
          sent: successCount,
          failed: failedCount,
          smsCount,
          estimatedCost
        };
      } else {
        // BATCH SEND: All recipients get the same substituted message (static variables)
        console.log('   Strategy: Batch send with static variable substitution');
        
        let substitutedMessage = message || templateMessage;
        
        // Substitute static variables (same for all recipients)
        variableMappings!.forEach((mapping, index) => {
          const value = mapping.staticValue || '';
          const varPattern = new RegExp(`##var${index + 1}##`, 'gi');
          substitutedMessage = substitutedMessage.replace(varPattern, value);
        });
        
        console.log(`   Substituted message: ${substitutedMessage.substring(0, 70)}...`);

        const formattedRecipients = recipients.map(r => formatPhoneForMSG91(r.phone));

        const result = await sendBulkSMSMSG91(config, {
          message: substitutedMessage,
          recipients: formattedRecipients,
          route: messageType || 'transactional',
          dltTemplateId,
          unicode
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            sent: 0,
            failed: recipients.length
          };
        }

        console.log(`✅ Campaign complete: ${recipients.length} sent via batch`);

        return {
          success: true,
          requestId: result.requestId,
          messageId: result.messageId,
          sent: recipients.length,
          failed: 0,
          smsCount,
          estimatedCost
        };
      }
    } else {
      // No template or no variables - send regular SMS
      console.log('   Strategy: Regular SMS (no template)');
      const formattedRecipients = recipients.map(r => formatPhoneForMSG91(r.phone));

      const result = await sendBulkSMSMSG91(config, {
        message: templateMessage,
        recipients: formattedRecipients,
        route: messageType || 'transactional',
        templateId,
        dltTemplateId,
        unicode
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          sent: 0,
          failed: recipients.length
        };
      }

      return {
        success: true,
        requestId: result.requestId,
        messageId: result.messageId,
        smsCount,
        estimatedCost,
        sent: recipients.length,
        failed: 0
      };
    }
  } catch (error) {
    console.error('sendBulkSMSViaMSG91Action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS campaign'
    };
  }
}

/**
 * Helper to get user data from Firestore
 */
async function getUserAndCompany(uid: string): Promise<{
  success: boolean;
  user?: any;
  company?: any;
  error?: string;
}> {
  if (!adminDb) {
    return { success: false, error: 'Database connection failed' };
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return { success: false, error: 'User not found' };
  }
  
  const user = userDoc.data() as any;
  if (!user.companyId) {
    return { success: false, error: 'User has no company assigned' };
  }

  const companyDoc = await adminDb.collection('companies').doc(user.companyId).get();
  if (!companyDoc.exists) {
    return { success: false, error: 'Company not found' };
  }
  
  const company = companyDoc.data() as any;
  return { success: true, user, company };
}

/**
 * Send OTP via MSG91
 */
export async function sendOTPViaMSG91Action(input: {
  idToken: string;
  phone: string;
  otp: string;
  templateId?: string;
}): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> {
  try {
    const { idToken, phone, otp, templateId } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user and company data
    const { success, user, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }
    
    if (!company?.apiKeys?.msg91) {
      return { 
        success: false, 
        error: 'MSG91 not configured. Please add your MSG91 Auth Key in Settings.' 
      };
    }

    const config = {
      authKey: company.apiKeys.msg91.authKey,
      senderId: company.apiKeys.msg91.senderId
    };

    const result = await sendOTPMSG91(
      config,
      formatPhoneForMSG91(phone),
      otp,
      templateId
    );

    return {
      success: result.success,
      requestId: result.requestId,
      error: result.error
    };
  } catch (error) {
    console.error('sendOTPViaMSG91Action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP'
    };
  }
}

/**
 * Get SMS delivery report from MSG91
 */
export async function getSMSDeliveryReportAction(input: {
  idToken: string;
  requestId: string;
}): Promise<{
  success: boolean;
  reports?: SMSDeliveryReport[];
  error?: string;
}> {
  try {
    const { idToken, requestId } = input;

    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user and company data
    const { success, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }
    
    if (!company?.apiKeys?.msg91) {
      return { 
        success: false, 
        error: 'MSG91 not configured.' 
      };
    }

    const config = {
      authKey: company.apiKeys.msg91.authKey,
      senderId: company.apiKeys.msg91.senderId
    };

    return await getSMSDeliveryReportMSG91(config, requestId);
  } catch (error) {
    console.error('getSMSDeliveryReportAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch delivery report'
    };
  }
}

/**
 * Get SMS balance from MSG91
 */
export async function getSMSBalanceAction(
  idToken: string
): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get user and company data
    const { success, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }
    
    if (!company?.apiKeys?.msg91) {
      return { 
        success: false, 
        error: 'MSG91 not configured.' 
      };
    }

    const config = {
      authKey: company.apiKeys.msg91.authKey,
      senderId: company.apiKeys.msg91.senderId
    };

    return await getSMSBalanceMSG91(config);
  } catch (error) {
    console.error('getSMSBalanceAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balance'
    };
  }
}

/**
 * Validate MSG91 connection (for testing API keys before saving)
 */
export async function validateMSG91ConnectionAction(input: {
  authKey: string;
  senderId: string;
}): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const config = {
      authKey: input.authKey,
      senderId: input.senderId
    };

    const result = await validateMSG91Connection(config);
    
    if (!result.success) {
      return result;
    }

    // Also get balance to show user
    const balanceResult = await getSMSBalanceMSG91(config);
    
    return {
      success: true,
      balance: balanceResult.balance
    };
  } catch (error) {
    console.error('validateMSG91ConnectionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection'
    };
  }
}

/**
 * Calculate SMS cost (helper action for UI)
 */
export async function calculateSMSCostAction(input: {
  message: string;
  recipientCount: number;
}): Promise<{
  smsCount: number;
  estimatedCost: number;
  isUnicode: boolean;
}> {
  const isUnicode = isUnicodeMessage(input.message);
  const smsCount = calculateSMSCount(input.message, isUnicode);
  const estimatedCost = estimateSMSCost(smsCount, input.recipientCount, 0.25);

  return {
    smsCount,
    estimatedCost,
    isUnicode
  };
}

// ============================================
// MSG91 TEMPLATE MANAGEMENT
// ============================================

export interface MSG91Template {
  id: string;
  templateId: string;
  dltId: string;
  name: string;
  text: string;
  type: 'promotional' | 'transactional';
  variables: {
    position: number;
    description: string;
    defaultMapping?: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Parse template text to detect variables (##var##)
 * Returns the count of variables found
 */
function parseTemplateVariables(text: string): number {
  const matches = text.match(/##[^#]+##/g);
  return matches ? matches.length : 0;
}

/**
 * Add a new MSG91 template to the company's template registry
 * Supports upsert mode to update existing templates instead of failing
 */
export async function addMSG91TemplateAction(input: {
  idToken: string;
  template: {
    templateId: string;
    dltId: string;
    name: string;
    text: string;
    type: 'promotional' | 'transactional';
    variables?: {
      position: number;
      description: string;
      defaultMapping?: string;
    }[];
  };
  upsert?: boolean; // If true, update existing template instead of failing
}): Promise<{
  success: boolean;
  templateId?: string;
  error?: string;
  existingTemplate?: MSG91Template; // Return existing template if duplicate found and upsert is false
  isUpdate?: boolean; // True if this was an update rather than new insert
}> {
  try {
    const { idToken, template, upsert = false } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const { success, user, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !user || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database connection failed' };
    }

    const variableCount = parseTemplateVariables(template.text);
    const defaultVariables = Array.from({ length: variableCount }, (_, i) => {
      const variable: any = {
        position: i + 1,
        description: i === 0 ? 'Customer Name' : `Variable ${i + 1}`,
      };
      if (i === 0) {
        variable.defaultMapping = 'contact.name';
      }
      return variable;
    });

    const existingTemplates: MSG91Template[] = company.smsTemplates?.msg91 || [];
    
    // Find existing template by templateId or dltId
    const existingIndex = existingTemplates.findIndex((t: MSG91Template) => 
      t.templateId === template.templateId || t.dltId === template.dltId
    );
    const existingTemplate = existingIndex >= 0 ? existingTemplates[existingIndex] : null;

    if (existingTemplate && !upsert) {
      // Return existing template info for the UI to handle
      return { 
        success: false, 
        error: 'A template with this Template ID or DLT ID already exists',
        existingTemplate
      };
    }

    if (existingTemplate && upsert) {
      // Update existing template
      const updatedTemplate: MSG91Template = {
        ...existingTemplate,
        templateId: template.templateId,
        dltId: template.dltId,
        name: template.name,
        text: template.text,
        type: template.type,
        variables: template.variables || defaultVariables,
        updatedAt: Date.now()
      };

      existingTemplates[existingIndex] = updatedTemplate;

      await adminDb.collection('companies').doc(user.companyId).update({
        'smsTemplates.msg91': existingTemplates,
        'smsTemplates.msg91UpdatedAt': Date.now()
      });

      console.log(`✅ Updated MSG91 template: ${updatedTemplate.name} (${updatedTemplate.id})`);
      return { success: true, templateId: updatedTemplate.id, isUpdate: true };
    }

    // Add new template
    const newTemplate: MSG91Template = {
      id: `msg91_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.templateId,
      dltId: template.dltId,
      name: template.name,
      text: template.text,
      type: template.type,
      variables: template.variables || defaultVariables,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await adminDb.collection('companies').doc(user.companyId).update({
      'smsTemplates.msg91': [...existingTemplates, newTemplate],
      'smsTemplates.msg91UpdatedAt': Date.now()
    });

    console.log(`✅ Added MSG91 template: ${newTemplate.name} (${newTemplate.id})`);
    return { success: true, templateId: newTemplate.id, isUpdate: false };
  } catch (error) {
    console.error('addMSG91TemplateAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add template'
    };
  }
}

/**
 * Clone Fast2SMS templates to MSG91
 * Since DLT IDs are the same, user only needs to provide MSG91 template ID
 */
export async function cloneFast2SMSToMSG91Action(input: {
  idToken: string;
  fast2smsTemplateId: string; // The Fast2SMS template ID to clone
  msg91TemplateId: string; // The MSG91 platform-specific template ID
}): Promise<{
  success: boolean;
  templateId?: string;
  error?: string;
}> {
  try {
    const { idToken, fast2smsTemplateId, msg91TemplateId } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const { success, user, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !user || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database connection failed' };
    }

    // Find the Fast2SMS template
    const fast2smsTemplates = company.smsTemplates?.fast2sms || [];
    const sourceTemplate = fast2smsTemplates.find((t: any) => t.id === fast2smsTemplateId);

    if (!sourceTemplate) {
      return { success: false, error: 'Fast2SMS template not found' };
    }

    // Check if MSG91 template with same DLT ID already exists
    const msg91Templates: MSG91Template[] = company.smsTemplates?.msg91 || [];
    const existingMsg91 = msg91Templates.find((t: MSG91Template) => 
      t.dltId === sourceTemplate.dltId || t.templateId === msg91TemplateId
    );

    if (existingMsg91) {
      // Update existing with new MSG91 template ID
      const updatedTemplates = msg91Templates.map((t: MSG91Template) => {
        if (t.id === existingMsg91.id) {
          return {
            ...t,
            templateId: msg91TemplateId,
            updatedAt: Date.now()
          };
        }
        return t;
      });

      await adminDb.collection('companies').doc(user.companyId).update({
        'smsTemplates.msg91': updatedTemplates,
        'smsTemplates.msg91UpdatedAt': Date.now()
      });

      console.log(`✅ Updated MSG91 template from Fast2SMS: ${existingMsg91.name}`);
      return { success: true, templateId: existingMsg91.id };
    }

    // Create new MSG91 template from Fast2SMS template
    const variableCount = parseTemplateVariables(sourceTemplate.text);
    const newTemplate: MSG91Template = {
      id: `msg91_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: msg91TemplateId,
      dltId: sourceTemplate.dltId,
      name: sourceTemplate.name || `From Fast2SMS: ${sourceTemplate.templateId}`,
      text: sourceTemplate.text,
      type: sourceTemplate.type || 'transactional',
      variables: Array.from({ length: variableCount }, (_, i) => ({
        position: i + 1,
        description: i === 0 ? 'Customer Name' : `Variable ${i + 1}`,
        defaultMapping: i === 0 ? 'contact.name' : undefined
      })),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await adminDb.collection('companies').doc(user.companyId).update({
      'smsTemplates.msg91': [...msg91Templates, newTemplate],
      'smsTemplates.msg91UpdatedAt': Date.now()
    });

    console.log(`✅ Cloned Fast2SMS template to MSG91: ${newTemplate.name}`);
    return { success: true, templateId: newTemplate.id };
  } catch (error) {
    console.error('cloneFast2SMSToMSG91Action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clone template'
    };
  }
}

/**
 * Update an existing MSG91 template
 */
export async function updateMSG91TemplateAction(input: {
  idToken: string;
  templateId: string;
  updates: Partial<{
    templateId: string;
    dltId: string;
    name: string;
    text: string;
    type: 'promotional' | 'transactional';
    variables: {
      position: number;
      description: string;
      defaultMapping?: string;
    }[];
  }>;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, templateId, updates } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const { success, user, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !user || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database connection failed' };
    }

    const existingTemplates: MSG91Template[] = company.smsTemplates?.msg91 || [];
    const templateIndex = existingTemplates.findIndex(t => t.id === templateId);

    if (templateIndex === -1) {
      return { success: false, error: 'Template not found' };
    }

    if (updates.text) {
      const variableCount = parseTemplateVariables(updates.text);
      if (!updates.variables) {
        updates.variables = Array.from({ length: variableCount }, (_, i) => ({
          position: i + 1,
          description: existingTemplates[templateIndex].variables[i]?.description || 
            (i === 0 ? 'Customer Name' : `Variable ${i + 1}`),
          defaultMapping: existingTemplates[templateIndex].variables[i]?.defaultMapping
        }));
      }
    }

    const updatedTemplate = {
      ...existingTemplates[templateIndex],
      ...updates,
      updatedAt: Date.now()
    };

    existingTemplates[templateIndex] = updatedTemplate;

    await adminDb.collection('companies').doc(user.companyId).update({
      'smsTemplates.msg91': existingTemplates,
      'smsTemplates.msg91UpdatedAt': Date.now()
    });

    console.log(`✅ Updated MSG91 template: ${updatedTemplate.name}`);
    return { success: true };
  } catch (error) {
    console.error('updateMSG91TemplateAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template'
    };
  }
}

/**
 * Delete an MSG91 template
 */
export async function deleteMSG91TemplateAction(input: {
  idToken: string;
  templateId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, templateId } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const { success, user, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !user || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database connection failed' };
    }

    const existingTemplates: MSG91Template[] = company.smsTemplates?.msg91 || [];
    const filteredTemplates = existingTemplates.filter(t => t.id !== templateId);

    if (filteredTemplates.length === existingTemplates.length) {
      return { success: false, error: 'Template not found' };
    }

    await adminDb.collection('companies').doc(user.companyId).update({
      'smsTemplates.msg91': filteredTemplates,
      'smsTemplates.msg91UpdatedAt': Date.now()
    });

    console.log(`✅ Deleted MSG91 template: ${templateId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteMSG91TemplateAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template'
    };
  }
}

/**
 * Get all MSG91 templates for the company
 */
export async function getMSG91TemplatesAction(input: {
  idToken: string;
}): Promise<{
  success: boolean;
  templates?: MSG91Template[];
  error?: string;
}> {
  try {
    const { idToken } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const { success, company, error } = await getUserAndCompany(authResult.uid);
    if (!success || !company) {
      return { success: false, error: error || 'Failed to get user data' };
    }

    const templates: MSG91Template[] = company.smsTemplates?.msg91 || [];
    console.log(`📋 Fetched ${templates.length} MSG91 templates`);
    
    return { success: true, templates };
  } catch (error) {
    console.error('getMSG91TemplatesAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates'
    };
  }
}
