
'use server';
/**
 * @fileOverview A Genkit flow for sending SMS messages via Twilio.
 *
 * - sendTwilioSms - A function that handles sending an SMS.
 * - SendTwilioSmsInput - The input type for the sendTwilioSms function.
 * - SendTwilioSmsOutput - The return type for the sendTwilioSms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendSms as sendSmsViaTwilioService, type SendSmsResult as TwilioServiceOutput } from '@/services/twilio';

const SendTwilioSmsInputSchema = z.object({
  accountSid: z.string().describe("The Twilio Account SID from user settings."),
  authToken: z.string().describe("The Twilio Auth Token from user settings."),
  toPhoneNumber: z.string().describe('The recipient phone number, including country code e.g. +12223334444.'),
  messageBody: z.string().min(1).describe('The content of the SMS message.'),
  fromPhoneNumber: z.string().optional().describe('The Twilio phone number to send from. Can be configured in Settings.')
});
export type SendTwilioSmsInput = z.infer<typeof SendTwilioSmsInputSchema>;

const SendTwilioSmsOutputSchema = z.object({
  sid: z.string().optional(),
  status: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});
export type SendTwilioSmsOutput = z.infer<typeof SendTwilioSmsOutputSchema>;

export async function sendTwilioSms(input: SendTwilioSmsInput): Promise<SendTwilioSmsOutput> {
  return sendTwilioSmsFlow(input);
}

const sendTwilioSmsFlow = ai.defineFlow(
  {
    name: 'sendTwilioSmsFlow',
    inputSchema: SendTwilioSmsInputSchema,
    outputSchema: SendTwilioSmsOutputSchema,
  },
  async (input: SendTwilioSmsInput): Promise<SendTwilioSmsOutput> => {
    if (!input.fromPhoneNumber) {
        return { success: false, error: "Twilio 'From' phone number not provided in input. Please configure in Settings."};
    }
    
    const result: TwilioServiceOutput = await sendSmsViaTwilioService(
      input.accountSid,
      input.authToken,
      input.toPhoneNumber,
      input.fromPhoneNumber,
      input.messageBody
    );

    return {
        sid: result.sid,
        status: result.status,
        success: result.success,
        error: result.error
    };
  }
);
