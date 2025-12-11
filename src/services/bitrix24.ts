
'use server';
/**
 * @fileOverview Service functions for interacting with the Bitrix24 API.
 * Note: This uses the Inbound Webhook method for simplicity in the demo.
 * Production apps might use the Application method with OAuth.
 */

import type { GetBitrix24ContactsResult, Bitrix24Contact } from '@/types/integrations';

/**
 * Fetches contacts from Bitrix24 using an Inbound Webhook.
 *
 * @param webhookUrl The full Inbound Webhook URL from Bitrix24 settings.
 * @param limit The maximum number of contacts to fetch per page.
 * @param start Optional offset for pagination (record number to start from).
 * @returns A promise resolving to GetBitrix24ContactsResult.
 */
export async function getBitrix24Contacts(
    webhookUrl: string, // URL must be provided by the caller
    limit: number = 10,
    start: number = 0
): Promise<GetBitrix24ContactsResult> {

    if (!webhookUrl || !webhookUrl.includes('/rest/')) {
        return { success: false, error: "Invalid Bitrix24 Inbound Webhook URL provided." };
    }

    // Construct the API method URL
    const apiUrl = `${webhookUrl.replace(/\/$/, '')}/crm.contact.list.json`;

    const params = new URLSearchParams({
        'order[DATE_CREATE]': 'DESC', // Get newest first
        'select[]': '*', // Select all standard fields (*) - refine if needed
        'select[]': 'EMAIL', // Ensure EMAIL is selected
        'select[]': 'PHONE', // Ensure PHONE is selected
        'start': start.toString(),
    });
    // Bitrix24 limit is typically 50 per request, but we respect the passed limit if smaller
    // The API itself might cap it at 50 regardless.
    // params.append('limit', Math.min(limit, 50).toString()); // Not a standard parameter for list methods

    const fullUrl = `${apiUrl}?${params.toString()}`;

    try {
        const response = await fetch(fullUrl, {
            method: 'GET', // List methods are typically GET
            headers: {
                'Accept': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('Bitrix24 API Error (getBitrix24Contacts):', data);
            return { success: false, error: data.error_description || data.error || `Failed to fetch contacts from Bitrix24 (Status: ${response.status})` };
        }

        // Map Bitrix24's response structure
        const contacts: Bitrix24Contact[] = (data.result || []).map((contact: any) => ({
            ID: contact.ID,
            NAME: contact.NAME,
            LAST_NAME: contact.LAST_NAME,
            SECOND_NAME: contact.SECOND_NAME,
            EMAIL: contact.EMAIL, // This is an array of objects
            PHONE: contact.PHONE, // This is an array of objects
            COMPANY_ID: contact.COMPANY_ID,
            // ... map other selected fields
        }));

        return {
            success: true,
            contacts: contacts,
            total: data.total, // Total number of contacts matching filter
            next: data.next,   // Offset for the next page
        };

    } catch (error: any) {
        console.error('Error fetching Bitrix24 contacts:', error);
        return { success: false, error: error.message || 'Network error or other issue fetching Bitrix24 contacts.' };
    }
}

// Placeholder for other Bitrix24 functions (create, update, etc.)
// These would follow similar patterns using the webhook URL and specific API methods.
