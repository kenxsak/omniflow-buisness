
'use server';
/**
 * @fileOverview A Genkit flow for generating concise SMS message content using AI.
 *
 * - generateSmsContent - A function that handles SMS content generation.
 * - GenerateSmsContentInput - The input type.
 * - GenerateSmsContentOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSmsContentInputSchema = z.object({
  recipientName: z.string().optional().describe("The name of the recipient (optional, for personalization if AI chooses to use it)."),
  messageContext: z.string().min(1).describe('Brief context or purpose of the SMS (e.g., "Appointment reminder", "Special offer heads-up", "Quick follow-up").'),
  desiredOutcome: z.string().min(1).describe('What the sender wants the recipient to do or know (e.g., "Confirm appointment", "Visit website for offer", "Know we tried to reach them").'),
  businessName: z.string().optional().describe("The sender's business name, if it should be mentioned.")
});
export type GenerateSmsContentInput = z.infer<typeof GenerateSmsContentInputSchema>;

const GenerateSmsContentOutputSchema = z.object({
  suggestedSmsBody: z.string().describe('The AI-generated SMS message, concise and under 160 characters if possible.'),
});
export type GenerateSmsContentOutput = z.infer<typeof GenerateSmsContentOutputSchema>;

export async function generateSmsContent(input: GenerateSmsContentInput): Promise<GenerateSmsContentOutput> {
  return generateSmsContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSmsContentPrompt',
  input: { schema: GenerateSmsContentInputSchema },
  output: { schema: GenerateSmsContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  config: {
    maxOutputTokens: 200,
    temperature: 0.7,
  },
  prompt: `You are an expert SMS copywriter. Your task is to draft a concise and effective SMS message.

**Instructions:**
1.  **Brevity is Key:** Aim for under 160 characters. SMS messages are short.
2.  **Clarity:** The message must be clear and easy to understand.
3.  **Action-Oriented (if applicable):** If the '{{{desiredOutcome}}}' implies an action, make it clear.
4.  **Professional & Friendly Tone:** Maintain a polite tone. Avoid slang or overly casual language unless the context strongly suggests it.
5.  **Personalization (Optional):** {{#if recipientName}}You may use the recipient's name '{{{recipientName}}}' if it fits naturally and briefly. Often, SMS messages skip direct address.{{/if}}
6.  **Business Name (Optional):** {{#if businessName}}If provided, you can incorporate the business name '{{{businessName}}}' if it's essential for context (e.g., for an appointment reminder).{{/if}}
7.  **No Chatty Fillers:** Get straight to the point.

**Message Details:**
- Recipient Name (Optional): {{{recipientName}}}
- Context/Purpose: {{{messageContext}}}
- Desired Outcome: {{{desiredOutcome}}}
- Business Name (Optional): {{{businessName}}}

Generate ONLY the SMS message body.
Example:
Context: "Appointment reminder"
Outcome: "Confirm appointment"
Recipient: "Jane"
Business Name: "DentalCare"
SuggestedSmsBody: "Hi Jane, your DentalCare appt is tomorrow at 10 AM. Reply YES to confirm or call us to reschedule."
`,
});

const generateSmsContentFlow = ai.defineFlow(
  {
    name: 'generateSmsContentFlow',
    inputSchema: GenerateSmsContentInputSchema,
    outputSchema: GenerateSmsContentOutputSchema,
  },
  async (input: GenerateSmsContentInput): Promise<GenerateSmsContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.suggestedSmsBody) {
      throw new Error("Failed to generate SMS content from AI.");
    }
    // Ensure it's concise as a fallback, though the prompt aims for this
    return { suggestedSmsBody: output.suggestedSmsBody.slice(0, 240) }; // Slightly more than 160 for some flexibility
  }
);
