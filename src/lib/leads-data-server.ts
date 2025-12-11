/**
 * Server-side Leads Data Access
 * 
 * Server-compatible functions for fetching and updating leads data from Firestore.
 * These functions use the Firebase Admin SDK and can be called from server actions.
 */

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import type { Lead, EmailCampaign } from '@/lib/mock-data';

/**
 * Safely serialize a Firestore timestamp to ISO string
 * Handles both Admin SDK timestamps (with toDate method) and plain objects with _seconds/_nanoseconds
 */
function serializeTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return null;
}

/**
 * Get leads for a company (server-side version using Admin SDK)
 * Uses server-side filtering for role-based access and efficiency.
 * For sales reps: Only returns leads assigned to them
 * For managers/admins: Returns all company leads
 * 
 * @param companyId The company ID to fetch leads for
 * @param options Optional pagination, limit, and filtering options
 * @param assignedToUserId Optional - if provided, filters to leads assigned to this user
 * @returns Array of leads
 */
export async function getServerLeads(
  companyId: string,
  options?: { limit?: number; startAfter?: string; assignedToUserId?: string }
): Promise<Lead[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    let queryRef: any = adminDb
      .collection('leads')
      .where('companyId', '==', companyId);
    
    // TEAM COLLABORATION: If specific user requested, filter by assignedTo (for sales reps)
    if (options?.assignedToUserId) {
      queryRef = queryRef.where('assignedTo', '==', options.assignedToUserId);
    }
    
    if (options?.limit) {
      queryRef = queryRef.limit(options.limit);
    }
    
    const snapshot = await queryRef.get();
    
    const leads: Lead[] = [];
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      
      leads.push({
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
        lastContacted: serializeTimestamp(data.lastContacted),
      } as Lead);
    });
    
    // Sort client-side temporarily until Firestore indexes are deployed
    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error: any) {
    console.error('Error fetching server leads:', error);
    return [];
  }
}

/**
 * Get leads count for a company (for pagination metadata)
 */
export async function getServerLeadsCount(
  companyId: string,
  options?: { assignedToUserId?: string }
): Promise<number> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return 0;
  }

  try {
    let queryRef: any = adminDb
      .collection('leads')
      .where('companyId', '==', companyId);
    
    if (options?.assignedToUserId) {
      queryRef = queryRef.where('assignedTo', '==', options.assignedToUserId);
    }
    
    const snapshot = await queryRef.count().get();
    return snapshot.data().count;
  } catch (error: any) {
    console.error('Error counting server leads:', error);
    return 0;
  }
}

/**
 * Get paginated leads for a company with true server-side pagination
 * Uses Firestore limit() for memory efficiency
 */
export async function getServerLeadsPaginated(
  companyId: string,
  options: { 
    limit: number; 
    offset: number;
    assignedToUserId?: string;
  }
): Promise<{ leads: Lead[]; total: number }> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return { leads: [], total: 0 };
  }

  try {
    let baseQuery: any = adminDb
      .collection('leads')
      .where('companyId', '==', companyId);
    
    if (options.assignedToUserId) {
      baseQuery = baseQuery.where('assignedTo', '==', options.assignedToUserId);
    }
    
    // Get total count first
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;
    
    // For offset pagination, we need to skip documents
    // This is not ideal for large datasets but works for MVP
    // Future: implement cursor-based pagination with lastDocId
    let paginatedQuery = baseQuery;
    
    if (options.offset > 0) {
      // Fetch all up to offset + limit and then slice
      // This is a limitation of Firestore's offset behavior
      const allSnapshot = await baseQuery.limit(options.offset + options.limit).get();
      const allLeads: Lead[] = [];
      
      allSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        allLeads.push({
          id: doc.id,
          ...data,
          createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
          lastContacted: serializeTimestamp(data.lastContacted),
        } as Lead);
      });
      
      // Sort and slice for pagination
      const sorted = allLeads.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return {
        leads: sorted.slice(options.offset, options.offset + options.limit),
        total
      };
    }
    
    // First page - just limit
    paginatedQuery = paginatedQuery.limit(options.limit);
    const snapshot = await paginatedQuery.get();
    
    const leads: Lead[] = [];
    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      leads.push({
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
        lastContacted: serializeTimestamp(data.lastContacted),
      } as Lead);
    });
    
    // Sort for consistency
    const sortedLeads = leads.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return { leads: sortedLeads, total };
  } catch (error: any) {
    console.error('Error fetching paginated server leads:', error);
    return { leads: [], total: 0 };
  }
}

/**
 * Add a new lead (server-side version using Admin SDK)
 * 
 * @param companyId The company ID
 * @param leadData The lead data (without id, createdAt, lastContacted, companyId)
 * @returns The created lead with id
 */
export async function addServerLead(
  companyId: string, 
  leadData: Omit<Lead, 'id' | 'createdAt' | 'lastContacted' | 'companyId'>
): Promise<Lead> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const leadWithTimestamps = {
      ...leadData,
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastContacted: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await adminDb.collection('leads').add(leadWithTimestamps);
    
    // Get the document to return it with resolved timestamps
    const docSnap = await docRef.get();
    const data = docSnap.data() || {};
    
    return {
      id: docRef.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
      lastContacted: serializeTimestamp(data.lastContacted),
    } as Lead;
  } catch (error: any) {
    console.error('Error adding server lead:', error);
    throw error;
  }
}

/**
 * Update a lead (server-side version using Admin SDK)
 * 
 * @param leadData The lead data to update (must include id)
 * @param touchLastContacted Whether to update lastContacted timestamp (default: true)
 */
export async function updateServerLead(
  leadData: Partial<Lead> & { id: string }, 
  touchLastContacted: boolean = true
): Promise<void> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return;
  }

  try {
    const { id, ...dataToUpdate } = leadData;
    
    const updatePayload: any = { ...dataToUpdate };
    
    // Update lastContacted by default (matching original behavior)
    if (touchLastContacted) {
      updatePayload.lastContacted = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await adminDb.collection('leads').doc(id).update(updatePayload);
  } catch (error: any) {
    console.error('Error updating server lead:', error);
    throw error;
  }
}

/**
 * Delete a lead (server-side version using Admin SDK)
 * 
 * @param leadId The lead ID to delete
 */
export async function deleteServerLead(leadId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    await adminDb.collection('leads').doc(leadId).delete();
  } catch (error: any) {
    console.error('Error deleting server lead:', error);
    throw error;
  }
}

/**
 * Get all email campaigns for a company (server-side version using Admin SDK)
 * 
 * @param companyId The company ID to fetch campaigns for
 * @returns Array of email campaigns
 */
export async function getServerEmailCampaigns(companyId: string): Promise<EmailCampaign[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    const snapshot = await adminDb
      .collection('email_campaigns')
      .where('companyId', '==', companyId)
      .get();
    
    const campaigns: EmailCampaign[] = [];
    snapshot.forEach((doc) => {
      campaigns.push({
        id: doc.id,
        ...doc.data(),
      } as EmailCampaign);
    });
    
    // Sort client-side temporarily until Firestore indexes are deployed
    return campaigns.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error('Error fetching server email campaigns:', error);
    return [];
  }
}
