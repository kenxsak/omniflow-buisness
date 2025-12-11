
'use server';
/**
 * @fileOverview A Genkit flow for generating call-to-action (CTA) suggestions.
 *
 * - generateCtas - Generates CTA suggestions.
 * - GenerateCtaInput - Input type.
 * - GenerateCtaOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCtaInputSchema = z.object({
  ctaGoal: z.string().min(1).describe('The primary goal of the call-to-action (e.g., "Increase newsletter sign-ups," "Drive product page views," "Encourage demo requests").'),
  targetAudience: z.string().optional().describe('A brief description of the intended audience for the CTA (e.g., "New visitors," "Engaged users," "Marketing professionals").'),
  desiredTone: z.enum(['Urgent', 'Benefit-driven', 'Clear & Direct', 'Playful', 'Intriguing', 'Reassuring']).optional().describe('The desired tone or style for the CTAs.'),
  numSuggestions: z.number().min(1).max(5).optional().default(3).describe('Number of CTA suggestions to generate (1-5).'),
});
export type GenerateCtaInput = z.infer<typeof GenerateCtaInputSchema>;

const GenerateCtaOutputSchema = z.object({
  ctaSuggestions: z.array(z.string()).describe('An array of AI-generated call-to-action suggestions.'),
});
export type GenerateCtaOutput = z.infer<typeof GenerateCtaOutputSchema>;

export async function generateCtas(input: GenerateCtaInput): Promise<GenerateCtaOutput> {
  return generateCtasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCtasPrompt',
  input: { schema: GenerateCtaInputSchema },
  output: { schema: GenerateCtaOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert conversion copywriter specializing in crafting high-impact call-to-actions (CTAs).
Generate {{{numSuggestions}}} compelling and concise CTA suggestions based on the following inputs:

- **CTA Goal:** {{{ctaGoal}}}
{{#if targetAudience}}- **Target Audience:** {{{targetAudience}}}{{/if}}
{{#if desiredTone}}- **Desired Tone:** {{{desiredTone}}}{{/if}}

**Instructions for CTAs:**
- Be clear, concise, and action-oriented.
- Use strong verbs.
- Create a sense of urgency or benefit where appropriate for the goal and tone.
- Typically, CTAs are short (2-5 words).
- Provide variety in the suggestions.

Provide ONLY the array of CTA suggestions.
`,
});

const generateCtasFlow = ai.defineFlow(
  {
    name: 'generateCtasFlow',
    inputSchema: GenerateCtaInputSchema,
    outputSchema: GenerateCtaOutputSchema,
  },
  async (input: GenerateCtaInput): Promise<GenerateCtaOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.ctaSuggestions || output.ctaSuggestions.length === 0) {
      // Fallback if AI returns empty or invalid output
      return {
        ctaSuggestions: ["Failed to generate CTA suggestions. Please try again."]
      };
    }
    return output;
  }
);
