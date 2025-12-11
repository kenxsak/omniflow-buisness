
'use server';
/**
 * @fileOverview A Genkit flow for generating Google Search Ad copy (headlines and descriptions).
 *
 * - generateGoogleSearchAdCopy - Generates Google Search Ad copy.
 * - GenerateGoogleSearchAdCopyInput - Input type.
 * - GenerateGoogleSearchAdCopyOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Output schema with lenient validation - truncation will enforce limits
const AdCopyVariationOutputSchema = z.object({
  headlines: z.array(z.string()).max(15).describe('A list of up to 15 compelling headlines.'),
  descriptions: z.array(z.string()).max(4).describe('A list of up to 4 persuasive descriptions.'),
});

// Final output type with strict limits for display
const AdCopyVariationSchema = z.object({
  headlines: z.array(z.string().max(30, "Headline must be 30 characters or less.")).max(15).describe('A list of up to 15 compelling headlines, each strictly 30 characters or less.'),
  descriptions: z.array(z.string().max(90, "Description must be 90 characters or less.")).max(4).describe('A list of up to 4 persuasive descriptions, each strictly 90 characters or less.'),
});
// Export only the type, not the schema (use server files can only export async functions)
export type AdCopyVariation = z.infer<typeof AdCopyVariationSchema>;

const GenerateGoogleSearchAdCopyInputSchema = z.object({
  productOrService: z.string().min(1).describe('The name or a brief description of the product/service being advertised.'),
  targetAudience: z.string().optional().describe('A brief description of the target audience.'),
  keywords: z.string().min(1).describe('Comma-separated list of primary keywords the ad should relate to.'),
  uniqueSellingPoints: z.string().min(1).describe('Comma-separated list of 2-3 key benefits, features, or unique selling points.'),
  callToAction: z.string().optional().describe('The desired call to action for the ad (e.g., "Shop Now", "Learn More", "Sign Up").'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of ad copy variations to generate (1-3).'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the ad copy (e.g., "Spanish", "Hindi", "French"). Default is English.'),
});
export type GenerateGoogleSearchAdCopyInput = z.infer<typeof GenerateGoogleSearchAdCopyInputSchema>;

// Internal schema for AI output with lenient validation
const GenerateGoogleSearchAdCopyOutputSchemaLenient = z.object({
  adVariations: z.array(AdCopyVariationOutputSchema).describe('An array of generated Google Search Ad copy variations.'),
});

// Strict schema for the actual return type
const GenerateGoogleSearchAdCopyOutputSchema = z.object({
  adVariations: z.array(AdCopyVariationSchema).describe('An array of generated Google Search Ad copy variations.'),
});
export type GenerateGoogleSearchAdCopyOutput = z.infer<typeof GenerateGoogleSearchAdCopyOutputSchema>;

export async function generateGoogleSearchAdCopy(input: GenerateGoogleSearchAdCopyInput): Promise<GenerateGoogleSearchAdCopyOutput> {
  return generateGoogleSearchAdCopyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGoogleSearchAdCopyPrompt',
  input: { schema: GenerateGoogleSearchAdCopyInputSchema },
  output: { schema: GenerateGoogleSearchAdCopyOutputSchemaLenient },  // Use lenient schema for AI output
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert Google Ads copywriter. Your task is to generate {{{numVariations}}} distinct set(s) of ad copy for a Google Search campaign, with each set containing multiple headlines and descriptions in '{{{targetLanguage}}}'.

Ad Campaign Details:
- Product/Service: {{{productOrService}}}
{{#if targetAudience}}- Target Audience: {{{targetAudience}}}{{/if}}
- Keywords: {{{keywords}}}
- Unique Selling Points/Benefits: {{{uniqueSellingPoints}}}
{{#if callToAction}}- Desired Call To Action: {{{callToAction}}}{{/if}}

For EACH ad variation, provide:
1.  **Headlines:** Generate up to 15 unique headlines.
    *   Each headline MUST be **30 characters or less (strict limit)**. This is critical.
    *   Incorporate keywords naturally.
    *   Highlight unique selling points or create urgency/curiosity.
    *   Use Title Case for headlines.
2.  **Descriptions:** Generate up to 4 unique descriptions.
    *   Each description MUST be **90 characters or less (strict limit)**. This is critical.
    *   Elaborate on the benefits or unique selling points.
    *   Include a call to action (either the one provided: '{{{callToAction}}}', or a relevant one if not provided).
    *   Incorporate keywords if possible.
    *   Use Sentence case for descriptions.

Strive to provide the full requested number of headlines (up to 15) and descriptions (up to 4) for each variation, adhering strictly to character limits.
Ensure variety across the {{{numVariations}}} ad variations. Focus on clarity, conciseness, and persuasiveness.
The output must be in '{{{targetLanguage}}}'. If no language is specified, use English.

Example of a single ad variation structure (showing a few examples, actual output can have up to 15 headlines and 4 descriptions):
{
  "headlines": ["Headline 1 (Max 30)", "Headline 2 (Max 30)", "Headline 3 (Max 30)", "...up to 12 more..."],
  "descriptions": ["Description 1 (Max 90 characters). USP & CTA.", "Description 2 (Max 90 characters). Another angle.", "...up to 2 more..."]
}

Generate the ad variations now.
`,
});

const generateGoogleSearchAdCopyFlow = ai.defineFlow(
  {
    name: 'generateGoogleSearchAdCopyFlow',
    inputSchema: GenerateGoogleSearchAdCopyInputSchema,
    outputSchema: GenerateGoogleSearchAdCopyOutputSchemaLenient,  // Use lenient schema for flow
  },
  async (input: GenerateGoogleSearchAdCopyInput): Promise<GenerateGoogleSearchAdCopyOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.adVariations || output.adVariations.length === 0) {
      // Fallback if AI returns empty or invalid output
      return {
        adVariations: [{
          headlines: ["Error generating headlines"],
          descriptions: ["Error generating descriptions. Please try again with different inputs."],
        }]
      };
    }
    
    // Enforce character limits by truncating - this ensures compliance with Google Ads requirements
    // Truncation is safer than validation errors for user experience
    const validatedVariations = output.adVariations.map(variation => ({
        headlines: variation.headlines
          .slice(0, 15)  // Max 15 headlines
          .map(h => h.substring(0, 30)),  // Max 30 chars each
        descriptions: variation.descriptions
          .slice(0, 4)  // Max 4 descriptions  
          .map(d => d.substring(0, 90)),  // Max 90 chars each
    }));
    return { adVariations: validatedVariations };
  }
);
