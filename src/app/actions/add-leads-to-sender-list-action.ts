'use server';

import { getServerLeads } from '@/lib/leads-data-server';
import { addOrUpdateSenderContact } from '@/lib/sender-client';

interface AddToSenderListResult {
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

export async function addLeadsToSenderListAction(
  leadIds: string[],
  senderListId: string,
  companyId: string,
  senderApiKey: string
): Promise<AddToSenderListResult> {
  try {
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'No leads selected',
      };
    }

    if (!senderApiKey) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'Sender.net API Key not configured',
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
        const result = await addOrUpdateSenderContact(senderApiKey, {
          email: email.toLowerCase(),
          firstname: lead.name?.split(' ')[0] || '',
          lastname: lead.name?.split(' ').slice(1).join(' ') || '',
          fields: {
            phone: lead.phone || '',
            company: lead.attributes?.COMPANY_NAME || '',
          },
          groups: [senderListId],
        });

        if (result.success) {
          addedCount++;
        } else {
          console.error(`Failed to add lead ${lead.name} to Sender.net list:`, result.message);
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
    console.error('Error in addLeadsToSenderListAction:', error);
    return {
      success: false,
      addedCount: 0,
      skippedCount: leadIds.length,
      errorMessage: error.message || 'An unexpected error occurred',
    };
  }
}
