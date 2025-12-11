import 'server-only';
import { getServerLeads, getServerLeadsPaginated, getServerLeadsCount } from '@/lib/leads-data-server';
import type { Lead } from '@/lib/mock-data';
import { adminDb } from '@/lib/firebase-admin';

export interface LeadFilters {
  searchTerm?: string;
  filterByUserId?: string;
  status?: Lead['status'];
  source?: string;
  currentUserId?: string;
  currentUserRole?: 'superadmin' | 'admin' | 'manager' | 'user';
  limit?: number;
  offset?: number;
}

export interface PaginatedLeadsResult {
  leads: Lead[];
  total: number;
  hasMore: boolean;
}

const DEFAULT_LEADS_LIMIT = 500;

export async function getLeadsForCompany(
  companyId: string,
  filters?: LeadFilters
): Promise<Lead[]> {
  if (!companyId) {
    return [];
  }

  const shouldFilterByAssignment = filters?.currentUserRole === 'user' && filters?.currentUserId;
  
  // Use limit for memory efficiency (default 500, can be overridden via filters)
  let leads = await getServerLeads(companyId, {
    assignedToUserId: shouldFilterByAssignment ? filters.currentUserId : undefined,
    limit: filters?.limit || DEFAULT_LEADS_LIMIT,
  });

  if (filters?.status) {
    leads = leads.filter(lead => lead.status === filters.status);
  }

  if (filters?.source) {
    leads = leads.filter(lead => lead.source === filters.source);
  }

  if (filters?.filterByUserId && filters.filterByUserId !== 'all') {
    leads = leads.filter(lead => lead.assignedTo === filters.filterByUserId);
  }

  if (filters?.searchTerm) {
    const lowerCaseSearchTerm = filters.searchTerm.toLowerCase();
    leads = leads.filter(lead =>
      Object.values(lead).some(val =>
        String(val).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }

  return leads;
}

const DEFAULT_PAGE_LIMIT = 50;

export async function getPaginatedLeadsForCompany(
  companyId: string,
  filters?: LeadFilters
): Promise<PaginatedLeadsResult> {
  if (!companyId) {
    return { leads: [], total: 0, hasMore: false };
  }

  const limit = filters?.limit || DEFAULT_PAGE_LIMIT;
  const offset = filters?.offset || 0;
  
  const shouldFilterByAssignment = filters?.currentUserRole === 'user' && filters?.currentUserId;

  // Use true server-side pagination for memory efficiency
  const { leads: rawLeads, total } = await getServerLeadsPaginated(companyId, {
    limit,
    offset,
    assignedToUserId: shouldFilterByAssignment ? filters.currentUserId : undefined,
  });

  // Apply client-side filters for status/source (these could be moved to server for better perf)
  let leads = rawLeads;
  
  if (filters?.status) {
    leads = leads.filter(lead => lead.status === filters.status);
  }

  if (filters?.source) {
    leads = leads.filter(lead => lead.source === filters.source);
  }

  if (filters?.filterByUserId && filters.filterByUserId !== 'all') {
    leads = leads.filter(lead => lead.assignedTo === filters.filterByUserId);
  }

  const hasMore = offset + limit < total;

  return {
    leads,
    total,
    hasMore,
  };
}

export async function getLeadsCountForCompany(
  companyId: string,
  filters?: LeadFilters
): Promise<number> {
  if (!companyId) {
    return 0;
  }

  const shouldFilterByAssignment = filters?.currentUserRole === 'user' && filters?.currentUserId;
  
  return await getServerLeadsCount(companyId, {
    assignedToUserId: shouldFilterByAssignment ? filters.currentUserId : undefined,
  });
}

export interface LeadStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  syncedCount: number;
  brevoSyncedCount: number;
  hubspotSyncedCount: number;
  unsyncedCount: number;
}

const STATS_SAMPLE_LIMIT = 1000;

export async function getLeadStatsForCompany(companyId: string): Promise<LeadStats> {
  try {
    // Get total count efficiently without loading all documents
    const totalLeads = await getServerLeadsCount(companyId);
    
    // Get a sample of leads for status distribution (limit for memory efficiency)
    const sampleLeads = await getServerLeads(companyId, { limit: STATS_SAMPLE_LIMIT });
    const sampleSize = sampleLeads.length;
    
    // Calculate stats from sample
    const newLeadsSample = sampleLeads.filter(l => l.status === 'New').length;
    const contactedLeadsSample = sampleLeads.filter(l => l.status === 'Contacted').length;
    const qualifiedLeadsSample = sampleLeads.filter(l => l.status === 'Qualified').length;
    const wonLeadsSample = sampleLeads.filter(l => l.status === 'Won').length;
    const lostLeadsSample = sampleLeads.filter(l => l.status === 'Lost').length;
    const syncedSample = sampleLeads.filter(l => 
      l.brevoSyncStatus === 'synced' || l.hubspotSyncStatus === 'synced'
    ).length;
    const brevoSyncedSample = sampleLeads.filter(l => l.brevoSyncStatus === 'synced').length;
    const hubspotSyncedSample = sampleLeads.filter(l => l.hubspotSyncStatus === 'synced').length;
    const unsyncedSample = sampleLeads.filter(l => 
      l.brevoSyncStatus !== 'synced' && l.hubspotSyncStatus !== 'synced'
    ).length;
    
    // If sample size equals total, use exact numbers; otherwise scale proportionally
    const scaleFactor = sampleSize > 0 && totalLeads > sampleSize ? totalLeads / sampleSize : 1;
    
    return {
      totalLeads,
      newLeads: sampleSize >= totalLeads ? newLeadsSample : Math.round(newLeadsSample * scaleFactor),
      contactedLeads: sampleSize >= totalLeads ? contactedLeadsSample : Math.round(contactedLeadsSample * scaleFactor),
      qualifiedLeads: sampleSize >= totalLeads ? qualifiedLeadsSample : Math.round(qualifiedLeadsSample * scaleFactor),
      wonLeads: sampleSize >= totalLeads ? wonLeadsSample : Math.round(wonLeadsSample * scaleFactor),
      lostLeads: sampleSize >= totalLeads ? lostLeadsSample : Math.round(lostLeadsSample * scaleFactor),
      syncedCount: sampleSize >= totalLeads ? syncedSample : Math.round(syncedSample * scaleFactor),
      brevoSyncedCount: sampleSize >= totalLeads ? brevoSyncedSample : Math.round(brevoSyncedSample * scaleFactor),
      hubspotSyncedCount: sampleSize >= totalLeads ? hubspotSyncedSample : Math.round(hubspotSyncedSample * scaleFactor),
      unsyncedCount: sampleSize >= totalLeads ? unsyncedSample : Math.round(unsyncedSample * scaleFactor),
    };
  } catch (error) {
    console.error('Error calculating lead stats:', error);
    return {
      totalLeads: 0,
      newLeads: 0,
      contactedLeads: 0,
      qualifiedLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      syncedCount: 0,
      brevoSyncedCount: 0,
      hubspotSyncedCount: 0,
      unsyncedCount: 0,
    };
  }
}

export interface CompanyPlanData {
  planName: string;
  maxContacts: number | null;
  currentContactCount: number;
}

export async function getCompanyPlanData(companyId: string): Promise<CompanyPlanData | null> {
  if (!companyId || !adminDb) {
    return null;
  }

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return null;
    }

    const companyData = companyDoc.data();
    const planId = companyData?.planId || 'plan_free';

    const planDoc = await adminDb.collection('plans').doc(planId).get();
    
    if (!planDoc.exists) {
      return {
        planName: 'Free',
        maxContacts: 100,
        currentContactCount: 0,
      };
    }

    const planData = planDoc.data();
    // Use efficient count query instead of loading all leads
    const currentContactCount = await getServerLeadsCount(companyId);

    return {
      planName: planData?.name || 'Free',
      maxContacts: planData?.maxContacts ?? null,
      currentContactCount,
    };
  } catch (error) {
    console.error('Error fetching company plan data:', error);
    return null;
  }
}
