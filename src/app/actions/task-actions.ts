"use server";

import { getServerLeads } from '@/lib/leads-data-server';
import type { Lead } from '@/lib/mock-data';

export async function getLeadsForTaskDropdown(companyId: string): Promise<Lead[]> {
  if (!companyId) {
    return [];
  }
  
  try {
    const leads = await getServerLeads(companyId);
    return leads;
  } catch (error) {
    console.error('Error fetching leads for task dropdown:', error);
    return [];
  }
}
