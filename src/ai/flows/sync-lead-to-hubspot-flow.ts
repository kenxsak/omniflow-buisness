
'use server';
/**
 * @fileOverview A function for synchronizing an OmniFlow lead to a HubSpot contact.
 * This is not an AI flow, but a utility function for data synchronization.
 *
 * - syncLeadToHubspot - A function that handles the lead synchronization to HubSpot.
 * - SyncLeadToHubspotInput - The input type for the syncLeadToHubspot function.
 * - SyncLeadToHubspotOutput - The return type for the syncLeadToHubspot function.
 */

import { z } from 'zod';
import { addOrUpdateHubspotContact, type HubspotContactInput, type AddOrUpdateHubspotContactResult as HubspotServiceOutput } from '@/services/hubspot';

// Input schema matches relevant parts of OmniFlow's Lead interface for HubSpot properties
const SyncLeadToHubspotInputSchema = z.object({
  apiKey: z.string().describe("The user's HubSpot API key passed from the client."),
  email: z.string().email().describe("The lead's email address (required for sync)."),
  firstName: z.string().optional().describe("The lead's first name."),
  lastName: z.string().optional().describe("The lead's last name."),
  phone: z.string().optional().describe("The lead's phone number."),
  companyName: z.string().optional().describe("The lead's company name (maps to 'company' property in HubSpot)."),
  omniFlowLeadStatus: z.enum(['New', 'Contacted', 'Qualified', 'Lost', 'Won']).optional().describe("OmniFlow lead status to potentially map to HubSpot lifecycle stage."),
  website: z.string().optional().describe("The lead's website (maps to 'website' property)."),
  omniFlowLeadId: z.string().optional().describe("The OmniFlow internal ID for this lead (for logging/reference)."),
});
export type SyncLeadToHubspotInput = z.infer<typeof SyncLeadToHubspotInputSchema>;

const SyncLeadToHubspotOutputSchema = z.object({
  hubspotContactId: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  isNewContact: z.boolean().optional(),
});
export type SyncLeadToHubspotOutput = z.infer<typeof SyncLeadToHubspotOutputSchema>;


// This is now a standard async function, not a Genkit flow.
export async function syncLeadToHubspot(input: SyncLeadToHubspotInput): Promise<SyncLeadToHubspotOutput> {
    const apiKey = input.apiKey;
    if (!apiKey) {
      return { success: false, message: 'HubSpot API Key not provided to the sync function.' };
    }
     if (!apiKey.startsWith('pat-')) {
        return { success: false, message: "Invalid HubSpot API Key format in sync function. Expected Private App Access Token starting with 'pat-'." };
    }

    // --- Map OmniFlow status to HubSpot lifecycle stage (Example Mapping) ---
    let lifecycleStage: string | undefined = undefined;
    switch (input.omniFlowLeadStatus) {
      case 'New':
        lifecycleStage = 'lead';
        break;
      case 'Contacted':
        lifecycleStage = 'lead';
        break;
      case 'Qualified':
        lifecycleStage = 'marketingqualifiedlead';
        break;
      case 'Won':
        lifecycleStage = 'customer';
        break;
    }
    // --- End Mapping ---

    const hubspotContactPayload: HubspotContactInput = {
      email: input.email,
      firstname: input.firstName,
      lastname: input.lastName,
      phone: input.phone,
      company: input.companyName,
      website: input.website,
      lifecyclestage: lifecycleStage,
    };

    // Clean up undefined properties before sending to service
     Object.keys(hubspotContactPayload).forEach(key => {
        const K = key as keyof HubspotContactInput;
        if (hubspotContactPayload[K] === undefined) {
          delete hubspotContactPayload[K];
        }
     });

    // Pass the API key from the input to the service call
    const result: HubspotServiceOutput = await addOrUpdateHubspotContact(apiKey, hubspotContactPayload);
    
    return {
        hubspotContactId: result.id,
        success: result.success,
        message: result.message,
        isNewContact: result.isNewContact,
    };
}
