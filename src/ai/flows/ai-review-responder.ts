
'use server';
/**
 * @fileOverview An AI agent for automatically responding to customer reviews.
 *
 * - aiReviewResponder - A function that handles the review response process.
 * - AiReviewResponderInput - The input type for the aiReviewResponder function.
 * - AiReviewResponderOutput - The return type for the aiReviewResponder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiReviewResponderInputSchema = z.object({
  reviewText: z.string().describe('The text of the customer review.'),
  sentiment: z.enum(['positive', 'negative', 'neutral']).describe('The sentiment of the review.'),
  businessName: z.string().describe('The name of the business receiving the review.'),
});
export type AiReviewResponderInput = z.infer<typeof AiReviewResponderInputSchema>;

const AiReviewResponderOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the customer review.'),
});
export type AiReviewResponderOutput = z.infer<typeof AiReviewResponderOutputSchema>;

export async function aiReviewResponder(input: AiReviewResponderInput): Promise<AiReviewResponderOutput> {
  return aiReviewResponderFlow(input);
}

const prompt = ai.definePrompt({
    name: 'aiReviewResponderPrompt',
    input: {schema: AiReviewResponderInputSchema},
    output: {schema: AiReviewResponderOutputSchema},
    model: 'googleai/gemini-2.0-flash',
  prompt: `You are a customer service representative for {{businessName}}. You are responding to a customer review.

The review is: {{reviewText}}

The sentiment of the review is: {{sentiment}}

Write a response that is appropriate for the sentiment of the review. Be polite and professional.

If the review is positive, thank the customer for their review.
If the review is negative, apologize for the customer's experience and offer to make things right.
If the review is neutral, acknowledge the customer's review and offer further assistance if needed.
`,
});

const aiReviewResponderFlow = ai.defineFlow(
  {
    name: 'aiReviewResponderFlow',
    inputSchema: AiReviewResponderInputSchema,
    outputSchema: AiReviewResponderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
