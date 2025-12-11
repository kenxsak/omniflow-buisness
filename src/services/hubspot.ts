
'use server';
/**
 * @fileOverview Service functions for interacting with the HubSpot API.
 * Note: This uses Private App Access Tokens for authentication in the demo.
 */

import type { GetHubspotContactsResult, HubspotContact, HubspotContactInput, AddOrUpdateHubspotContactResult } from '@/types/integrations';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

/**
 * Fetches contacts from HubSpot.
 * Requires the API Key to be passed explicitly.
 *
 * @param apiKey The HubSpot Private App Access Token (starting with 'pat-').
 * @param limit The maximum number of contacts to fetch per page.
 * @param after Optional token for pagination (get next page).
 * @returns A promise resolving to GetHubspotContactsResult.
 */
export async function getHubspotContacts(
    apiKey: string, // Key must be provided
    limit: number = 10,
    after?: string
): Promise<GetHubspotContactsResult> {

    if (!apiKey) {
        return { success: false, error: "HubSpot API Key was not provided." };
    }
    if (!apiKey.startsWith('pat-')) {
        return { success: false, error: "Invalid HubSpot API Key format. Expected Private App Access Token starting with 'pat-'." };
    }

    const properties = [
        'firstname', 'lastname', 'email', 'phone', 'company',
        'website', 'lifecyclestage', 'createdate', 'lastmodifieddate'
        // Add hs_object_id if needed, although it's usually the main 'id' field
    ];
    const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('properties', properties.join(','));
    url.searchParams.append('sorts', '-lastmodifieddate'); // Sort by most recently modified
    if (after) {
        url.searchParams.append('after', after);
    }

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            cache: 'no-store', // Ensure fresh data for demo purposes
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('HubSpot API Error (getHubspotContacts):', data);
            const errorMessage = data?.message || `Failed to fetch contacts from HubSpot (Status: ${response.status})`;
             // Check for common authentication/permission errors
             if (response.status === 401) {
                 return { success: false, error: `HubSpot Authentication Failed: ${errorMessage}. Please check your Private App Access Token in Settings.` };
             }
             if (response.status === 403) {
                 // Provide more specific guidance if possible (e.g., checking scopes)
                 let detailedError = `HubSpot Permission Error: ${errorMessage}.`;
                 if (errorMessage.toLowerCase().includes('scope')) {
                     detailedError += " Ensure your Private App has the required 'crm.objects.contacts.read' scope enabled in HubSpot.";
                 } else {
                     detailedError += " Please verify your Private App's permissions in HubSpot.";
                 }
                 return { success: false, error: detailedError };
             }
            return { success: false, error: errorMessage };
        }

        const contacts: HubspotContact[] = data.results.map((contact: any) => ({
            id: contact.id, // HubSpot's internal ID for the contact object
            properties: contact.properties,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
            archived: contact.archived,
        }));

        return {
            success: true,
            contacts: contacts,
            total: data.total, // Note: HubSpot V3 list API might not always return 'total'
            nextPageToken: data.paging?.next?.after,
        };
    } catch (error: any) {
        console.error('Error fetching HubSpot contacts:', error);
        // Check for network errors vs other errors
        if (error instanceof TypeError && error.message.includes('fetch failed')) {
             return { success: false, error: 'Network error connecting to HubSpot API. Check your connection or HubSpot status.' };
        }
        return { success: false, error: error.message || 'An unexpected error occurred while fetching HubSpot contacts.' };
    }
}


/**
 * Creates or updates a contact in HubSpot.
 * Searches for an existing contact by email first. If found, updates it; otherwise, creates a new one.
 * Requires the API Key to be passed explicitly.
 *
 * @param apiKey The HubSpot Private App Access Token (starting with 'pat-').
 * @param contactData The contact details to create or update.
 * @returns A promise resolving to AddOrUpdateHubspotContactResult.
 */
export async function addOrUpdateHubspotContact(
    apiKey: string, // Key must be provided
    contactData: HubspotContactInput
): Promise<AddOrUpdateHubspotContactResult> {

    if (!apiKey) {
        return { success: false, message: "HubSpot API Key was not provided." };
    }
    if (!apiKey.startsWith('pat-')) {
        return { success: false, message: "Invalid HubSpot API Key format. Expected Private App Access Token starting with 'pat-'." };
    }
     if (!contactData.email) {
        return { success: false, message: "Contact email is required to sync with HubSpot." };
    }

    // --- Step 1: Search for existing contact by email ---
    const searchUrl = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`;
    const searchPayload = {
        filterGroups: [
            {
                filters: [
                    {
                        propertyName: 'email',
                        operator: 'EQ',
                        value: contactData.email,
                    },
                ],
            },
        ],
        properties: ['email', 'firstname', 'lastname', 'hs_object_id'], // Include properties needed for potential update or just ID
        limit: 1, // We only need to know if one exists
    };

    let existingContactId: string | null = null;
    try {
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(searchPayload),
        });
        const searchData = await searchResponse.json();

        if (!searchResponse.ok) {
            console.error('HubSpot API Search Error:', searchData);
            // Handle 403 specifically for missing search scopes
            if (searchResponse.status === 403) {
                 return { success: false, message: `HubSpot Permission Error: ${searchData.message}. Ensure your Private App has 'crm.objects.contacts.read' scope for searching.` };
            }
            return { success: false, message: searchData.message || `Failed to search for contact in HubSpot (Status: ${searchResponse.status})` };
        }

        if (searchData.total > 0 && searchData.results[0]) {
            existingContactId = searchData.results[0].id;
        }

    } catch (error: any) {
        console.error('Error searching HubSpot contact:', error);
        return { success: false, message: error.message || 'Network error or other issue searching HubSpot contact.' };
    }

    // --- Step 2: Create or Update ---
    const propertiesToSync = {
        email: contactData.email,
        ...(contactData.firstname && { firstname: contactData.firstname }),
        ...(contactData.lastname && { lastname: contactData.lastname }),
        ...(contactData.phone && { phone: contactData.phone }),
        ...(contactData.company && { company: contactData.company }),
        ...(contactData.website && { website: contactData.website }),
        ...(contactData.lifecyclestage && { lifecyclestage: contactData.lifecyclestage }),
        // Add other mapped properties here
    };

    let method: string;
    let apiUrl: string;
    let successMessage: string;
    let isNew = false;

    if (existingContactId) {
        // Update existing contact
        method = 'PATCH';
        apiUrl = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingContactId}`;
        successMessage = 'Contact updated in HubSpot.';
        isNew = false;
    } else {
        // Create new contact
        method = 'POST';
        apiUrl = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;
        successMessage = 'Contact created in HubSpot.';
        isNew = true;
    }

    try {
        const syncResponse = await fetch(apiUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ properties: propertiesToSync }),
        });

        const syncData = await syncResponse.json();

        if (!syncResponse.ok) {
            console.error(`HubSpot API ${method} Error:`, syncData);
             if (syncResponse.status === 403) {
                 return { success: false, message: `HubSpot Permission Error: ${syncData.message}. Ensure your Private App has 'crm.objects.contacts.write' scope.` };
             }
             if (syncResponse.status === 400 && syncData?.category === 'VALIDATION_ERROR') {
                 // Provide more detail for validation errors
                 const errorDetails = syncData.errors?.map((e: any) => `${e.message} (field: ${e.in})`).join('; ') || syncData.message;
                 return { success: false, message: `HubSpot Validation Error: ${errorDetails}` };
             }
            return { success: false, message: syncData.message || `Failed to ${isNew ? 'create' : 'update'} contact in HubSpot (Status: ${syncResponse.status})` };
        }

        return {
            success: true,
            id: syncData.id,
            isNewContact: isNew,
            message: successMessage,
        };

    } catch (error: any) {
        console.error(`Error ${isNew ? 'creating' : 'updating'} HubSpot contact:`, error);
        return { success: false, message: error.message || `Network error or other issue ${isNew ? 'creating' : 'updating'} HubSpot contact.` };
    }
}
