'use server';

import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { 
  createServerAICampaignDraft,
  updateServerAICampaignDraft,
  getServerAICampaignDraft,
  getServerAICampaignDrafts,
  deleteServerAICampaignDraft
} from '@/lib/ai-campaign-drafts-data-server';
import type {
  UnifiedCampaignDraft,
  CreateAICampaignDraftInput,
  UpdateAICampaignDraftInput,
} from '@/types/ai-campaigns';

export async function createAICampaignDraftAction(input: {
  idToken: string;
  originalPrompt: string;
  parsedBrief?: CreateAICampaignDraftInput['parsedBrief'];
  emailContent?: CreateAICampaignDraftInput['emailContent'];
  smsContent?: CreateAICampaignDraftInput['smsContent'];
  whatsappContent?: CreateAICampaignDraftInput['whatsappContent'];
  selectedChannels?: CreateAICampaignDraftInput['selectedChannels'];
}): Promise<{
  success: boolean;
  draft?: UnifiedCampaignDraft;
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    const draft = await createServerAICampaignDraft({
      companyId: userData.companyId,
      createdBy: authResult.uid,
      originalPrompt: input.originalPrompt,
      parsedBrief: input.parsedBrief,
      emailContent: input.emailContent,
      smsContent: input.smsContent,
      whatsappContent: input.whatsappContent,
      selectedChannels: input.selectedChannels, // FIX Issue 2: Pass through selectedChannels
    });

    if (!draft) {
      return { success: false, error: 'Failed to create campaign draft' };
    }

    return { success: true, draft };
  } catch (error: any) {
    console.error('Error in createAICampaignDraftAction:', error);
    return { success: false, error: error.message || 'Failed to create draft' };
  }
}

export async function updateAICampaignDraftAction(input: {
  idToken: string;
  draftId: string;
  parsedBrief?: UpdateAICampaignDraftInput['parsedBrief'];
  emailContent?: UpdateAICampaignDraftInput['emailContent'];
  smsContent?: UpdateAICampaignDraftInput['smsContent'];
  whatsappContent?: UpdateAICampaignDraftInput['whatsappContent'];
  selectedChannels?: UpdateAICampaignDraftInput['selectedChannels'];
  emailConfig?: UpdateAICampaignDraftInput['emailConfig'];
  smsConfig?: UpdateAICampaignDraftInput['smsConfig'];
  whatsappConfig?: UpdateAICampaignDraftInput['whatsappConfig'];
  scheduledFor?: UpdateAICampaignDraftInput['scheduledFor'];
  status?: UpdateAICampaignDraftInput['status'];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    // Ensure backward compatibility by preserving legacy brevoListId field
    let emailConfigToSave = input.emailConfig;
    if (emailConfigToSave) {
      // Only update emailConfig if it has valid data
      if (!emailConfigToSave.listId) {
        // Don't overwrite emailConfig if listId is missing - preserve existing data
        emailConfigToSave = undefined;
      } else if (emailConfigToSave.provider === 'brevo') {
        // For Brevo, also preserve legacy field names
        emailConfigToSave = {
          ...emailConfigToSave,
          brevoListId: emailConfigToSave.listId, // Preserve legacy field for backward compat
          brevoListName: emailConfigToSave.listName, // Preserve legacy field for backward compat
        } as any;
      }
    }

    const result = await updateServerAICampaignDraft({
      id: input.draftId,
      companyId: userData.companyId,
      parsedBrief: input.parsedBrief,
      emailContent: input.emailContent,
      smsContent: input.smsContent,
      whatsappContent: input.whatsappContent,
      selectedChannels: input.selectedChannels,
      emailConfig: emailConfigToSave,
      smsConfig: input.smsConfig,
      whatsappConfig: input.whatsappConfig,
      scheduledFor: input.scheduledFor,
      status: input.status,
    });

    if (!result) {
      return { success: false, error: 'Failed to update campaign draft' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateAICampaignDraftAction:', error);
    return { success: false, error: error.message || 'Failed to update draft' };
  }
}

export async function getAICampaignDraftAction(input: {
  idToken: string;
  draftId: string;
}): Promise<{
  success: boolean;
  draft?: UnifiedCampaignDraft;
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    const draft = await getServerAICampaignDraft(userData.companyId, input.draftId);

    if (!draft) {
      return { success: false, error: 'Campaign draft not found' };
    }

    return { success: true, draft };
  } catch (error: any) {
    console.error('Error in getAICampaignDraftAction:', error);
    return { success: false, error: error.message || 'Failed to get draft' };
  }
}

export async function getAICampaignDraftsAction(input: {
  idToken: string;
}): Promise<{
  success: boolean;
  drafts?: UnifiedCampaignDraft[];
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    const drafts = await getServerAICampaignDrafts(userData.companyId);

    return { success: true, drafts };
  } catch (error: any) {
    console.error('Error in getAICampaignDraftsAction:', error);
    return { success: false, error: error.message || 'Failed to get drafts' };
  }
}

export async function deleteAICampaignDraftAction(input: {
  idToken: string;
  draftId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(input.idToken);
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
    if (!userData?.companyId) {
      return { success: false, error: 'User company not found' };
    }

    const result = await deleteServerAICampaignDraft(userData.companyId, input.draftId);

    if (!result) {
      return { success: false, error: 'Failed to delete campaign draft' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteAICampaignDraftAction:', error);
    return { success: false, error: error.message || 'Failed to delete draft' };
  }
}
