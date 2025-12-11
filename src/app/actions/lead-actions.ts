'use server';

import { revalidatePath } from 'next/cache';
import { addServerLead, updateServerLead, deleteServerLead, getServerLeads } from '@/lib/leads-data-server';
import type { Lead } from '@/lib/mock-data';
import { adminDb, getUserFromServerSession } from '@/lib/firebase-admin';
import { canAddContacts, getContactUpgradeSuggestion } from '@/lib/plan-helpers';
import { logBulkAssignment } from '@/lib/activity-logger';
import { getPaginatedLeadsForCompany, type PaginatedLeadsResult } from '@/lib/crm/lead-data';

export async function createLeadAction(
  companyId: string, 
  leadData: Omit<Lead, 'id' | 'createdAt' | 'lastContacted' | 'brevoSyncStatus' | 'hubspotSyncStatus' | 'brevoContactId' | 'hubspotContactId' | 'brevoErrorMessage' | 'hubspotErrorMessage' | 'companyId'>
) {
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  // Check contact limits before creating using getPlanMetadata helper
  const { getPlanMetadata } = await import('@/lib/plan-helpers-server');
  const planMetadata = await getPlanMetadata(companyId);
  
  if (!planMetadata) {
    throw new Error('Company not found or plan configuration error');
  }

  // Get current contact count
  const currentContacts = await getServerLeads(companyId);
  const currentContactCount = currentContacts.length;
  const maxContacts = planMetadata.maxContacts;

  // Check if user can add more contacts
  const { canAdd } = canAddContacts(currentContactCount, maxContacts, 1);

  if (!canAdd) {
    const upgrade = getContactUpgradeSuggestion(planMetadata.planId);
    throw new Error(
      `Contact limit reached! You have ${currentContactCount} contacts. Upgrade to ${upgrade.suggestedPlan} ($${upgrade.price}/month) for unlimited contacts.`
    );
  }

  const result = await addServerLead(companyId, leadData);
  
  revalidatePath('/crm');
  revalidatePath('/crm/leads');
  revalidatePath('/crm/pipeline');
  revalidatePath('/crm/dashboard');
  
  return result;
}

export async function updateLeadAction(leadData: Partial<Lead> & { id: string }) {
  await updateServerLead(leadData);
  
  revalidatePath('/crm');
  revalidatePath('/crm/leads');
  revalidatePath('/crm/pipeline');
  revalidatePath('/crm/dashboard');
}

export async function deleteLeadAction(leadId: string) {
  await deleteServerLead(leadId);
  
  revalidatePath('/crm');
  revalidatePath('/crm/leads');
  revalidatePath('/crm/pipeline');
  revalidatePath('/crm/dashboard');
}

export async function bulkDeleteLeadsAction(leadIds: string[]) {
  try {
    if (!leadIds || leadIds.length === 0) {
      throw new Error('No leads selected for deletion');
    }

    const deletePromises = leadIds.map(leadId => deleteServerLead(leadId));
    await Promise.all(deletePromises);
    
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    
    return { success: true, deletedCount: leadIds.length };
  } catch (error: any) {
    console.error('Error in bulkDeleteLeadsAction:', error);
    throw new Error(error?.message || 'Failed to delete selected contacts');
  }
}

export async function deleteAllLeadsAction(companyId: string) {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { getServerLeads } = await import('@/lib/leads-data-server');
    const allLeads = await getServerLeads(companyId);
    
    if (allLeads.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const deletePromises = allLeads.map(lead => deleteServerLead(lead.id));
    await Promise.all(deletePromises);
    
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    
    return { success: true, deletedCount: allLeads.length };
  } catch (error: any) {
    console.error('Error in deleteAllLeadsAction:', error);
    throw new Error(error?.message || 'Failed to delete all contacts');
  }
}

export async function loadMoreLeadsAction(
  companyId: string,
  offset: number,
  limit: number,
  userRole: 'superadmin' | 'admin' | 'manager' | 'user',
  userId: string
): Promise<PaginatedLeadsResult> {
  try {
    return await getPaginatedLeadsForCompany(companyId, {
      currentUserId: userId,
      currentUserRole: userRole,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error loading more leads:', error);
    return { leads: [], total: 0, hasMore: false };
  }
}

/**
 * Bulk assign leads to a team member
 * SECURITY: Only managers and admins can assign leads
 */
export async function bulkAssignLeadsAction(leadIds: string[], assignToUserId: string) {
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  if (!leadIds || leadIds.length === 0) {
    throw new Error('No leads selected for assignment');
  }

  if (!assignToUserId) {
    throw new Error('No team member selected');
  }

  // SECURITY: Verify current user is authenticated and has manager/admin permissions
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    throw new Error('Unauthorized: Please log in to perform this action');
  }

  const { uid, role, companyId } = currentUser.user;
  
  // Only managers, admins, and superadmins can assign leads
  if (!role || !['manager', 'admin', 'superadmin'].includes(role)) {
    throw new Error('Unauthorized: Only managers and admins can assign leads to team members');
  }

  if (!companyId) {
    throw new Error('Unauthorized: Company context missing');
  }

  try {
    // SECURITY: Verify assignee belongs to the same company
    const assigneeDoc = await adminDb.collection('users').doc(assignToUserId).get();
    if (!assigneeDoc.exists) {
      throw new Error('Selected team member not found');
    }
    const assigneeData = assigneeDoc.data();
    if (assigneeData?.companyId !== companyId) {
      throw new Error('Unauthorized: Cannot assign leads to users outside your company');
    }

    // SECURITY: Verify all leads belong to the same company
    const firstLeadDoc = await adminDb.collection('leads').doc(leadIds[0]).get();
    if (!firstLeadDoc.exists) {
      throw new Error('Lead not found');
    }
    const leadCompanyId = firstLeadDoc.data()?.companyId;
    if (leadCompanyId !== companyId) {
      throw new Error('Unauthorized: Cannot assign leads from another company');
    }

    const batch = adminDb.batch();
    
    for (const leadId of leadIds) {
      const leadRef = adminDb.collection('leads').doc(leadId);
      batch.update(leadRef, { 
        assignedTo: assignToUserId,
        updatedAt: new Date().toISOString(),
      });
    }
    
    await batch.commit();
    
    // Log activity for bulk assignment (reuse already-fetched data)
    const assigneeName = assigneeData?.displayName || assigneeData?.name || assigneeData?.email || 'Unknown';
    await logBulkAssignment(
      companyId,
      leadIds,
      assignToUserId,
      assigneeName,
      uid,
      currentUser.user.email
    );
    
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    
    return { success: true, assignedCount: leadIds.length };
  } catch (error: any) {
    console.error('Error in bulkAssignLeadsAction:', error);
    throw new Error(error?.message || 'Failed to assign leads');
  }
}

export async function validateBulkImportAction(
  companyId: string,
  contactsToImport: number
): Promise<{
  success: boolean;
  canImport: boolean;
  currentCount: number;
  maxContacts: number | null;
  availableSlots: number | null;
  message?: string;
  suggestedPlan?: string;
}> {
  if (!adminDb) {
    return {
      success: false,
      canImport: false,
      currentCount: 0,
      maxContacts: null,
      availableSlots: null,
      message: 'Database not initialized'
    };
  }

  try {
    // Get company and plan
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return {
        success: false,
        canImport: false,
        currentCount: 0,
        maxContacts: null,
        availableSlots: null,
        message: 'Company not found'
      };
    }

    const company = companyDoc.data();
    const planId = company?.planId;

    // Get current contact count
    const currentContacts = await getServerLeads(companyId);
    const currentContactCount = currentContacts.length;

    if (!planId) {
      // No plan set, allow import (shouldn't happen but fail-safe)
      return {
        success: true,
        canImport: true,
        currentCount: currentContactCount,
        maxContacts: null,
        availableSlots: null
      };
    }

    const planDoc = await adminDb.collection('plans').doc(planId).get();
    if (!planDoc.exists) {
      return {
        success: true,
        canImport: true,
        currentCount: currentContactCount,
        maxContacts: null,
        availableSlots: null
      };
    }

    const plan = planDoc.data();
    if (!plan) {
      return {
        success: false,
        canImport: false,
        currentCount: currentContactCount,
        maxContacts: null,
        availableSlots: null,
        message: 'Plan configuration error'
      };
    }

    const maxContacts = plan.maxContacts ?? null;

    // Check if user can add contacts
    const { canAdd, availableSlots, wouldExceedBy } = canAddContacts(
      currentContactCount,
      maxContacts,
      contactsToImport
    );

    if (!canAdd) {
      const upgrade = getContactUpgradeSuggestion(planId);
      return {
        success: true,
        canImport: false,
        currentCount: currentContactCount,
        maxContacts,
        availableSlots,
        message: `Cannot import ${contactsToImport} contacts. You have ${currentContactCount}/${maxContacts} contacts used. Maximum you can import: ${availableSlots}. Upgrade to ${upgrade.suggestedPlan} for unlimited contacts.`,
        suggestedPlan: upgrade.suggestedPlan
      };
    }

    return {
      success: true,
      canImport: true,
      currentCount: currentContactCount,
      maxContacts,
      availableSlots,
      message: `Ready to import ${contactsToImport} contacts. You'll have ${currentContactCount + contactsToImport} total contacts.`
    };
  } catch (error: any) {
    console.error('Error in validateBulkImportAction:', error);
    return {
      success: false,
      canImport: false,
      currentCount: 0,
      maxContacts: null,
      availableSlots: null,
      message: error?.message || 'Failed to validate import'
    };
  }
}
