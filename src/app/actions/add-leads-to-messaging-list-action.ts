'use server';

import type { Lead } from '@/lib/mock-data';
import { getServerLeads } from '@/lib/leads-data-server';
import { addServerWhatsAppContact } from '@/lib/whatsapp-marketing-data-server';

export interface AddToListResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  errorMessage?: string;
  skippedReasons?: {
    noPhone: number;
    invalidPhone: number;
    persistenceFailed: number;
  };
}

function validateAndFormatPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  
  const cleaned = phone.replace(/[()\s-]/g, '');
  
  if (!/^\+\d{10,15}$/.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

export async function addLeadsToWhatsAppListAction(
  leadIds: string[],
  listId: string,
  companyId: string
): Promise<AddToListResult> {
  try {
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'No contacts selected.',
      };
    }

    if (!listId) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        errorMessage: 'No list selected.',
      };
    }

    const allLeads = await getServerLeads(companyId);
    const leadsToAdd = allLeads.filter(lead => leadIds.includes(lead.id));

    let addedCount = 0;
    let noPhoneCount = 0;
    let invalidPhoneCount = 0;
    let persistenceFailedCount = 0;

    const addPromises = leadsToAdd.map(async (lead) => {
      if (!lead.phone) {
        noPhoneCount++;
        return;
      }

      const validPhone = validateAndFormatPhone(lead.phone);
      if (!validPhone) {
        invalidPhoneCount++;
        return;
      }

      try {
        const result = await addServerWhatsAppContact(listId, companyId, lead.name, validPhone);
        if (result) {
          addedCount++;
        } else {
          console.error(`Failed to add contact ${lead.name}: addServerWhatsAppContact returned null`);
          persistenceFailedCount++;
        }
      } catch (error) {
        console.error(`Failed to add contact ${lead.name}:`, error);
        persistenceFailedCount++;
      }
    });

    await Promise.all(addPromises);

    const skippedCount = noPhoneCount + invalidPhoneCount + persistenceFailedCount;

    return {
      success: true,
      addedCount,
      skippedCount,
      skippedReasons: {
        noPhone: noPhoneCount,
        invalidPhone: invalidPhoneCount,
        persistenceFailed: persistenceFailedCount,
      },
    };
  } catch (error: any) {
    console.error('Error adding leads to WhatsApp list:', error);
    return {
      success: false,
      addedCount: 0,
      skippedCount: 0,
      errorMessage: error.message || 'Failed to add contacts to list.',
    };
  }
}
