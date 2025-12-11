
'use server';

/**
 * @fileOverview Service functions for interacting with the Twilio API.
 * This file handles the direct communication with Twilio's REST API.
 * It reads credentials (Account SID, Auth Token) passed as arguments.
 */

export interface SendSmsResult {
  sid?: string;
  status?: string;
  success: boolean;
  error?: string;
}

export interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: 'queued' | 'failed' | 'sent' | 'delivered' | 'undelivered' | string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply' | string;
  dateSent: string;
  price?: string;
  priceUnit?: string;
  errorCode?: number | null;
  errorMessage?: string | null;
}

export interface GetMessagesResult {
  messages?: TwilioMessage[];
  success: boolean;
  error?: string;
  nextPageUri?: string | null;
}

export async function sendSms(
  accountSid: string,
  authToken: string,
  to: string,
  fromPhoneNumber: string,
  body: string
): Promise<SendSmsResult> {
  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio API credentials not provided.' };
  }
  if (!fromPhoneNumber) {
    return { success: false, error: 'Twilio "From" phone number is required.' };
  }

  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromPhoneNumber, Body: body });
  const basicAuth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Twilio API Error (sendSms):', responseData);
      return { success: false, error: responseData.message || `Failed to send SMS via Twilio (Status: ${response.status})` };
    }
    
    return { sid: responseData.sid, status: responseData.status, success: true };
  } catch (error: any) {
    console.error('Error sending SMS via Twilio:', error);
    return { success: false, error: error.message || 'Network error or other issue sending SMS.' };
  }
}

export async function getTwilioMessages(
    accountSid: string,
    authToken: string,
    limit: number = 20,
    dateSentAfter?: string,
    dateSentBefore?: string,
    toPhoneNumber?: string,
    fromPhoneNumber?: string
): Promise<GetMessagesResult> {
    if (!accountSid || !authToken) {
        return { success: false, error: 'Twilio API credentials not provided.' };
    }

    const queryParams = new URLSearchParams({ PageSize: limit.toString() });

    if (dateSentAfter) queryParams.append('DateSent>=', dateSentAfter);
    if (dateSentBefore) queryParams.append('DateSent<=', dateSentBefore);
    if (toPhoneNumber) queryParams.append('To', toPhoneNumber);
    if (fromPhoneNumber) queryParams.append('From', fromPhoneNumber);

    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?${queryParams.toString()}`;
    const basicAuth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
        const response = await fetch(twilioApiUrl, {
            method: 'GET',
            headers: { 'Authorization': basicAuth, 'Accept': 'application/json' },
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error('Twilio API Error (getTwilioMessages):', responseData);
            return { success: false, error: responseData.message || `Failed to fetch messages from Twilio (Status: ${response.status})` };
        }
        
        const messages: TwilioMessage[] = responseData.messages.map((msg: any) => ({
            sid: msg.sid,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            status: msg.status,
            direction: msg.direction,
            dateSent: msg.date_sent,
            price: msg.price,
            priceUnit: msg.price_unit,
            errorCode: msg.error_code,
            errorMessage: msg.error_message,
        }));

        return { success: true, messages: messages, nextPageUri: responseData.next_page_uri };
    } catch (error: any) {
        console.error('Error fetching Twilio messages:', error);
        return { success: false, error: error.message || 'Network error or other issue fetching messages.' };
    }
}
