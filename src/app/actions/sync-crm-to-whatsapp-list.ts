'use server';

/**
 * Sync CRM Contacts to WhatsApp Lists
 * Allows one-click sync of CRM contacts to WhatsApp lists for SMS/WhatsApp campaigns
 */

import { getServerLeads } from '@/lib/leads-data-server';
import { getServerWhatsAppContacts, addServerWhatsAppContact } from '@/lib/whatsapp-marketing-data-server';
import type { Lead } from '@/lib/mock-data';

export interface SyncToWhatsAppListResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  duplicateCount: number;
  error?: string;
  details?: {
    added: string[];
    skipped: string[];
    duplicates: string[];
  };
}

/**
 * Sync selected CRM leads to a WhatsApp list
 */
export async function syncCRMContactsToWhatsAppListAction(
  leadIds: string[],
  whatsappListId: string,
  companyId: string
): Promise<SyncToWhatsAppListResult> {
  try {
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        duplicateCount: 0,
        error: 'No contacts selected',
      };
    }

    if (!whatsappListId) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        duplicateCount: 0,
        error: 'No WhatsApp list selected',
      };
    }

    // Get all CRM leads
    const allLeads = await getServerLeads(companyId);
    const leadsToSync = allLeads.filter((lead) => leadIds.includes(lead.id));

    if (leadsToSync.length === 0) {
      return {
        success: false,
        addedCount: 0,
        skippedCount: 0,
        duplicateCount: 0,
        error: 'No valid contacts found',
      };
    }

    // Get existing contacts in the WhatsApp list to check for duplicates
    const existingContacts = await getServerWhatsAppContacts(whatsappListId, companyId);
    const existingPhones = new Set(
      existingContacts.map((c) => c.phoneNumber.replace(/\s+/g, ''))
    );

    let addedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    const added: string[] = [];
    const skipped: string[] = [];
    const duplicates: string[] = [];

    // Sync each lead to the WhatsApp list
    for (const lead of leadsToSync) {
      // Skip if no phone number
      if (!lead.phone || !lead.phone.trim()) {
        skippedCount++;
        skipped.push(lead.name);
        continue;
      }

      const cleanPhone = lead.phone.replace(/\s+/g, '');

      // Check if phone already exists in the list
      if (existingPhones.has(cleanPhone)) {
        duplicateCount++;
        duplicates.push(lead.name);
        continue;
      }

      // Add to WhatsApp list
      const result = await addServerWhatsAppContact(
        whatsappListId,
        companyId,
        lead.name,
        lead.phone
      );

      if (result) {
        addedCount++;
        added.push(lead.name);
        existingPhones.add(cleanPhone); // Update set to avoid duplicates in same batch
      } else {
        skippedCount++;
        skipped.push(lead.name);
      }
    }

    return {
      success: true,
      addedCount,
      skippedCount,
      duplicateCount,
      details: {
        added,
        skipped,
        duplicates,
      },
    };
  } catch (error) {
    console.error('Error syncing CRM contacts to WhatsApp list:', error);
    return {
      success: false,
      addedCount: 0,
      skippedCount: 0,
      duplicateCount: 0,
      error: error instanceof Error ? error.message : 'Failed to sync contacts',
    };
  }
}
