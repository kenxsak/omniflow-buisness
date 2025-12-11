'use server';

import { serverDb as db } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { Company } from '@/types/saas';

export type ChecklistItem = 
  | 'addedContacts'
  | 'sentFirstCampaign'
  | 'createdDigitalCard'
  | 'invitedTeamMember'
  | 'triedAI'
  | 'setupAutomation'
  | 'launchedMultiChannel';

export interface OnboardingProgress {
  completed: boolean;
  completedAt?: string;
  skippedAt?: string;
  checklist: {
    addedContacts: boolean;
    sentFirstCampaign: boolean;
    createdDigitalCard: boolean;
    invitedTeamMember: boolean;
    triedAI: boolean;
    setupAutomation: boolean;
    launchedMultiChannel: boolean;
  };
  checklistCompletedAt?: {
    addedContacts?: string;
    sentFirstCampaign?: string;
    createdDigitalCard?: string;
    invitedTeamMember?: string;
    triedAI?: string;
    setupAutomation?: string;
    launchedMultiChannel?: string;
  };
}

export async function getOnboardingProgress(companyId: string): Promise<OnboardingProgress | null> {
  if (!db || !companyId) return null;
  
  try {
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return null;
    }
    
    const companyData = companySnap.data() as Company;
    return companyData.onboardingProgress || null;
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return null;
  }
}

export async function updateChecklistItem(
  companyId: string,
  item: ChecklistItem,
  completed: boolean = true
): Promise<{ success: boolean; message: string }> {
  if (!db || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  try {
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return { success: false, message: 'Company not found' };
    }
    
    const currentData = companySnap.data() as Company;
    const currentProgress = currentData.onboardingProgress || {
      completed: false,
      checklist: {
        addedContacts: false,
        sentFirstCampaign: false,
        createdDigitalCard: false,
        invitedTeamMember: false,
        triedAI: false,
        setupAutomation: false,
        launchedMultiChannel: false,
      },
      checklistCompletedAt: {},
    };
    
    const updatedChecklist = {
      ...currentProgress.checklist,
      [item]: completed,
    };
    
    const allComplete = Object.values(updatedChecklist).every(val => val === true);
    
    const updates: any = {
      'onboardingProgress.checklist': updatedChecklist,
    };
    
    if (completed) {
      updates[`onboardingProgress.checklistCompletedAt.${item}`] = new Date().toISOString();
    } else {
      updates[`onboardingProgress.checklistCompletedAt.${item}`] = deleteField();
    }
    
    if (allComplete && !currentProgress.completed) {
      updates['onboardingProgress.completed'] = true;
      updates['onboardingProgress.completedAt'] = new Date().toISOString();
    }
    
    await updateDoc(companyRef, updates);
    
    return { success: true, message: `Checklist item ${item} updated` };
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return { success: false, message: 'Failed to update checklist item' };
  }
}

export async function skipOnboarding(companyId: string): Promise<{ success: boolean; message: string }> {
  if (!db || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  try {
    const companyRef = doc(db, 'companies', companyId);
    
    await updateDoc(companyRef, {
      'onboardingProgress.completed': true,
      'onboardingProgress.skippedAt': new Date().toISOString(),
    });
    
    return { success: true, message: 'Onboarding skipped' };
  } catch (error) {
    console.error('Error skipping onboarding:', error);
    return { success: false, message: 'Failed to skip onboarding' };
  }
}

export async function completeOnboarding(companyId: string): Promise<{ success: boolean; message: string }> {
  if (!db || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  try {
    const companyRef = doc(db, 'companies', companyId);
    
    await updateDoc(companyRef, {
      'onboardingProgress.completed': true,
      'onboardingProgress.completedAt': new Date().toISOString(),
    });
    
    return { success: true, message: 'Onboarding completed' };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return { success: false, message: 'Failed to complete onboarding' };
  }
}

export async function initializeOnboardingProgress(companyId: string): Promise<{ success: boolean; message: string }> {
  if (!db || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  try {
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return { success: false, message: 'Company not found' };
    }
    
    const currentData = companySnap.data() as Company;
    
    if (currentData.onboardingProgress?.checklist) {
      return { success: true, message: 'Onboarding already initialized' };
    }
    
    await updateDoc(companyRef, {
      'onboardingProgress': {
        completed: false,
        checklist: {
          addedContacts: false,
          sentFirstCampaign: false,
          createdDigitalCard: false,
          invitedTeamMember: false,
          triedAI: false,
          setupAutomation: false,
          launchedMultiChannel: false,
        },
        checklistCompletedAt: {},
      },
    });
    
    return { success: true, message: 'Onboarding progress initialized' };
  } catch (error) {
    console.error('Error initializing onboarding progress:', error);
    return { success: false, message: 'Failed to initialize onboarding progress' };
  }
}
