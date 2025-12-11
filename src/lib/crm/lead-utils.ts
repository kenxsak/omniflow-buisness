import type { Lead } from '@/lib/mock-data';
import type { AppUser } from '@/types/saas';

export interface FilteredLeadsOptions {
  leads: Lead[];
  searchTerm?: string;
  filterByUserId?: string;
  appUser: AppUser | null;
  isUser?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
}

export function filterLeads({
  leads,
  searchTerm = '',
  filterByUserId = 'all',
  appUser,
  isUser = false,
  isAdmin = false,
  isManager = false,
}: FilteredLeadsOptions): Lead[] {
  let filteredLeads = leads;

  if (isUser && appUser) {
    filteredLeads = leads.filter(lead => lead.assignedTo === appUser.email);
  }

  if ((isAdmin || isManager) && filterByUserId !== 'all') {
    filteredLeads = filteredLeads.filter(lead => lead.assignedTo === filterByUserId);
  }

  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    filteredLeads = filteredLeads.filter(lead =>
      Object.values(lead).some(val =>
        String(val).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }

  return filteredLeads;
}

export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function paginateLeads(
  leads: Lead[],
  currentPage: number,
  leadsPerPage: number
): PaginationResult<Lead> {
  const totalItems = leads.length;
  const totalPages = Math.ceil(totalItems / leadsPerPage);
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const items = leads.slice(indexOfFirstLead, indexOfLastLead);

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export interface SyncCounts {
  brevoSyncedCount: number;
  brevoFailedCount: number;
  hubspotSyncedCount: number;
  hubspotFailedCount: number;
}

export function calculateSyncCounts(syncDetails: Array<{
  platform: 'brevo' | 'hubspot';
  success: boolean;
}>): SyncCounts {
  let brevoSyncedCount = 0;
  let brevoFailedCount = 0;
  let hubspotSyncedCount = 0;
  let hubspotFailedCount = 0;

  for (const detail of syncDetails) {
    if (detail.platform === 'brevo') {
      if (detail.success) brevoSyncedCount++;
      else brevoFailedCount++;
    } else if (detail.platform === 'hubspot') {
      if (detail.success) hubspotSyncedCount++;
      else hubspotFailedCount++;
    }
  }

  return { brevoSyncedCount, brevoFailedCount, hubspotSyncedCount, hubspotFailedCount };
}

export function getPublicFormUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/capture-lead`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
