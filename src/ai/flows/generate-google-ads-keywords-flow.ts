
'use server';
/**
 * @fileOverview A Genkit flow for generating Google Ads keyword suggestions,
 * including AI-estimated competition and CPC ranges.
 *
 * - generateGoogleAdsKeywords - Generates keyword suggestions.
 * - GenerateGoogleAdsKeywordsInput - Input type.
 * - GenerateGoogleAdsKeywordsOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const KeywordDetailSchema = z.object({
  keyword: z.string().describe('The suggested keyword phrase.'),
  estimatedCompetition: z.string().optional().describe("AI's qualitative estimate of competition (e.g., Low, Medium, High). THIS IS AN ESTIMATE, NOT LIVE DATA FROM GOOGLE."),
  estimatedCpcRange: z.string().optional().describe("AI's estimated CPC range, using the specified targetCurrency (e.g., $0.50-$2.00, ₹10-₹50). THIS IS AN ESTIMATE, NOT LIVE DATA FROM GOOGLE."),
});
export type KeywordDetail = z.infer<typeof KeywordDetailSchema>;

const GenerateGoogleAdsKeywordsInputSchema = z.object({
  productOrService: z.string().min(1).describe('The product or service being advertised.'),
  targetAudience: z.string().optional().describe('A brief description of the target audience.'),
  landingPageUrl: z.string().url().optional().describe('URL of the landing page for context (optional).'),
  campaignGoals: z.string().optional().describe('Primary goals of the ad campaign (e.g., "drive sales", "generate leads").'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the keyword suggestions and linguistic context (e.g., "Spanish", "Hindi"). Default is English.'),
  targetCurrency: z.string().optional().default('USD').describe('The desired currency for CPC estimations (e.g., "USD", "EUR", "INR"). Default is USD.'),
  numSuggestionsPerCategory: z.number().min(3).max(15).optional().default(7).describe('Approximate number of keyword suggestions per category (3-15).'),
});
export type GenerateGoogleAdsKeywordsInput = z.infer<typeof GenerateGoogleAdsKeywordsInputSchema>;

const KeywordSuggestionsSchema = z.object({
  primaryKeywords: z.array(KeywordDetailSchema).describe('Core keywords directly related to the product/service, with AI estimates for competition and CPC.'),
  longTailKeywords: z.array(KeywordDetailSchema).describe('More specific, longer phrase keywords, with AI estimates for competition and CPC.'),
  relatedKeywords: z.array(KeywordDetailSchema).describe('Keywords for related concepts or complementary products/services, with AI estimates for competition and CPC.'),
  negativeKeywordIdeas: z.array(z.string()).describe('Terms to consider excluding to avoid irrelevant impressions/clicks (no CPC/competition for these).'),
});

const GenerateGoogleAdsKeywordsOutputSchema = z.object({
  keywordSuggestions: KeywordSuggestionsSchema.describe('Categorized keyword suggestions for Google Ads.'),
});
export type GenerateGoogleAdsKeywordsOutput = z.infer<typeof GenerateGoogleAdsKeywordsOutputSchema>;

export async function generateGoogleAdsKeywords(input: GenerateGoogleAdsKeywordsInput): Promise<GenerateGoogleAdsKeywordsOutput> {
  return generateGoogleAdsKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGoogleAdsKeywordsPrompt',
  input: { schema: GenerateGoogleAdsKeywordsInputSchema },
  output: { schema: GenerateGoogleAdsKeywordsOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert Google Ads Keyword Strategist.
Your task is to generate comprehensive and relevant keyword suggestions for a Google Ads campaign.
The keywords themselves should be in the '{{{targetLanguage}}}'.
For each keyword in 'primaryKeywords', 'longTailKeywords', and 'relatedKeywords', you MUST provide:
1.  'keyword': The keyword phrase itself in '{{{targetLanguage}}}'.
2.  'estimatedCompetition': Your AI-based qualitative estimate of competition (Low, Medium, High). IMPORTANT: State clearly this is an estimate, not live Google data.
3.  'estimatedCpcRange': Your AI-based estimated CPC range. You MUST use the currency symbol corresponding to the provided '{{{targetCurrency}}}' (e.g., use '$' if '{{{targetCurrency}}}' is 'USD', '€' if 'EUR', '₹' if 'INR', '£' if 'GBP', '¥' if 'JPY', 'A$' if 'AUD', 'C$' if 'CAD'). Provide the range in that currency. IMPORTANT: State clearly this is an estimate, not live Google data.

User Inputs:
- Product/Service: {{{productOrService}}}
{{#if targetAudience}}- Target Audience: {{{targetAudience}}}{{/if}}
{{#if landingPageUrl}}- Landing Page URL (for context): {{{landingPageUrl}}}{{/if}}
{{#if campaignGoals}}- Campaign Goals: {{{campaignGoals}}}{{/if}}
- Target Language for Keywords: {{{targetLanguage}}}
- Target Currency for CPC: {{{targetCurrency}}}
- Number of suggestions per category: Aim for around {{{numSuggestionsPerCategory}}}

Generate keyword suggestions categorized as follows:
1.  **primaryKeywords:** (Array of objects: {keyword, estimatedCompetition, estimatedCpcRange}) Direct and essential terms.
2.  **longTailKeywords:** (Array of objects: {keyword, estimatedCompetition, estimatedCpcRange}) Longer, specific phrases.
3.  **relatedKeywords:** (Array of objects: {keyword, estimatedCompetition, estimatedCpcRange}) Related concepts or complementary products/services.
4.  **negativeKeywordIdeas:** (Array of strings) Terms to exclude. These do NOT need competition/CPC estimates.

**CRITICAL REMINDER:** The 'estimatedCompetition' and 'estimatedCpcRange' are YOUR AI ESTIMATES based on general knowledge. They are NOT live data from Google Ads. Prefix your descriptions for these fields in the Zod schema with this disclaimer.

Consider different search intents. Provide a diverse list.
Example for a 'primaryKeyword' item if targetCurrency is 'INR' and targetLanguage is 'English':
{ "keyword": "eco yoga mat", "estimatedCompetition": "Medium", "estimatedCpcRange": "₹70-₹180" }
Example for a 'primaryKeyword' item if targetCurrency is 'USD' and targetLanguage is 'English':
{ "keyword": "eco yoga mat", "estimatedCompetition": "Medium", "estimatedCpcRange": "$1.00-$2.50" }

Provide ONLY the JSON object with the 'keywordSuggestions' structure containing the four arrays as defined.
`,
});

const generateGoogleAdsKeywordsFlow = ai.defineFlow(
  {
    name: 'generateGoogleAdsKeywordsFlow',
    inputSchema: GenerateGoogleAdsKeywordsInputSchema,
    outputSchema: GenerateGoogleAdsKeywordsOutputSchema,
  },
  async (input: GenerateGoogleAdsKeywordsInput): Promise<GenerateGoogleAdsKeywordsOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.keywordSuggestions) {
      // Fallback if AI returns empty or invalid output
      return {
        keywordSuggestions: {
          primaryKeywords: [{ keyword: "Error: Could not generate primary keywords." }],
          longTailKeywords: [{ keyword: "Error: Could not generate long-tail keywords." }],
          relatedKeywords: [{ keyword: "Error: Could not generate related keywords." }],
          negativeKeywordIdeas: ["Error: Could not generate negative keyword ideas."],
        }
      };
    }
    return output;
  }
);
