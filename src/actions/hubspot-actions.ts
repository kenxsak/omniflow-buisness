
'use server';

import { getHubspotContacts } from '@/services/hubspot';
import type { HubspotContact, GetHubspotContactsResult } from '@/types/integrations';
import { type Lead } from '@/lib/mock-data';

export interface FetchHubspotContactsActionResponse extends GetHubspotContactsResult {}

// The result of the import action now returns the leads to be stored on the client
export interface ImportHubspotContactsActionResponse {
  success: boolean;
  newLeadsToStore: Lead[];
  skippedCount: number;
  error?: string;
}


export async function fetchHubspotContactsAction(
    apiKey: string, // Action now requires the key passed to it
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
        // The service function will handle the actual API call using the provided key
        const result: GetHubspotContactsResult = await getHubspotContacts(apiKey, limit, after);
        return result; // Forward the result from the service
    } catch (error: any) {
        console.error("Error in fetchHubspotContactsAction:", error);
        return { success: false, error: error.message || "An unexpected error occurred while fetching HubSpot contacts." };
    }
}


// The server action now only does transformation and filtering, NO localStorage access.
// It accepts the list of existing emails from the client to check for duplicates.
export async function importHubspotContactsAction(
  contactsToImport: HubspotContact[],
  existingLeadEmails: string[], // Pass existing emails from the client
  companyId: string
): Promise<ImportHubspotContactsActionResponse> {
  if (!contactsToImport || contactsToImport.length === 0) {
    return { success: false, newLeadsToStore: [], skippedCount: 0, error: "No contacts provided for import." };
  }

  try {
    const existingEmailsSet = new Set(existingLeadEmails.map(email => email.toLowerCase()));
    const newLeadsToStore: Lead[] = [];
    let skippedCount = 0;

    for (const hubspotContact of contactsToImport) {
      const contactEmail = hubspotContact.properties.email?.toLowerCase();
      if (!contactEmail || existingEmailsSet.has(contactEmail)) {
        skippedCount++;
        continue; // Skip if no email or if email already exists
      }
      
      const newLead: Lead = { // Create a full Lead object, ID and all
        id: crypto.randomUUID(), // Server can generate this
        name: `${hubspotContact.properties.firstname || ''} ${hubspotContact.properties.lastname || ''}`.trim(),
        email: hubspotContact.properties.email!,
        phone: hubspotContact.properties.phone,
        status: 'New', // Default status
        source: 'HubSpot Import',
        companyId: companyId,
        lastContacted: hubspotContact.properties.lastmodifieddate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: `Imported from HubSpot. Original HubSpot ID: ${hubspotContact.id}. Last modified in HubSpot: ${hubspotContact.properties.lastmodifieddate ? new Date(hubspotContact.properties.lastmodifieddate).toLocaleDateString() : 'N/A'}.`,
        hubspotSyncStatus: 'synced',
        hubspotContactId: hubspotContact.id,
        brevoSyncStatus: 'unsynced', // New lead, needs to be synced to Brevo
        attributes: {
          COMPANY_NAME: hubspotContact.properties.company,
        }
      };

      newLeadsToStore.push(newLead);
      existingEmailsSet.add(contactEmail); // Add to set to handle duplicates within the import batch itself
    }

    return { success: true, newLeadsToStore, skippedCount };
  } catch (error: any) {
    console.error("Error in importHubspotContactsAction:", error);
    return { success: false, newLeadsToStore: [], skippedCount: 0, error: error.message || "An unexpected error occurred during import processing." };
  }
}
