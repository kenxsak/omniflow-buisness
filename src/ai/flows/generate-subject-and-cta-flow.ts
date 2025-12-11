
'use server';
/**
 * @fileOverview A Genkit flow for generating both email subject line and call-to-action (CTA) suggestions.
 *
 * - generateSubjectAndCtas - Generates subject line and CTA suggestions.
 * - GenerateSubjectAndCtaInput - Input type.
 * - GenerateSubjectAndCtaOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSubjectAndCtaInputSchema = z.object({
  campaignTopicOrGoal: z.string().min(1).describe('The main topic, purpose, or goal of the email campaign (e.g., "New product launch," "Weekly newsletter," "Drive demo requests").'),
  targetAudience: z.string().optional().describe('A brief description of the intended recipients (e.g., "Existing customers," "Tech enthusiasts," "Busy professionals").'),
  desiredToneForSubject: z.enum(['Professional', 'Friendly', 'Urgent', 'Playful', 'Intriguing', 'Benefit-driven']).optional().describe('The desired tone or style for the subject lines.'),
  desiredToneForCta: z.enum(['Urgent', 'Benefit-driven', 'Clear & Direct', 'Playful', 'Intriguing', 'Reassuring']).optional().describe('The desired tone or style for the CTAs.'),
  numSuggestions: z.number().min(1).max(5).optional().default(3).describe('Number of suggestions to generate for both subject lines and CTAs (1-5).'),
});
export type GenerateSubjectAndCtaInput = z.infer<typeof GenerateSubjectAndCtaInputSchema>;

const GenerateSubjectAndCtaOutputSchema = z.object({
  subjectLineSuggestions: z.array(z.string()).describe('An array of AI-generated email subject line suggestions.'),
  ctaSuggestions: z.array(z.string()).describe('An array of AI-generated call-to-action suggestions.'),
});
export type GenerateSubjectAndCtaOutput = z.infer<typeof GenerateSubjectAndCtaOutputSchema>;

export async function generateSubjectAndCtas(input: GenerateSubjectAndCtaInput): Promise<GenerateSubjectAndCtaOutput> {
  return generateSubjectAndCtasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubjectAndCtasPrompt',
  input: { schema: GenerateSubjectAndCtaInputSchema },
  output: { schema: GenerateSubjectAndCtaOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  config: {
    maxOutputTokens: 500,
    temperature: 0.9,
  },
  prompt: `You are an expert email copywriter and conversion strategist.
Generate {{{numSuggestions}}} compelling email subject lines AND {{{numSuggestions}}} compelling call-to-action (CTA) phrases based on the following inputs:

- **Campaign Topic/Goal:** {{{campaignTopicOrGoal}}}
{{#if targetAudience}}- **Target Audience:** {{{targetAudience}}}{{/if}}
{{#if desiredToneForSubject}}- **Desired Tone for Subject Lines:** {{{desiredToneForSubject}}}{{/if}}
{{#if desiredToneForCta}}- **Desired Tone for CTAs:** {{{desiredToneForCta}}}{{/if}}

**Instructions for Subject Lines:**
- Keep them short and impactful, ideally under 50-60 characters.
- Use emojis appropriately if they fit the tone and topic for subjects.
- Create a sense of urgency or curiosity where applicable.
- Highlight benefits or key information if relevant.
- Ensure variety in the subject line suggestions.

**Instructions for CTAs:**
- Be clear, concise, and action-oriented.
- Use strong verbs.
- Create a sense of urgency or benefit where appropriate for the CTA goal and tone.
- Typically, CTAs are short (2-5 words).
- Ensure variety in the CTA suggestions.

Provide ONLY the JSON object with two arrays: 'subjectLineSuggestions' and 'ctaSuggestions'.
Example structure:
{
  "subjectLineSuggestions": ["Subject 1", "Subject 2", "Subject 3"],
  "ctaSuggestions": ["CTA 1", "CTA 2", "CTA 3"]
}
`,
});

const generateSubjectAndCtasFlow = ai.defineFlow(
  {
    name: 'generateSubjectAndCtasFlow',
    inputSchema: GenerateSubjectAndCtaInputSchema,
    outputSchema: GenerateSubjectAndCtaOutputSchema,
  },
  async (input: GenerateSubjectAndCtaInput): Promise<GenerateSubjectAndCtaOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.subjectLineSuggestions || !output.ctaSuggestions) {
      // Fallback if AI returns empty or invalid output
      return {
        subjectLineSuggestions: ["Failed to generate subject line suggestions. Please try again."],
        ctaSuggestions: ["Failed to generate CTA suggestions. Please try again."]
      };
    }
    return output;
  }
);
