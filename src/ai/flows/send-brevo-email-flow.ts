
'use server';
/**
 * @fileOverview A Genkit flow for sending transactional emails via Brevo.
 *
 * - sendBrevoEmail - A function that handles sending an email.
 * - SendBrevoEmailInput - The input type for the sendBrevoEmail function.
 * - SendBrevoEmailOutput - The return type for the sendBrevoEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTransactionalEmail as sendEmailViaBrevoService, type SendTransactionalEmailResult as BrevoServiceOutput } from '@/services/brevo';

const SendBrevoEmailInputSchema = z.object({
  apiKey: z.string().describe("The user's Brevo API key."),
  senderEmail: z.string().email().describe('The email address of the sender.'),
  senderName: z.string().describe('The name of the sender.'),
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  recipientName: z.string().describe('The name of the recipient.'),
  subject: z.string().describe('The subject of the email.'),
  htmlContent: z.string().describe('The HTML content of the email.'),
});
export type SendBrevoEmailInput = z.infer<typeof SendBrevoEmailInputSchema>;

const SendBrevoEmailOutputSchema = z.object({
  messageId: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});
export type SendBrevoEmailOutput = z.infer<typeof SendBrevoEmailOutputSchema>;


export async function sendBrevoEmail(input: SendBrevoEmailInput): Promise<SendBrevoEmailOutput> {
  return sendBrevoEmailFlow(input);
}

const sendBrevoEmailFlow = ai.defineFlow(
  {
    name: 'sendBrevoEmailFlow',
    inputSchema: SendBrevoEmailInputSchema,
    outputSchema: SendBrevoEmailOutputSchema,
  },
  async (input: SendBrevoEmailInput): Promise<SendBrevoEmailOutput> => {
    const result: BrevoServiceOutput = await sendEmailViaBrevoService(
      input.apiKey,
      input.senderEmail,
      input.senderName,
      input.recipientEmail,
      input.recipientName,
      input.subject,
      input.htmlContent
    );
    return {
        messageId: result.messageId,
        success: result.success,
        error: result.error
    };
  }
);
