
'use server';
/**
 * @fileOverview A Genkit flow for generating email subject line suggestions.
 *
 * - generateSubjectLines - Generates email subject line suggestions.
 * - GenerateSubjectLineInput - Input type.
 * - GenerateSubjectLineOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSubjectLineInputSchema = z.object({
  emailTopic: z.string().min(1).describe('The main topic or purpose of the email (e.g., "New product launch," "Weekly newsletter," "Special discount offer").'),
  targetAudience: z.string().optional().describe('A brief description of the intended recipients (e.g., "Existing customers," "Tech enthusiasts," "Busy professionals").'),
  desiredTone: z.enum(['Professional', 'Friendly', 'Urgent', 'Playful', 'Intriguing', 'Benefit-driven']).optional().describe('The desired tone or style for the subject lines.'),
  numSuggestions: z.number().min(1).max(5).optional().default(3).describe('Number of subject line suggestions to generate (1-5).'),
});
export type GenerateSubjectLineInput = z.infer<typeof GenerateSubjectLineInputSchema>;

const GenerateSubjectLineOutputSchema = z.object({
  subjectLineSuggestions: z.array(z.string()).describe('An array of AI-generated email subject line suggestions.'),
});
export type GenerateSubjectLineOutput = z.infer<typeof GenerateSubjectLineOutputSchema>;

export async function generateSubjectLines(input: GenerateSubjectLineInput): Promise<GenerateSubjectLineOutput> {
  return generateSubjectLinesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubjectLinesPrompt',
  input: { schema: GenerateSubjectLineInputSchema },
  output: { schema: GenerateSubjectLineOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert email copywriter specializing in crafting high-converting subject lines.
Generate {{{numSuggestions}}} compelling and concise email subject line suggestions based on the following inputs:

- **Email Topic/Purpose:** {{{emailTopic}}}
{{#if targetAudience}}- **Target Audience:** {{{targetAudience}}}{{/if}}
{{#if desiredTone}}- **Desired Tone:** {{{desiredTone}}}{{/if}}

**Instructions for Subject Lines:**
- Keep them short and impactful, ideally under 50-60 characters.
- Use emojis appropriately if they fit the tone and topic.
- Create a sense of urgency or curiosity where applicable.
- Highlight benefits or key information if relevant.
- Ensure variety in the suggestions.

Provide ONLY the array of subject line suggestions.
`,
});

const generateSubjectLinesFlow = ai.defineFlow(
  {
    name: 'generateSubjectLinesFlow',
    inputSchema: GenerateSubjectLineInputSchema,
    outputSchema: GenerateSubjectLineOutputSchema,
  },
  async (input: GenerateSubjectLineInput): Promise<GenerateSubjectLineOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.subjectLineSuggestions || output.subjectLineSuggestions.length === 0) {
      // Fallback if AI returns empty or invalid output
      return {
        subjectLineSuggestions: ["Failed to generate suggestions. Please try again."]
      };
    }
    return output;
  }
);
