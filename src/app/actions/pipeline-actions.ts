'use server';

import { getLeadsForCompany } from '@/lib/crm/lead-data';
import { getCompanyIdFromToken } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import type { Lead } from '@/lib/mock-data';

export async function getPipelineData(): Promise<Record<Lead['status'], Lead[]> | null> {
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

    const leads = await getLeadsForCompany(companyId);
    const statuses: Array<Lead['status']> = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
    
    const leadsByStatus = statuses.reduce((acc, status) => {
      acc[status] = leads.filter(lead => lead.status === status);
      return acc;
    }, {} as Record<Lead['status'], Lead[]>);

    return leadsByStatus;
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    return null;
  }
}
