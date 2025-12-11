
'use server';
/**
 * @fileOverview A Genkit flow for suggesting trending topics for content creation.
 *
 * - getTrendingTopicSuggestions - Fetches trending topic ideas.
 * - GetTrendingTopicSuggestionsInput - Input type.
 * - GetTrendingTopicSuggestionsOutput - Return type.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

// Export types for external use
export type ContentCreationType = 'BlogPost' | 'YouTubeVideo';
export type PlanningHorizon = 'Daily' | 'Weekly' | 'Monthly';

// Internal Zod schema - NOT exported
const TrendingTopicSuggestionSchema = z.object({
  topic: z.string().describe('The suggested trending topic idea.'),
  reasoning: z.string().describe('A brief explanation of why this topic might be trending or relevant to the niche and content type.'),
  suggestedKeywords: z.array(z.string()).describe('A list of 3-5 related keywords for SEO or content focus.'),
  exampleTitles: z.array(z.string()).describe('2-3 example blog post or video titles for the suggested topic.'),
});

// Internal Zod schema - NOT exported
const GetTrendingTopicSuggestionsInputSchema = z.object({
  businessNiche: z.string().min(1).describe('The user\'s business niche or industry (e.g., "eco-friendly home goods", "gourmet coffee roasting", "productivity SaaS for freelancers").'),
  contentType: z.enum(['BlogPost', 'YouTubeVideo']).describe('The type of content for which topics are being suggested.'),
  planningHorizon: z.enum(['Daily', 'Weekly', 'Monthly']).describe('The time horizon for which the trend suggestions are relevant (Daily for very current, Weekly for broader, Monthly for more strategic/seasonal).'),
  targetRegion: z.string().optional().describe('The target geographic region or "Global" (e.g., "India", "USA", "UK", "Global"). This helps tailor regional trends if possible.'),
});
export type GetTrendingTopicSuggestionsInput = z.infer<typeof GetTrendingTopicSuggestionsInputSchema>;

// Internal Zod schema - NOT exported
const GetTrendingTopicSuggestionsOutputSchema = z.object({
  suggestions: z.array(TrendingTopicSuggestionSchema).describe('An array of 3-5 trending topic suggestions.'),
});
export type GetTrendingTopicSuggestionsOutput = z.infer<typeof GetTrendingTopicSuggestionsOutputSchema>;

// This is the only exported async function
export async function getTrendingTopicSuggestions(input: GetTrendingTopicSuggestionsInput): Promise<GetTrendingTopicSuggestionsOutput> {
  return getTrendingTopicSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTrendingTopicSuggestionsPrompt',
  input: { schema: GetTrendingTopicSuggestionsInputSchema }, // Use internal schema
  output: { schema: GetTrendingTopicSuggestionsOutputSchema }, // Use internal schema
  model: geminiModel,
  prompt: `You are a highly skilled Digital Marketing Strategist and Trend Analyst. Your task is to generate 3-5 trending content topic suggestions based on the user's inputs.
You should simulate having access to and synthesizing information from Google Trends, YouTube trending data, social media buzz, and general internet current events relevant to the specified region and niche.

User Inputs:
- Business Niche/Industry: {{{businessNiche}}}
- Content Type: {{{contentType}}}
- Planning Horizon: {{{planningHorizon}}}
- Target Region (Optional): {{{targetRegion}}}

Instructions for EACH of the 3-5 suggestions:
1.  **Topic:** Provide a concise and engaging topic idea.
2.  **Reasoning:** Briefly explain (1-2 sentences) *why* this topic is currently or potentially trending, or why it's particularly relevant to the user's niche, content type, and planning horizon. For 'Daily' horizon, focus on immediate, possibly news-related or very current micro-trends. For 'Weekly', consider broader themes popular over a week. For 'Monthly', suggest more strategic, seasonal, or evergreen topics that maintain interest over a longer period.
3.  **Suggested Keywords:** List 3-5 relevant keywords that could be targeted for SEO (if BlogPost) or as focus terms for the content.
4.  **Example Titles:** Provide 2-3 compelling and click-worthy example titles suitable for the specified '{{{contentType}}}'.

Contextual Considerations:
-   If '{{{targetRegion}}}' is provided, try to tailor suggestions to trends or interests prevalent in that region (e.g., local holidays, regional news if applicable, cultural nuances). If 'Global', aim for universally relevant trends.
-   Ensure suggestions are actionable and provide a good starting point for content creation.
-   If '{{{contentType}}}' is 'YouTubeVideo', the example titles should be suitable for videos. If 'BlogPost', they should be suitable for articles.

Example for a "Daily" suggestion for "Local Bakery" in "USA":
Topic: "The Rise of Sourdough Micro-Bakeries This Week"
Reasoning: "There's a noticeable uptick in online searches and social media mentions for 'sourdough' and 'local bakeries' in the US, indicating a current micro-trend."
Suggested Keywords: ["sourdough bread", "local bakery [city name]", "artisan bread", "freshly baked", "support local business"]
Example Titles:
    - Blog: "Why Everyone in [City Name] is Suddenly Obsessed with Sourdough (And Where to Find the Best!)"
    - Video: "Watch This Sourdough Loaf Get Made at [Your Bakery Name]! 🥖✨"
    - Video: "Taste Test: The Viral Sourdough from [Your Bakery Name] - Worth the Hype?"

Generate the suggestions now.
`,
});

// Internal Genkit flow definition
const getTrendingTopicSuggestionsFlow = ai.defineFlow(
  {
    name: 'getTrendingTopicSuggestionsFlow',
    inputSchema: GetTrendingTopicSuggestionsInputSchema,   // Use internal schema
    outputSchema: GetTrendingTopicSuggestionsOutputSchema, // Use internal schema
  },
  async (input: GetTrendingTopicSuggestionsInput): Promise<GetTrendingTopicSuggestionsOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.suggestions || output.suggestions.length === 0) {
      // Fallback if AI returns empty or invalid output
      return {
        suggestions: [{
          topic: "Content Generation Error",
          reasoning: "The AI was unable to generate topic suggestions at this time. Please try refining your niche or try again later.",
          suggestedKeywords: [],
          exampleTitles: ["AI Suggestion Failed - Please Retry"]
        }]
      };
    }
    return output;
  }
);
