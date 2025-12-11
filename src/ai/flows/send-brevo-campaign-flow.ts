
'use server';
/**
 * @fileOverview A Genkit flow for creating and sending an email campaign via Brevo.
 *
 * - sendBrevoCampaign - A function that handles campaign creation and sending.
 * - SendBrevoCampaignInput - The input type.
 * - SendBrevoCampaignOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
    createBrevoEmailCampaign, 
    sendBrevoEmailCampaignNow,
    type BrevoCampaignCreationPayload,
    type CreateCampaignResult,
    type SendCampaignResult 
} from '@/services/brevo';

const SendBrevoCampaignInputSchema = z.object({
  apiKey: z.string().describe("The user's Brevo API key."),
  campaignName: z.string().describe('The internal name for the campaign.'),
  subject: z.string().describe('The subject line of the email campaign.'),
  htmlContent: z.string().describe('The HTML content of the email.'),
  senderName: z.string().describe('The name of the sender.'),
  senderEmail: z.string().email().describe('The email address of the sender (must be validated in Brevo).'),
  brevoListIds: z.array(z.number()).min(1).describe('Array of Brevo List IDs to send the campaign to.'),
  tag: z.string().optional().describe('A tag for the campaign in Brevo (optional).'),
});
export type SendBrevoCampaignInput = z.infer<typeof SendBrevoCampaignInputSchema>;

const SendBrevoCampaignOutputSchema = z.object({
  brevoCampaignId: z.number().optional(),
  success: z.boolean(),
  message: z.string().optional(), // Combined message for creation and send status
});
export type SendBrevoCampaignOutput = z.infer<typeof SendBrevoCampaignOutputSchema>;

export async function sendBrevoCampaign(input: SendBrevoCampaignInput): Promise<SendBrevoCampaignOutput> {
  return sendBrevoCampaignFlow(input);
}

const sendBrevoCampaignFlow = ai.defineFlow(
  {
    name: 'sendBrevoCampaignFlow',
    inputSchema: SendBrevoCampaignInputSchema,
    outputSchema: SendBrevoCampaignOutputSchema,
  },
  async (input: SendBrevoCampaignInput): Promise<SendBrevoCampaignOutput> => {
    const campaignPayload: BrevoCampaignCreationPayload = {
      name: input.campaignName,
      subject: input.subject,
      htmlContent: input.htmlContent,
      sender: { name: input.senderName, email: input.senderEmail },
      recipients: { listIds: input.brevoListIds },
      type: 'classic', // Standard email campaign
      tag: input.tag,
    };

    // Step 1: Create the campaign in Brevo
    const createResult: CreateCampaignResult = await createBrevoEmailCampaign(input.apiKey, campaignPayload);

    if (!createResult.success || !createResult.id) {
      return { 
        success: false, 
        message: `Failed to create campaign in Brevo: ${createResult.error || 'Unknown error'}` 
      };
    }

    const brevoCampaignId = createResult.id;

    // Step 2: Send the newly created campaign
    const sendResult: SendCampaignResult = await sendBrevoEmailCampaignNow(input.apiKey, brevoCampaignId);

    if (!sendResult.success) {
      return {
        brevoCampaignId: brevoCampaignId,
        success: false,
        message: `Campaign created (ID: ${brevoCampaignId}), but failed to send: ${sendResult.error || 'Unknown error'}`
      };
    }

    return {
      brevoCampaignId: brevoCampaignId,
      success: true,
      message: `Campaign (ID: ${brevoCampaignId}) created and scheduled for sending via Brevo.`
    };
  }
);
