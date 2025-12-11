
'use server';
/**
 * @fileOverview Server actions related to syncing local CRM leads with external platforms.
 */

import type { Lead } from '@/lib/mock-data';
import { getServerLeads, updateServerLead } from '@/lib/leads-data-server';
import { syncLeadToBrevo, type SyncLeadToBrevoInput } from '@/ai/flows/sync-lead-to-brevo-flow';
import { syncLeadToHubspot, type SyncLeadToHubspotInput } from '@/ai/flows/sync-lead-to-hubspot-flow';

export interface SyncDetail {
  leadId: string;
  platform: 'brevo' | 'hubspot';
  success: boolean;
  isNewContact?: boolean; // True if a new contact was created
  contactId?: number | string;
  errorMessage?: string;
}

export interface BulkSyncResult {
  syncDetails: SyncDetail[];
}

// --- Function to sync a single lead to Brevo ---
// This action now only communicates with the external service and returns the result.
export async function syncSingleLeadToBrevoAction(lead: Lead, apiKey: string): Promise<SyncDetail> {
    if (!apiKey) {
      return { leadId: lead.id, platform: 'brevo', success: false, errorMessage: 'Brevo API Key not provided.' };
    }
    const [firstName, ...lastNameParts] = lead.name.split(' ');
    const lastName = lastNameParts.join(' ');
    const syncInput: SyncLeadToBrevoInput = {
      apiKey: apiKey, // Pass the API key to the flow
      email: lead.email,
      firstName: firstName,
      lastName: lastName,
      companyName: lead.attributes?.COMPANY_NAME || undefined,
      omniFlowLeadId: lead.id,
    };
    try {
      const result = await syncLeadToBrevo(syncInput);
      return {
        leadId: lead.id,
        platform: 'brevo',
        success: result.success,
        isNewContact: result.isNewContact,
        contactId: result.brevoContactId,
        errorMessage: result.success ? undefined : (result.message || 'Unknown error syncing to Brevo.'),
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unexpected error syncing to Brevo';
      return { leadId: lead.id, platform: 'brevo', success: false, errorMessage };
    }
};

// --- Function to sync a single lead to HubSpot ---
// This action now only communicates with the external service and returns the result.
export async function syncSingleLeadToHubspotAction(lead: Lead, apiKey: string): Promise<SyncDetail> {
     if (!apiKey) {
      return { leadId: lead.id, platform: 'hubspot', success: false, errorMessage: 'HubSpot API Key not provided.' };
    }
     const [firstName, ...lastNameParts] = lead.name.split(' ');
    const lastName = lastNameParts.join(' ');
    const syncInput: SyncLeadToHubspotInput = {
      apiKey: apiKey, // Pass the API key to the flow
      email: lead.email,
      firstName: firstName,
      lastName: lastName,
      phone: lead.phone,
      companyName: lead.attributes?.COMPANY_NAME || undefined,
      omniFlowLeadStatus: lead.status,
      omniFlowLeadId: lead.id,
    };
    try {
      const result = await syncLeadToHubspot(syncInput);
      return {
        leadId: lead.id,
        platform: 'hubspot',
        success: result.success,
        isNewContact: result.isNewContact,
        contactId: result.hubspotContactId,
        errorMessage: result.success ? undefined : (result.message || 'Unknown error syncing to HubSpot.'),
      };
    } catch (error: any) {
       const errorMessage = error.message || 'Unexpected error syncing to HubSpot';
      return { leadId: lead.id, platform: 'hubspot', success: false, errorMessage };
    }
};

export async function syncSelectedLeadsAction(leadIds: string[], companyId: string, brevoApiKey?: string, hubspotApiKey?: string): Promise<BulkSyncResult> {
  // Fetch leads for the specific company
  const allLeads = await getServerLeads(companyId); 
  const leadsToSync = allLeads.filter(lead => leadIds.includes(lead.id));
  
  const syncDetails: SyncDetail[] = [];

  if (leadsToSync.length === 0) {
    return { syncDetails: [] };
  }

  const syncPromises: Promise<SyncDetail>[] = [];

  if (brevoApiKey) {
    leadsToSync.forEach(lead => {
      syncPromises.push(syncSingleLeadToBrevoAction(lead, brevoApiKey));
    });
  }
  if (hubspotApiKey) {
    leadsToSync.forEach(lead => {
      syncPromises.push(syncSingleLeadToHubspotAction(lead, hubspotApiKey));
    });
  }

  if (syncPromises.length === 0) {
    const detailsForAllLeads = leadIds.map(id => ({
      leadId: id,
      platform: 'brevo' as const, // Placeholder
      success: false,
      errorMessage: "Sync initiated, but no API keys were provided for any platform."
    }));
    return { syncDetails: detailsForAllLeads };
  }
  
  const results = await Promise.all(syncPromises);
  syncDetails.push(...results);

  // Persist sync results to Firestore
  for (const detail of results) {
    const leadToUpdate = leadsToSync.find(l => l.id === detail.leadId);
    if (!leadToUpdate) continue;

    const statusKey = `${detail.platform}SyncStatus` as 'brevoSyncStatus' | 'hubspotSyncStatus';
    const errorKey = `${detail.platform}ErrorMessage` as 'brevoErrorMessage' | 'hubspotErrorMessage';
    const idKey = `${detail.platform}ContactId` as 'brevoContactId' | 'hubspotContactId';

    const updates: any = {
      id: detail.leadId,
      [statusKey]: detail.success ? 'synced' : 'failed',
    };

    // Only set error message if sync failed (avoid undefined values)
    if (!detail.success && detail.errorMessage) {
      updates[errorKey] = detail.errorMessage;
    }

    // Only set contact ID if sync succeeded and ID exists
    if (detail.success && detail.contactId) {
      updates[idKey] = detail.contactId;
    }

    await updateServerLead(updates as Partial<Lead> & { id: string });
  }

  return { syncDetails };
}
