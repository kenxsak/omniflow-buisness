
'use server';

import { getHubspotContacts } from '@/services/hubspot';
import type { GetHubspotContactsResult, HubspotContact } from '@/types/integrations';
import type { Lead } from '@/lib/mock-data';
import { getServerLeads, addServerLead } from '@/lib/leads-data-server';

export interface FetchHubspotContactsActionResponse extends GetHubspotContactsResult {}

export interface ImportHubspotContactsActionResponse {
  success: boolean;
  newLeadsCount: number;
  skippedCount: number;
  error?: string;
}

export async function fetchHubspotContactsAction(
    apiKey: string,
    limit: number = 10,
    after?: string
): Promise<FetchHubspotContactsActionResponse> {
    if (!apiKey) {
         return { success: false, error: "HubSpot API Key is missing." };
    }
     if (!apiKey.startsWith('pat-')) {
        return { success: false, error: "Invalid HubSpot API Key format provided to action. Expected Private App Access Token starting with 'pat-'." };
    }

    try {
        const result: GetHubspotContactsResult = await getHubspotContacts(apiKey, limit, after);
        return result;
    } catch (error: any) {
        console.error("Error in fetchHubspotContactsAction:", error);
        return { success: false, error: error.message || "An unexpected error occurred while fetching HubSpot contacts." };
    }
}

export async function importHubspotContactsAction(
  contactsToImport: HubspotContact[],
  companyId: string, // Requires companyId to know where to store the leads
  assignedToEmail?: string
): Promise<ImportHubspotContactsActionResponse> {
  if (!contactsToImport || contactsToImport.length === 0) {
    return { success: false, newLeadsCount: 0, skippedCount: 0, error: "No contacts provided for import." };
  }
   if (!companyId) {
    return { success: false, newLeadsCount: 0, skippedCount: 0, error: "Company context is missing." };
  }

  try {
    const existingLeads = await getServerLeads(companyId);
    const existingEmailsSet = new Set(existingLeads.map(lead => lead.email.toLowerCase()));
    
    let newLeadsCount = 0;
    let skippedCount = 0;

    for (const hubspotContact of contactsToImport) {
      const contactEmail = hubspotContact.properties.email?.toLowerCase();
      if (!contactEmail || existingEmailsSet.has(contactEmail)) {
        skippedCount++;
        continue;
      }
      
      const newLeadData: Omit<Lead, 'id' | 'createdAt' | 'companyId'> = {
        name: `${hubspotContact.properties.firstname || ''} ${hubspotContact.properties.lastname || ''}`.trim(),
        email: hubspotContact.properties.email!,
        phone: hubspotContact.properties.phone,
        status: 'New',
        source: 'HubSpot Import',
        assignedTo: assignedToEmail, // Assign to the current user or leave unassigned
        lastContacted: hubspotContact.properties.lastmodifieddate || new Date().toISOString() as any,
        notes: `Imported from HubSpot. Original HubSpot ID: ${hubspotContact.id}. Last modified in HubSpot: ${hubspotContact.properties.lastmodifieddate ? new Date(hubspotContact.properties.lastmodifieddate).toLocaleDateString() : 'N/A'}.`,
        hubspotSyncStatus: 'synced',
        hubspotContactId: hubspotContact.id,
        brevoSyncStatus: 'unsynced',
        attributes: {
          COMPANY_NAME: hubspotContact.properties.company,
        }
      };

      await addServerLead(companyId, newLeadData);
      newLeadsCount++;
      existingEmailsSet.add(contactEmail);
    }

    return { success: true, newLeadsCount, skippedCount };
  } catch (error: any) {
    console.error("Error in importHubspotContactsAction:", error);
    return { success: false, newLeadsCount: 0, skippedCount: 0, error: error.message || "An unexpected error occurred during import processing." };
  }
}
