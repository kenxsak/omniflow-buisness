
'use server';
/**
 * @fileOverview A function for synchronizing an OmniFlow lead to a Brevo contact.
 * This is not an AI flow, but a utility function for data synchronization.
 *
 * - syncLeadToBrevo - A function that handles the lead synchronization.
 * - SyncLeadToBrevoInput - The input type for the syncLeadToBrevo function.
 * - SyncLeadToBrevoOutput - The return type for the syncLeadToBrevo function.
 */

import { z } from 'zod';
import { addOrUpdateBrevoContact, type BrevoContact, type AddOrUpdateContactResult as BrevoServiceOutput } from '@/services/brevo';

// Input schema matches relevant parts of OmniFlow's Lead interface for Brevo attributes
const SyncLeadToBrevoInputSchema = z.object({
  apiKey: z.string().describe("The user's Brevo API key passed from the client."),
  email: z.string().email().describe("The lead's email address."),
  firstName: z.string().optional().describe("The lead's first name."),
  lastName: z.string().optional().describe("The lead's last name."),
  companyName: z.string().optional().describe("The lead's company name (maps to COMPANY attribute in Brevo)."),
  listIds: z.array(z.number()).optional().describe("Specific Brevo list IDs to add/update the contact in. If empty, uses default list."),
  omniFlowLeadId: z.string().optional().describe("The OmniFlow internal ID for this lead."), 
});
export type SyncLeadToBrevoInput = z.infer<typeof SyncLeadToBrevoInputSchema>;

const SyncLeadToBrevoOutputSchema = z.object({
  brevoContactId: z.number().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  isNewContact: z.boolean().optional(),
});
export type SyncLeadToBrevoOutput = z.infer<typeof SyncLeadToBrevoOutputSchema>;


// This is now a standard async function, not a Genkit flow.
export async function syncLeadToBrevo(input: SyncLeadToBrevoInput): Promise<SyncLeadToBrevoOutput> {
    const brevoContactPayload: BrevoContact = {
      email: input.email,
      attributes: {},
      listIds: input.listIds, // Pass through if provided
    };

    if (input.firstName) {
        (brevoContactPayload.attributes as Record<string, any>)['FIRSTNAME'] = input.firstName;
    }
    if (input.lastName) {
        (brevoContactPayload.attributes as Record<string, any>)['LASTNAME'] = input.lastName;
    }
    if (input.companyName) {
        (brevoContactPayload.attributes as Record<string, any>)['COMPANY'] = input.companyName; // Assuming 'COMPANY' is your Brevo attribute name
    }

    // The API Key is now passed from the input to the service call
    const result: BrevoServiceOutput = await addOrUpdateBrevoContact(input.apiKey, brevoContactPayload);
    
    return {
        brevoContactId: result.id,
        success: result.success,
        message: result.message,
        isNewContact: result.isNewContact,
    };
}
