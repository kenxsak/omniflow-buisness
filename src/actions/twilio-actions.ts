
'use server';

import { getTwilioMessages, type TwilioMessage, type GetMessagesResult } from '@/services/twilio';
import { subDays, formatISO } from 'date-fns';

export interface FetchTwilioMessagesActionResponse {
  success: boolean;
  messages?: TwilioMessage[];
  error?: string;
  nextPageUri?: string | null;
}

export interface FetchTwilioSmsSummaryActionResponse {
  success: boolean;
  smsSentLast7Days?: number;
  smsDeliveredLast7Days?: number;
  error?: string;
}

export async function fetchTwilioMessagesAction(
    accountSid: string,
    authToken: string,
    limit: number = 20,
    dateSentAfter?: string,
    dateSentBefore?: string,
    toPhoneNumber?: string,
    fromPhoneNumber?: string
): Promise<FetchTwilioMessagesActionResponse> {
  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio API credentials not provided." };
  }

  try {
    const result: GetMessagesResult = await getTwilioMessages(accountSid, authToken, limit, dateSentAfter, dateSentBefore, toPhoneNumber, fromPhoneNumber);
    if (result.success) {
      return { success: true, messages: result.messages, nextPageUri: result.nextPageUri };
    } else {
      return { success: false, error: result.error || "Failed to fetch messages from Twilio." };
    }
  } catch (error: any) {
    console.error("Error in fetchTwilioMessagesAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred while fetching messages." };
  }
}

export async function fetchTwilioSmsSummaryAction(accountSid: string, authToken: string): Promise<FetchTwilioSmsSummaryActionResponse> {
  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio API credentials not provided." };
  }

  try {
    const sevenDaysAgo = formatISO(subDays(new Date(), 7), { representation: 'date' });
    const result: GetMessagesResult = await getTwilioMessages(accountSid, authToken, 100, sevenDaysAgo);

    if (!result.success || !result.messages) {
      return { success: false, error: result.error || "Failed to fetch Twilio messages for summary." };
    }

    let smsSentLast7Days = 0;
    let smsDeliveredLast7Days = 0;

    result.messages.forEach(msg => {
      if (['sent', 'delivered', 'queued', 'accepted', 'scheduled', 'sending'].includes(msg.status.toLowerCase())) {
        smsSentLast7Days++;
      }
      if (msg.status.toLowerCase() === 'delivered') {
        smsDeliveredLast7Days++;
      }
    });

    return {
      success: true,
      smsSentLast7Days,
      smsDeliveredLast7Days,
    };
  } catch (error: any) {
    console.error("Error in fetchTwilioSmsSummaryAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred while fetching Twilio SMS summary." };
  }
}
