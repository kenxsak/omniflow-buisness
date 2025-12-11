'use server';

import { verifyAuthToken, getCompanyIdFromToken } from '@/lib/firebase-admin';
import { 
  createSavedEmailTemplate,
  updateSavedEmailTemplate,
  getSavedEmailTemplate,
  getSavedEmailTemplates,
  deleteSavedEmailTemplate,
  incrementTemplateSendCount
} from '@/lib/saved-email-templates-data-server';
import type { 
  SavedEmailTemplate, 
  CreateSavedEmailTemplateInput,
  UpdateSavedEmailTemplateInput 
} from '@/types/templates';

export interface CreateSavedEmailTemplateActionInput {
  idToken: string;
  template: CreateSavedEmailTemplateInput;
}

export async function createSavedEmailTemplateAction(
  input: CreateSavedEmailTemplateActionInput
): Promise<{ success: true; template: SavedEmailTemplate } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await createSavedEmailTemplate(companyId, tokenResult.uid, input.template);
    return result;
  } catch (error: any) {
    console.error('Error in createSavedEmailTemplateAction:', error);
    return { success: false, error: error.message || 'Failed to create template' };
  }
}

export interface UpdateSavedEmailTemplateActionInput {
  idToken: string;
  template: UpdateSavedEmailTemplateInput;
}

export async function updateSavedEmailTemplateAction(
  input: UpdateSavedEmailTemplateActionInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await updateSavedEmailTemplate(companyId, input.template);
    return result;
  } catch (error: any) {
    console.error('Error in updateSavedEmailTemplateAction:', error);
    return { success: false, error: error.message || 'Failed to update template' };
  }
}

export interface GetSavedEmailTemplateActionInput {
  idToken: string;
  templateId: string;
}

export async function getSavedEmailTemplateAction(
  input: GetSavedEmailTemplateActionInput
): Promise<{ success: true; template: SavedEmailTemplate } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await getSavedEmailTemplate(companyId, input.templateId);
    return result;
  } catch (error: any) {
    console.error('Error in getSavedEmailTemplateAction:', error);
    return { success: false, error: error.message || 'Failed to get template' };
  }
}

export interface GetSavedEmailTemplatesActionInput {
  idToken: string;
}

export async function getSavedEmailTemplatesAction(
  input: GetSavedEmailTemplatesActionInput
): Promise<{ success: true; templates: SavedEmailTemplate[] } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await getSavedEmailTemplates(companyId);
    return result;
  } catch (error: any) {
    console.error('Error in getSavedEmailTemplatesAction:', error);
    return { success: false, error: error.message || 'Failed to get templates' };
  }
}

export interface DeleteSavedEmailTemplateActionInput {
  idToken: string;
  templateId: string;
}

export async function deleteSavedEmailTemplateAction(
  input: DeleteSavedEmailTemplateActionInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await deleteSavedEmailTemplate(companyId, input.templateId);
    return result;
  } catch (error: any) {
    console.error('Error in deleteSavedEmailTemplateAction:', error);
    return { success: false, error: error.message || 'Failed to delete template' };
  }
}

export interface IncrementTemplateSendCountActionInput {
  idToken: string;
  templateId: string;
}

export async function incrementTemplateSendCountAction(
  input: IncrementTemplateSendCountActionInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const tokenResult = await verifyAuthToken(input.idToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const companyId = await getCompanyIdFromToken(input.idToken);
    if (!companyId) {
      return { success: false, error: 'Could not determine company ID' };
    }

    const result = await incrementTemplateSendCount(companyId, input.templateId);
    return result;
  } catch (error: any) {
    console.error('Error in incrementTemplateSendCountAction:', error);
    return { success: false, error: error.message || 'Failed to increment send count' };
  }
}
