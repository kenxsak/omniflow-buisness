
'use server';
/**
 * @fileOverview A Genkit flow for generating hashtag suggestions.
 *
 * - generateHashtagSuggestions - Generates hashtag suggestions.
 * - GenerateHashtagSuggestionsInput - Input type.
 * - GenerateHashtagSuggestionsOutput - Return type.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateHashtagSuggestionsInputSchema = z.object({
  topicOrKeywords: z.string().min(1).describe('The main topic, theme, or keywords for the content (e.g., "Sustainable fashion tips," "AI in marketing," "Healthy recipes").'),
  platform: z.enum(['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'General']).optional().describe('The target social media platform (optional, helps tailor hashtag type and count).'),
  numSuggestions: z.number().min(3).max(20).optional().default(10).describe('Number of hashtag suggestions to generate (3-20).'),
});
export type GenerateHashtagSuggestionsInput = z.infer<typeof GenerateHashtagSuggestionsInputSchema>;

const GenerateHashtagSuggestionsOutputSchema = z.object({
  hashtagSuggestions: z.array(z.string()).describe('An array of AI-generated hashtag suggestions.'), // Removed .startsWith('#')
});
export type GenerateHashtagSuggestionsOutput = z.infer<typeof GenerateHashtagSuggestionsOutputSchema>;

export async function generateHashtagSuggestions(input: GenerateHashtagSuggestionsInput): Promise<GenerateHashtagSuggestionsOutput> {
  return generateHashtagSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHashtagSuggestionsPrompt',
  input: { schema: GenerateHashtagSuggestionsInputSchema },
  output: { schema: GenerateHashtagSuggestionsOutputSchema },
  model: geminiModel,
  prompt: `You are a social media marketing expert specializing in hashtag strategy.
Generate {{{numSuggestions}}} relevant and effective hashtag suggestions based on the following inputs:

- **Topic/Keywords:** {{{topicOrKeywords}}}
{{#if platform}}- **Target Platform:** {{{platform}}} (Consider typical hashtag usage and limits for this platform. E.g., Instagram allows up to 30, Twitter/X fewer, LinkedIn more professional.) {{else}}- **Target Platform:** General (provide a balanced mix suitable for multiple platforms).{{/if}}

**Instructions for Hashtags:**
- Each hashtag MUST start with the '#' symbol.
- Provide a mix of:
    - Broad/Popular hashtags (high reach, more competition).
    - Niche-specific hashtags (targeted audience, less competition).
    - Community-focused hashtags (if applicable to the topic).
    - Consider keyword variations and long-tail hashtags.
- Avoid overly generic single-word hashtags unless they are highly relevant and popular (e.g., #marketing).
- Ensure variety in the suggestions.
- Do NOT include spaces within a single hashtag.

Provide ONLY the array of hashtag suggestions. Each string in the array should be a single valid hashtag starting with '#'.
Example output for topic "AI in marketing" and platform "LinkedIn":
{ "hashtagSuggestions": ["#AIMarketing", "#ArtificialIntelligence", "#DigitalMarketing", "#MarTech", "#TechInnovation", "#FutureOfMarketing", "#LinkedInMarketing", "#BusinessGrowth", "#AIStrategy", "#MarketingAutomation"] }
`,
});

const generateHashtagSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateHashtagSuggestionsFlow',
    inputSchema: GenerateHashtagSuggestionsInputSchema,
    outputSchema: GenerateHashtagSuggestionsOutputSchema,
  },
  async (input: GenerateHashtagSuggestionsInput): Promise<GenerateHashtagSuggestionsOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.hashtagSuggestions || output.hashtagSuggestions.length === 0) {
      return {
        hashtagSuggestions: ["#ErrorGeneratingSuggestions"]
      };
    }
    // Ensure all suggestions start with #, as LLMs can sometimes miss this instruction
    const correctedSuggestions = output.hashtagSuggestions.map(tag => tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`);
    return { hashtagSuggestions: correctedSuggestions };
  }
);
