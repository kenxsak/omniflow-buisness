
'use server';

import { 
    getBrevoLists, 
    getContactsFromBrevoList,
    type GetListsResult,
    type GetContactsInListResult 
} from '@/services/brevo';

/**
 * Server action to fetch contact lists from Brevo.
 * @param limit - The number of lists to fetch.
 * @param offset - The offset for pagination.
 * @returns A promise resolving to the result of fetching lists.
 */
export async function fetchBrevoListsAction(apiKey: string, limit: number = 50, offset: number = 0): Promise<GetListsResult> {
    try {
        const result = await getBrevoLists(apiKey, limit, offset);
        return result;
    } catch (error: any) {
        console.error("Error in fetchBrevoListsAction:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}

/**
 * Server action to fetch contacts from a specific Brevo list.
 * @param listId - The ID of the Brevo list.
 * @param limit - The number of contacts to fetch.
 * @param offset - The offset for pagination.
 * @returns A promise resolving to the result of fetching contacts.
 */
export async function fetchBrevoContactsInListAction(
    apiKey: string,
    listId: number,
    limit: number = 50,
    offset: number = 0
): Promise<GetContactsInListResult> {
    if (!listId) {
        return { success: false, error: "List ID is required." };
    }
    try {
        const result = await getContactsFromBrevoList(apiKey, listId, limit, offset);
        return result;
    } catch (error: any) {
        console.error(`Error in fetchBrevoContactsInListAction for list ${listId}:`, error);
        return { success: false, error: error.message || `An unexpected error occurred for list ${listId}.` };
    }
}
