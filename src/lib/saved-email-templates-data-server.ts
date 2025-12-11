'use server';

import { adminDb } from './firebase-admin';
import type { 
  SavedEmailTemplate, 
  CreateSavedEmailTemplateInput,
  UpdateSavedEmailTemplateInput 
} from '@/types/templates';
import { FieldValue } from 'firebase-admin/firestore';

export async function createSavedEmailTemplate(
  companyId: string,
  createdBy: string,
  input: CreateSavedEmailTemplateInput
): Promise<{ success: true; template: SavedEmailTemplate } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templatesRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates');
    
    const templateData = {
      companyId,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      name: input.name,
      description: input.description || null,
      subject: input.subject,
      htmlContent: input.htmlContent,
      previewText: input.previewText || null,
      originalPrompt: input.originalPrompt || null,
      sourceDraftId: input.sourceDraftId || null,
      lastSentAt: null,
      sendCount: 0,
      tags: input.tags || [],
    };

    const docRef = await templatesRef.add(templateData);
    
    const template: SavedEmailTemplate = {
      id: docRef.id,
      companyId,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: input.name,
      description: input.description,
      subject: input.subject,
      htmlContent: input.htmlContent,
      previewText: input.previewText,
      originalPrompt: input.originalPrompt,
      sourceDraftId: input.sourceDraftId,
      sendCount: 0,
      tags: input.tags || [],
    };
    
    return { success: true, template };
  } catch (error: any) {
    console.error('Error creating saved email template:', error);
    return { success: false, error: error.message || 'Failed to create template' };
  }
}

export async function updateSavedEmailTemplate(
  companyId: string,
  input: UpdateSavedEmailTemplateInput
): Promise<{ success: true } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templateRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates').doc(input.id);
    
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.htmlContent !== undefined) updateData.htmlContent = input.htmlContent;
    if (input.previewText !== undefined) updateData.previewText = input.previewText;
    if (input.tags !== undefined) updateData.tags = input.tags;

    await templateRef.update(updateData);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating saved email template:', error);
    return { success: false, error: error.message || 'Failed to update template' };
  }
}

export async function getSavedEmailTemplate(
  companyId: string,
  templateId: string
): Promise<{ success: true; template: SavedEmailTemplate } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templateRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates').doc(templateId);
    const templateSnap = await templateRef.get();
    
    if (!templateSnap.exists) {
      return { success: false, error: 'Template not found' };
    }

    const data = templateSnap.data()!;
    const template: SavedEmailTemplate = {
      id: templateSnap.id,
      companyId: data.companyId,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      name: data.name,
      description: data.description,
      subject: data.subject,
      htmlContent: data.htmlContent,
      previewText: data.previewText,
      originalPrompt: data.originalPrompt,
      sourceDraftId: data.sourceDraftId,
      lastSentAt: data.lastSentAt?.toDate?.()?.toISOString(),
      sendCount: data.sendCount || 0,
      tags: data.tags || [],
    };
    
    return { success: true, template };
  } catch (error: any) {
    console.error('Error getting saved email template:', error);
    return { success: false, error: error.message || 'Failed to get template' };
  }
}

export async function getSavedEmailTemplates(
  companyId: string
): Promise<{ success: true; templates: SavedEmailTemplate[] } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templatesRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates');
    const querySnapshot = await templatesRef.orderBy('updatedAt', 'desc').get();
    
    const templates: SavedEmailTemplate[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        companyId: data.companyId,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        name: data.name,
        description: data.description,
        subject: data.subject,
        htmlContent: data.htmlContent,
        previewText: data.previewText,
        originalPrompt: data.originalPrompt,
        sourceDraftId: data.sourceDraftId,
        lastSentAt: data.lastSentAt?.toDate?.()?.toISOString(),
        sendCount: data.sendCount || 0,
        tags: data.tags || [],
      };
    });
    
    return { success: true, templates };
  } catch (error: any) {
    console.error('Error getting saved email templates:', error);
    return { success: false, error: error.message || 'Failed to get templates' };
  }
}

export async function deleteSavedEmailTemplate(
  companyId: string,
  templateId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templateRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates').doc(templateId);
    await templateRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting saved email template:', error);
    return { success: false, error: error.message || 'Failed to delete template' };
  }
}

export async function incrementTemplateSendCount(
  companyId: string,
  templateId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const templateRef = adminDb.collection('companies').doc(companyId).collection('savedEmailTemplates').doc(templateId);
    await templateRef.update({
      sendCount: FieldValue.increment(1),
      lastSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error incrementing template send count:', error);
    return { success: false, error: error.message || 'Failed to update template' };
  }
}
