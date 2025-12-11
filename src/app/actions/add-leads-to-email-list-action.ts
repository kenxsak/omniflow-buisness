'use server';

import { getServerLeads } from '@/lib/leads-data-server';
import { addOrUpdateBrevoContact } from '@/services/brevo';

interface AddToEmailListResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  errorMessage?: string;
  skippedReasons?: {
    noEmail?: number;
    invalidEmail?: number;
    persistenceFailed?: number;
  };
}

export async function addLeadsToEmailListAction(
  leadIds: string[],
  brevoListId: number,
  companyId: string,
  brevoApiKey: string
): Promise<AddToEmailListResult> {
  try {
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'No leads selected',
      };
    }

    if (!brevoApiKey) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'Brevo API Key not configured',
      };
    }

    const allLeads = await getServerLeads(companyId);
    const leadsToAdd = allLeads.filter(lead => leadIds.includes(lead.id));

    let addedCount = 0;
    let noEmailCount = 0;
    let invalidEmailCount = 0;
    let persistenceFailedCount = 0;

    const addPromises = leadsToAdd.map(async (lead) => {
      const email = lead.email?.trim();
      if (!email) {
        noEmailCount++;
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        invalidEmailCount++;
        return;
      }

      try {
        const result = await addOrUpdateBrevoContact(brevoApiKey, {
          email: email.toLowerCase(),
          attributes: {
            FIRSTNAME: lead.name?.split(' ')[0] || '',
            LASTNAME: lead.name?.split(' ').slice(1).join(' ') || '',
            PHONE: lead.phone || '',
            COMPANY: lead.attributes?.COMPANY_NAME || '',
          },
          listIds: [brevoListId],
          updateEnabled: true,
        });

        if (result.success) {
          addedCount++;
        } else {
          console.error(`Failed to add lead ${lead.name} to Brevo list:`, result.message);
          persistenceFailedCount++;
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.name}:`, error);
        persistenceFailedCount++;
      }
    });

    await Promise.all(addPromises);

    const skippedCount = noEmailCount + invalidEmailCount + persistenceFailedCount;

    return {
      success: true,
      addedCount,
      skippedCount,
      skippedReasons: {
        noEmail: noEmailCount,
        invalidEmail: invalidEmailCount,
        persistenceFailed: persistenceFailedCount,
      },
    };
  } catch (error: any) {
    console.error('Error in addLeadsToEmailListAction:', error);
    return {
      success: false,
      addedCount: 0,
      skippedCount: leadIds.length,
      errorMessage: error.message || 'An unexpected error occurred',
    };
  }
}
