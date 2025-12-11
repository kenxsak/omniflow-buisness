'use server';

import { getLeadStatsForCompany } from '@/lib/crm/lead-data';
import { getCompanyIdFromToken } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import type { LeadStats } from '@/lib/crm/lead-data';

export async function getCrmStats(): Promise<LeadStats | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('firebase-auth-token')?.value;
    
    if (!authToken) {
      return null;
    }

    const companyId = await getCompanyIdFromToken(authToken);
    if (!companyId) {
      return null;
    }

    return await getLeadStatsForCompany(companyId);
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    return null;
  }
}
