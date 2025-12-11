'use client';

import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import type { 
  UnifiedCampaignDraft, 
  CreateAICampaignDraftInput,
  UpdateAICampaignDraftInput 
} from '@/types/ai-campaigns';

export async function createAICampaignDraft(
  input: CreateAICampaignDraftInput
): Promise<UnifiedCampaignDraft | null> {
  if (!db) {
    console.error('Firebase not initialized');
    return null;
  }

  try {
    const draftsRef = collection(db, 'companies', input.companyId, 'aiCampaignDrafts');
    
    const draftData = {
      companyId: input.companyId,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      originalPrompt: input.originalPrompt,
      parsedBrief: input.parsedBrief || null,
      emailContent: input.emailContent || null,
      smsContent: input.smsContent || null,
      whatsappContent: input.whatsappContent || null,
      selectedChannels: input.selectedChannels || [],
      emailConfig: null,
      smsConfig: null,
      whatsappConfig: null,
      scheduledFor: null,
      status: 'draft' as const,
      publishedCampaignIds: null,
      aiCreditsConsumed: 0,
      generationDurationMs: 0,
    };

    const docRef = await addDoc(draftsRef, draftData);
    
    const draft: UnifiedCampaignDraft = {
      id: docRef.id,
      companyId: input.companyId,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalPrompt: input.originalPrompt,
      selectedChannels: input.selectedChannels || [],
      status: 'draft',
      aiCreditsConsumed: 0,
      generationDurationMs: 0,
    };
    
    if (input.parsedBrief) draft.parsedBrief = input.parsedBrief;
    if (input.emailContent) draft.emailContent = input.emailContent;
    if (input.smsContent) draft.smsContent = input.smsContent;
    if (input.whatsappContent) draft.whatsappContent = input.whatsappContent;
    
    return draft;
  } catch (error: any) {
    console.error('Error creating AI campaign draft:', error);
    return null;
  }
}

export async function updateAICampaignDraft(
  input: UpdateAICampaignDraftInput
): Promise<boolean> {
  if (!db) {
    console.error('Firebase not initialized');
    return false;
  }

  try {
    const draftRef = doc(db, 'companies', input.companyId, 'aiCampaignDrafts', input.id);
    
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (input.parsedBrief !== undefined) updateData.parsedBrief = input.parsedBrief;
    if (input.emailContent !== undefined) updateData.emailContent = input.emailContent;
    if (input.smsContent !== undefined) updateData.smsContent = input.smsContent;
    if (input.whatsappContent !== undefined) updateData.whatsappContent = input.whatsappContent;
    if (input.selectedChannels !== undefined) updateData.selectedChannels = input.selectedChannels;
    if (input.emailConfig !== undefined) updateData.emailConfig = input.emailConfig;
    if (input.smsConfig !== undefined) updateData.smsConfig = input.smsConfig;
    if (input.whatsappConfig !== undefined) updateData.whatsappConfig = input.whatsappConfig;
    if (input.scheduledFor !== undefined) updateData.scheduledFor = input.scheduledFor;
    if (input.status !== undefined) updateData.status = input.status;

    await updateDoc(draftRef, updateData);
    return true;
  } catch (error: any) {
    console.error('Error updating AI campaign draft:', error);
    return false;
  }
}

export async function getAICampaignDraft(
  companyId: string,
  draftId: string
): Promise<UnifiedCampaignDraft | null> {
  if (!db) {
    console.error('Firebase not initialized');
    return null;
  }

  try {
    const draftRef = doc(db, 'companies', companyId, 'aiCampaignDrafts', draftId);
    const draftSnap = await getDoc(draftRef);
    
    if (!draftSnap.exists()) {
      return null;
    }

    const data = draftSnap.data();
    return {
      id: draftSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      scheduledFor: data.scheduledFor?.toDate?.()?.toISOString() || null,
    } as UnifiedCampaignDraft;
  } catch (error: any) {
    console.error('Error getting AI campaign draft:', error);
    return null;
  }
}

export async function getAICampaignDrafts(
  companyId: string
): Promise<UnifiedCampaignDraft[]> {
  if (!db) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    const draftsRef = collection(db, 'companies', companyId, 'aiCampaignDrafts');
    const q = query(draftsRef);
    
    const querySnapshot = await getDocs(q);
    
    const drafts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        scheduledFor: data.scheduledFor?.toDate?.()?.toISOString() || null,
      } as UnifiedCampaignDraft;
    });
    
    // Sort client-side temporarily until Firestore indexes are deployed
    return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error: any) {
    console.error('Error getting AI campaign drafts:', error);
    return [];
  }
}

export async function deleteAICampaignDraft(
  companyId: string,
  draftId: string
): Promise<boolean> {
  if (!db) {
    console.error('Firebase not initialized');
    return false;
  }

  try {
    const draftRef = doc(db, 'companies', companyId, 'aiCampaignDrafts', draftId);
    await deleteDoc(draftRef);
    return true;
  } catch (error: any) {
    console.error('Error deleting AI campaign draft:', error);
    return false;
  }
}
