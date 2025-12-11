
'use server';

import { getBitrix24Contacts, type GetBitrix24ContactsResult } from '@/services/bitrix24';

export interface FetchBitrix24ContactsActionResponse extends GetBitrix24ContactsResult {}

export async function fetchBitrix24ContactsAction(
    webhookUrl: string, // Action now requires the full webhook URL
    limit: number = 10,
    start: number = 0
): Promise<FetchBitrix24ContactsActionResponse> {

     if (!webhookUrl) {
         return { success: false, error: "Bitrix24 Webhook URL is missing." };
     }

    try {
        const result: GetBitrix24ContactsResult = await getBitrix24Contacts(webhookUrl, limit, start);
        return result;
    } catch (error: any) {
        console.error("Error in fetchBitrix24ContactsAction:", error);
        return { success: false, error: error.message || "An unexpected error occurred while fetching Bitrix24 contacts." };
    }
}

// Add other actions corresponding to Bitrix24 service functions as needed.
