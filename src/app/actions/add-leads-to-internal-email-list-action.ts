'use server';

import { getServerLeads } from '@/lib/leads-data-server';
import { bulkAddServerEmailContactsFromLeads } from '@/lib/email-list-data-server';

interface AddToInternalEmailListResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  errorMessage?: string;
  skippedReasons?: {
    noEmail?: number;
    invalidEmail?: number;
    duplicate?: number;
    failed?: number;
  };
}

export async function addLeadsToInternalEmailListAction(
  leadIds: string[],
  listId: string,
  companyId: string
): Promise<AddToInternalEmailListResult> {
  try {
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'No leads selected',
      };
    }

    if (!listId || !companyId) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'Invalid list or company ID',
      };
    }

    const allLeads = await getServerLeads(companyId);
    const leadsToAdd = allLeads.filter(lead => leadIds.includes(lead.id));

    if (leadsToAdd.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: leadIds.length,
        errorMessage: 'No matching leads found',
      };
    }

    const mappedLeads = leadsToAdd.map(lead => ({
      id: lead.id,
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone,
      companyName: lead.attributes?.COMPANY_NAME,
    }));

    const result = await bulkAddServerEmailContactsFromLeads(
      listId,
      companyId,
      mappedLeads
    );

    return {
      success: true,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
      skippedReasons: {
        noEmail: result.skippedReasons.noEmail,
        invalidEmail: result.skippedReasons.invalidEmail,
        duplicate: result.skippedReasons.duplicate,
        failed: result.skippedReasons.failed,
      },
    };
  } catch (error: any) {
    console.error('Error in addLeadsToInternalEmailListAction:', error);
    return {
      success: false,
      addedCount: 0,
      skippedCount: leadIds.length,
      errorMessage: error.message || 'An unexpected error occurred',
    };
  }
}
