'use server';

/**
 * SMS Templates Server Actions
 * Sync templates from Fast2SMS and MSG91 to Firestore
 * 
 * API Availability:
 * - Fast2SMS: Has API endpoint (dlt_manager?type=template) - can auto-sync
 * - MSG91: NO public API for template listing - requires Excel/CSV import
 * 
 * India DLT Compliance:
 * All promotional SMS in India require TRAI DLT registration.
 * Templates must be approved on DLT portal before use.
 */

import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { 
  fetchFast2SMSTemplates, 
  fetchMSG91Templates, 
  parseMSG91TemplatesFromExcel, 
  parseFast2SMSTemplatesFromExcel,
  type SMSTemplate 
} from '@/lib/sms-templates-sync';

/**
 * Sync templates from Fast2SMS to Firestore
 */
export async function syncFast2SMSTemplatesAction(input: {
  idToken: string;
}): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { idToken } = input;

    // Verify auth
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user and company
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    // Get company and API key
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();
    if (!company?.apiKeys?.fast2sms?.apiKey) {
      return { success: false, error: 'Fast2SMS not configured. Please add your API key in Settings.' };
    }

    // Decrypt API key - Fast2SMS stores apiKey inside an object
    let apiKey: string;
    try {
      apiKey = decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt Fast2SMS API key' };
      }
    } catch (error) {
      console.error('Fast2SMS API key decryption error:', error);
      return { success: false, error: 'Failed to decrypt Fast2SMS API key' };
    }

    // Fetch templates from Fast2SMS
    const result = await fetchFast2SMSTemplates(apiKey);
    if (!result.success || !result.templates) {
      return { success: false, error: result.error };
    }

    // Store in Firestore
    await adminDb.collection('companies').doc(companyId).update({
      'smsTemplates.fast2sms': result.templates,
      'smsTemplates.fast2smsSyncedAt': Date.now()
    });

    console.log(`✅ Synced ${result.templates.length} Fast2SMS templates`);
    return { success: true, count: result.templates.length };
  } catch (error) {
    console.error('Sync Fast2SMS templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync templates'
    };
  }
}

/**
 * Sync templates from MSG91 to Firestore
 */
export async function syncMSG91TemplatesAction(input: {
  idToken: string;
}): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { idToken } = input;

    // Verify auth
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user and company
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    // Get company and API key
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();
    if (!company?.apiKeys?.msg91?.authKey) {
      return { success: false, error: 'MSG91 not configured. Please add your API key in Settings.' };
    }

    // Decrypt API key - MSG91 stores authKey inside an object
    let authKey: string;
    try {
      authKey = decryptApiKeyServerSide(company.apiKeys.msg91.authKey);
      if (!authKey) {
        return { success: false, error: 'Failed to decrypt MSG91 API key' };
      }
    } catch (error) {
      console.error('MSG91 API key decryption error:', error);
      return { success: false, error: 'Failed to decrypt MSG91 API key' };
    }

    // Fetch templates from MSG91
    const result = await fetchMSG91Templates(authKey);
    if (!result.success || !result.templates) {
      return { success: false, error: result.error };
    }

    // Store in Firestore
    await adminDb.collection('companies').doc(companyId).update({
      'smsTemplates.msg91': result.templates,
      'smsTemplates.msg91SyncedAt': Date.now()
    });

    console.log(`✅ Synced ${result.templates.length} MSG91 templates`);
    return { success: true, count: result.templates.length };
  } catch (error) {
    console.error('Sync MSG91 templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync templates'
    };
  }
}

/**
 * Get cached templates for a company
 */
export async function getSMSTemplatesAction(input: {
  idToken: string;
  provider?: 'fast2sms' | 'msg91';
}): Promise<{
  success: boolean;
  templates?: SMSTemplate[];
  error?: string;
}> {
  try {
    const { idToken, provider } = input;

    console.log('📋 getSMSTemplatesAction called for provider:', provider);

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      console.error('❌ Auth failed:', authResult.error);
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyDoc.data();
    const smsTemplates = company?.smsTemplates || {};

    console.log('📦 SMS Templates in DB:', {
      fast2sms: smsTemplates.fast2sms?.length || 0,
      msg91: smsTemplates.msg91?.length || 0
    });

    let templates: SMSTemplate[] = [];

    if (!provider || provider === 'fast2sms') {
      templates.push(...(smsTemplates.fast2sms || []));
    }

    if (!provider || provider === 'msg91') {
      templates.push(...(smsTemplates.msg91 || []));
    }

    console.log('✅ Returning', templates.length, 'templates');
    return { success: true, templates };
  } catch (error) {
    console.error('❌ Get SMS templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates'
    };
  }
}

/**
 * Import SMS templates from Excel/CSV data
 * This is the recommended way for MSG91 templates since they don't have an API
 * Also works for Fast2SMS as an alternative to API sync
 * 
 * Usage:
 * 1. User downloads templates from MSG91 Dashboard → SMS → OneAPI/Flow → Download Templates
 * 2. User uploads the Excel/CSV file in OmniFlow
 * 3. This action parses and stores the templates
 */
export async function importSMSTemplatesFromExcelAction(input: {
  idToken: string;
  provider: 'msg91' | 'fast2sms';
  data: any[]; // Parsed Excel/CSV rows
}): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { idToken, provider, data } = input;

    console.log(`📥 Importing ${data.length} rows for ${provider} templates...`);

    // Verify auth
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user and company
    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    // Parse templates based on provider
    let templates: SMSTemplate[];
    if (provider === 'msg91') {
      templates = parseMSG91TemplatesFromExcel(data);
    } else {
      templates = parseFast2SMSTemplatesFromExcel(data);
    }

    if (templates.length === 0) {
      return {
        success: false,
        error: 'No valid templates found in the uploaded file. Please check the format.'
      };
    }

    // Get existing templates and merge (avoid duplicates)
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    const existingTemplates = companyDoc.data()?.smsTemplates?.[provider] || [];
    
    // Create a map of existing template IDs for deduplication
    const existingIds = new Set(existingTemplates.map((t: SMSTemplate) => t.dltId || t.templateId));
    
    // Filter out duplicates and merge
    const newTemplates = templates.filter(t => !existingIds.has(t.dltId) && !existingIds.has(t.templateId));
    const mergedTemplates = [...existingTemplates, ...newTemplates];

    // Store in Firestore
    const updateData: any = {};
    updateData[`smsTemplates.${provider}`] = mergedTemplates;
    updateData[`smsTemplates.${provider}ImportedAt`] = Date.now();
    
    await adminDb.collection('companies').doc(companyId).update(updateData);

    console.log(`✅ Imported ${newTemplates.length} new templates for ${provider} (${existingTemplates.length} existing, ${mergedTemplates.length} total)`);
    
    return { 
      success: true, 
      count: newTemplates.length 
    };
  } catch (error) {
    console.error('❌ Import SMS templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import templates'
    };
  }
}

/**
 * Delete a specific SMS template
 */
export async function deleteSMSTemplateAction(input: {
  idToken: string;
  templateId: string;
  provider: 'msg91' | 'fast2sms';
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, templateId, provider } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    const templates = companyDoc.data()?.smsTemplates?.[provider] || [];
    
    const filteredTemplates = templates.filter((t: SMSTemplate) => t.id !== templateId);
    
    if (filteredTemplates.length === templates.length) {
      return { success: false, error: 'Template not found' };
    }

    const updateData: any = {};
    updateData[`smsTemplates.${provider}`] = filteredTemplates;
    
    await adminDb.collection('companies').doc(companyId).update(updateData);

    console.log(`✅ Deleted template ${templateId} from ${provider}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete SMS template error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template'
    };
  }
}

/**
 * Clear all templates for a provider
 */
export async function clearSMSTemplatesAction(input: {
  idToken: string;
  provider: 'msg91' | 'fast2sms';
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { idToken, provider } = input;

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'User not associated with company' };
    }

    const updateData: any = {};
    updateData[`smsTemplates.${provider}`] = [];
    updateData[`smsTemplates.${provider}ClearedAt`] = Date.now();
    
    await adminDb.collection('companies').doc(companyId).update(updateData);

    console.log(`✅ Cleared all ${provider} templates`);
    return { success: true };
  } catch (error) {
    console.error('❌ Clear SMS templates error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear templates'
    };
  }
}
