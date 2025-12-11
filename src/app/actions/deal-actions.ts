'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Deal, DealStatus, DealStats } from '@/types/crm';
import { createActivity } from './activity-actions';
import { DEFAULT_PROBABILITIES } from '@/types/crm';
import { updateServerLead } from '@/lib/leads-data-server';
import { revalidatePath } from 'next/cache';

function serializeTimestamp(value: any): string | undefined {
  if (!value) return undefined;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function serializeDeal(docId: string, data: any): Deal {
  return {
    id: docId,
    companyId: data.companyId,
    contactId: data.contactId,
    name: data.name,
    amount: data.amount,
    currency: data.currency,
    probability: data.probability,
    status: data.status,
    expectedCloseDate: data.expectedCloseDate ? serializeTimestamp(data.expectedCloseDate) : undefined,
    actualCloseDate: data.actualCloseDate ? serializeTimestamp(data.actualCloseDate) : undefined,
    contactName: data.contactName,
    pipelineId: data.pipelineId,
    notes: data.notes,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
    updatedAt: serializeTimestamp(data.updatedAt) || new Date().toISOString(),
  };
}

export async function getDealsForCompany(
  companyId: string,
  status?: DealStatus
): Promise<Deal[]> {
  if (!serverDb || !companyId) {
    return [];
  }

  try {
    const dealsRef = collection(serverDb, 'deals');
    
    try {
      let q;
      if (status) {
        q = query(
          dealsRef,
          where('companyId', '==', companyId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          dealsRef,
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => serializeDeal(doc.id, doc.data()));
    } catch (indexError: any) {
      // Fallback: missing index - fetch and filter/sort in memory
      if (indexError.code === 'failed-precondition') {
        const q = query(dealsRef, where('companyId', '==', companyId));
        const snapshot = await getDocs(q);
        let deals = snapshot.docs.map(doc => serializeDeal(doc.id, doc.data()));
        
        if (status) {
          deals = deals.filter(d => d.status === status);
        }
        
        return deals.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

export async function getDealsForContact(
  companyId: string,
  contactId: string
): Promise<Deal[]> {
  if (!serverDb || !companyId || !contactId) {
    return [];
  }

  try {
    const dealsRef = collection(serverDb, 'deals');
    try {
      const q = query(
        dealsRef,
        where('companyId', '==', companyId),
        where('contactId', '==', contactId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => serializeDeal(doc.id, doc.data()));
    } catch (indexError: any) {
      if (indexError.code === 'failed-precondition') {
        const q = query(
          dealsRef,
          where('companyId', '==', companyId),
          where('contactId', '==', contactId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => serializeDeal(doc.id, doc.data()))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error fetching deals for contact:', error);
    return [];
  }
}

export async function getDealById(dealId: string): Promise<Deal | null> {
  if (!serverDb || !dealId) {
    return null;
  }

  try {
    const dealRef = doc(serverDb, 'deals', dealId);
    const dealDoc = await getDoc(dealRef);
    
    if (!dealDoc.exists()) {
      return null;
    }

    return serializeDeal(dealDoc.id, dealDoc.data());
  } catch (error) {
    console.error('Error fetching deal:', error);
    return null;
  }
}

export async function createDeal(
  deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const dealsRef = collection(serverDb, 'deals');
    const now = Timestamp.now();
    
    const probability = deal.probability ?? DEFAULT_PROBABILITIES[deal.status];
    
    const docRef = await addDoc(dealsRef, {
      ...deal,
      probability,
      createdAt: now,
      updatedAt: now,
    });

    await createActivity({
      companyId: deal.companyId,
      contactId: deal.contactId,
      type: 'deal_created',
      content: `Deal "${deal.name}" created with value ${deal.currency} ${deal.amount.toLocaleString()}`,
      author: deal.createdBy,
      authorName: deal.createdByName || 'Unknown',
      occurredAt: new Date().toISOString(),
      metadata: {
        dealId: docRef.id,
      },
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating deal:', error);
    return { success: false, error: 'Failed to create deal' };
  }
}

export async function updateDeal(
  dealId: string,
  updates: Partial<Omit<Deal, 'id' | 'companyId' | 'createdAt' | 'createdBy'>>,
  userId: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const dealRef = doc(serverDb, 'deals', dealId);
    const existingDeal = await getDoc(dealRef);
    
    if (!existingDeal.exists()) {
      return { success: false, error: 'Deal not found' };
    }

    const oldDeal = existingDeal.data() as Deal;
    
    if (updates.status && updates.status !== oldDeal.status) {
      updates.probability = updates.probability ?? DEFAULT_PROBABILITIES[updates.status];
      
      if (updates.status === 'won' || updates.status === 'lost') {
        updates.actualCloseDate = new Date().toISOString();
      }
    }
    
    await updateDoc(dealRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });

    const changes: string[] = [];
    if (updates.status && updates.status !== oldDeal.status) {
      changes.push(`status changed from "${oldDeal.status}" to "${updates.status}"`);
      
      if (updates.status === 'won' && oldDeal.contactId) {
        try {
          await updateServerLead({ id: oldDeal.contactId, status: 'Won' }, false);
          changes.push('contact status updated to Won');
          
          revalidatePath('/crm');
          revalidatePath('/crm/leads');
          revalidatePath('/crm/pipeline');
          revalidatePath('/crm/dashboard');
        } catch (syncError) {
          console.error('Error syncing contact status to Won:', syncError);
        }
      }
      
      if (updates.status === 'lost' && oldDeal.contactId) {
        try {
          await updateServerLead({ id: oldDeal.contactId, status: 'Lost' }, false);
          changes.push('contact status updated to Lost');
          
          revalidatePath('/crm');
          revalidatePath('/crm/leads');
          revalidatePath('/crm/pipeline');
          revalidatePath('/crm/dashboard');
        } catch (syncError) {
          console.error('Error syncing contact status to Lost:', syncError);
        }
      }
    }
    if (updates.amount && updates.amount !== oldDeal.amount) {
      changes.push(`amount changed from ${oldDeal.currency} ${oldDeal.amount.toLocaleString()} to ${updates.currency || oldDeal.currency} ${updates.amount.toLocaleString()}`);
    }
    
    if (changes.length > 0) {
      await createActivity({
        companyId: oldDeal.companyId,
        contactId: oldDeal.contactId,
        type: 'deal_updated',
        content: `Deal "${oldDeal.name}" updated: ${changes.join(', ')}`,
        author: userId,
        authorName: userName,
        occurredAt: new Date().toISOString(),
        metadata: {
          dealId,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating deal:', error);
    return { success: false, error: 'Failed to update deal' };
  }
}

export async function deleteDeal(
  dealId: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const dealRef = doc(serverDb, 'deals', dealId);
    await deleteDoc(dealRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting deal:', error);
    return { success: false, error: 'Failed to delete deal' };
  }
}

export async function getDealStats(companyId: string): Promise<DealStats> {
  const deals = await getDealsForCompany(companyId);
  
  const openDeals = deals.filter(d => !['won', 'lost'].includes(d.status));
  const wonDeals = deals.filter(d => d.status === 'won');
  const lostDeals = deals.filter(d => d.status === 'lost');
  
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
  
  const closedDeals = wonDeals.length + lostDeals.length;
  const conversionRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;
  
  const avgDealSize = deals.length > 0 
    ? deals.reduce((sum, d) => sum + d.amount, 0) / deals.length 
    : 0;
    
  const avgProbability = openDeals.length > 0
    ? openDeals.reduce((sum, d) => sum + d.probability, 0) / openDeals.length
    : 0;

  return {
    totalDeals: deals.length,
    openDeals: openDeals.length,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    totalPipelineValue,
    wonValue,
    avgDealSize,
    avgProbability,
    conversionRate,
  };
}

export async function getWeightedPipelineValue(companyId: string): Promise<number> {
  const deals = await getDealsForCompany(companyId);
  const openDeals = deals.filter(d => !['won', 'lost'].includes(d.status));
  
  return openDeals.reduce((sum, deal) => {
    return sum + (deal.amount * (deal.probability / 100));
  }, 0);
}
