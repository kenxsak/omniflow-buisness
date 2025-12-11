
'use server';
/**
 * @fileOverview A Genkit flow for generating WhatsApp message content using AI.
 *
 * - generateWhatsappMessage - A function that handles WhatsApp message generation.
 * - GenerateWhatsappMessageInput - The input type.
 * - GenerateWhatsappMessageOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateWhatsappMessageInputSchema = z.object({
  leadName: z.string().describe("The name of the lead to address in the message."),
  leadContext: z.string().describe('Brief context about the lead or reason for contact (e.g., "Follow up on website inquiry for Product X", "Post-demo feedback request").'),
  desiredOutcome: z.string().describe('The primary goal of the WhatsApp message (e.g., "Schedule a 15-min call", "Get feedback on demo", "Share a special offer link").'),
  senderBusinessName: z.string().optional().describe("The business name of the sender, to be included in the signature if desired.")
});
export type GenerateWhatsappMessageInput = z.infer<typeof GenerateWhatsappMessageInputSchema>;

const GenerateWhatsappMessageOutputSchema = z.object({
  suggestedMessage: z.string().describe('The AI-generated WhatsApp message, formatted with WhatsApp styling (e.g., *bold* for emphasis).'),
});
export type GenerateWhatsappMessageOutput = z.infer<typeof GenerateWhatsappMessageOutputSchema>;

export async function generateWhatsappMessage(input: GenerateWhatsappMessageInput): Promise<GenerateWhatsappMessageOutput> {
  return generateWhatsappMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhatsappMessagePrompt',
  input: { schema: GenerateWhatsappMessageInputSchema },
  output: { schema: GenerateWhatsappMessageOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  config: {
    maxOutputTokens: 400,
    temperature: 0.8,
  },
  prompt: `You are an expert messaging assistant helping a user draft a WhatsApp message to a lead.

**Instructions:**
1.  **Personalization:** Start the message by addressing the lead using their name: *{{{leadName}}}*. Use WhatsApp's asterisk syntax for bolding the name.
2.  **Contextual & Goal-Oriented:** Craft a message that naturally incorporates the '{{{leadContext}}}' and is aimed at achieving the '{{{desiredOutcome}}}'.
3.  **Tone:** Maintain a friendly, professional, and concise tone suitable for WhatsApp business communication.
4.  **Formatting:** 
    *   Use WhatsApp formatting for emphasis. Specifically, always bold the lead's name: *{{{leadName}}}*.
    *   Within the message body, use bolding (*text*) for key phrases, section introductions, or calls to action where it enhances readability and impact. Do not overuse bolding.
5.  **Conciseness:** Keep the message relatively short and to the point. WhatsApp messages are best when brief.
6.  **Call to Action:** If the '{{{desiredOutcome}}}' implies a direct call to action (e.g., scheduling a call), make it clear.
7.  **Signature:** 
    *   {{#if senderBusinessName}}End with a professional sign-off like "Best regards,\\n*{{{senderBusinessName}}}*" or "Thanks,\\n*{{{senderBusinessName}}}*". Ensure the '{{{senderBusinessName}}}' is bolded using asterisks.{{else}}End with a generic professional sign-off like "Best regards," or "Thanks,".{{/if}}

**Example with Sender Business Name:**
Lead Name: Priya
Lead Context: Follow up on website inquiry for OmniFlow Pro
Desired Outcome: Schedule a 15-min call to discuss needs
Sender Business Name: OmniSolutions

**Example AI Output (for suggestedMessage):**
"Hi *Priya*,

Thanks for your recent inquiry about OmniFlow Pro! I'd love to understand your needs better.

Would you be open to a quick *15-minute call* this week to discuss how OmniFlow Pro can help your business?

Best regards,
*OmniSolutions*"

**Example without Sender Business Name:**
Lead Name: John
Lead Context: Checking in after they downloaded our e-book on "Digital Marketing Trends"
Desired Outcome: See if they have any questions and offer further resources

**Example AI Output (for suggestedMessage):**
"Hi *John*,

Hope you're finding our e-book on *Digital Marketing Trends* insightful! 

Do you have any questions so far, or is there anything specific you're looking to achieve with digital marketing that I can help with?

Thanks,"

Generate the WhatsApp message content now.
`,
});

const generateWhatsappMessageFlow = ai.defineFlow(
  {
    name: 'generateWhatsappMessageFlow',
    inputSchema: GenerateWhatsappMessageInputSchema,
    outputSchema: GenerateWhatsappMessageOutputSchema,
  },
  async (input: GenerateWhatsappMessageInput): Promise<GenerateWhatsappMessageOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.suggestedMessage) {
      throw new Error("Failed to generate WhatsApp message content from AI.");
    }
    // Ensure the lead's name is bolded if somehow missed by AI, as a fallback
    let message = output.suggestedMessage;
    if (!message.includes(`*${input.leadName}*`)) {
        message = message.replace(input.leadName, `*${input.leadName}*`);
    }
    // Ensure sender business name is bolded if provided and AI missed it (less likely with updated prompt but good fallback)
    if (input.senderBusinessName && !message.includes(`*${input.senderBusinessName}*`) && message.includes(input.senderBusinessName)) {
        message = message.replace(input.senderBusinessName, `*${input.senderBusinessName}*`);
    }
    
    return { suggestedMessage: message };
  }
);
