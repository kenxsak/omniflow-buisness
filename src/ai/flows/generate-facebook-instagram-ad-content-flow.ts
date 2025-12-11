
'use server';
/**
 * @fileOverview A Genkit flow for generating Facebook & Instagram ad content.
 *
 * - generateFacebookInstagramAdContent - Generates ad content variations.
 * - GenerateFacebookInstagramAdContentInput - Input type.
 * - GenerateFacebookInstagramAdContentOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdVariationSchema = z.object({
  primaryText: z.string().describe('The main ad copy (body text). Should be engaging and persuasive.'),
  headline: z.string().describe('A concise headline (e.g., for Instagram feed ads or Facebook headlines, typically shorter).'),
  description: z.string().optional().describe('Optional longer description, often used in some Facebook ad placements.'),
  suggestedImagePrompt: z.string().describe('A detailed text prompt for an AI image generator to create a relevant visual. Should include aspect ratio hints like "square (1:1) for feed" or "vertical (9:16) for stories".'),
  suggestedVideoConcept: z.string().describe('A brief (1-3 sentences) idea for a short video ad concept, including potential scenes or messaging flow.'),
  callToActionText: z.string().describe('A clear call-to-action phrase for the ad button (e.g., "Shop Now", "Learn More", "Sign Up").'),
});

const GenerateFacebookInstagramAdContentInputSchema = z.object({
  productOrService: z.string().min(1).describe('The product or service being advertised.'),
  targetAudience: z.string().min(1).describe('A detailed description of the target audience (e.g., demographics, interests, pain points).'),
  adObjective: z.enum(['Brand Awareness', 'Website Traffic', 'Lead Generation', 'Conversions', 'Engagement']).describe('The primary goal of the ad campaign.'),
  keyMessage: z.string().min(1).describe('The core message, offer, or unique selling proposition to highlight.'),
  desiredTone: z.enum(['Friendly', 'Professional', 'Playful', 'Urgent', 'Empathetic', 'Inspirational', 'Witty']).describe('The desired tone for the ad copy.'),
  platformFocus: z.enum(['Facebook', 'Instagram', 'Both']).describe('Whether to focus more on Facebook, Instagram, or create general content suitable for both.'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of ad content variations to generate (1-3).'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the ad content (e.g., "Spanish", "Hindi"). Default is English.'),
});
export type GenerateFacebookInstagramAdContentInput = z.infer<typeof GenerateFacebookInstagramAdContentInputSchema>;

const GenerateFacebookInstagramAdContentOutputSchema = z.object({
  adVariations: z.array(AdVariationSchema).describe('An array of generated ad content variations.'),
  audienceTargetingIdeas: z.array(z.string()).describe('A list of 3-5 conceptual audience targeting ideas based on the inputs (e.g., "Interests: Organic food, Yoga", "Behaviors: Online shoppers", "Demographics: Women 25-45").'),
});
export type GenerateFacebookInstagramAdContentOutput = z.infer<typeof GenerateFacebookInstagramAdContentOutputSchema>;

export async function generateFacebookInstagramAdContent(input: GenerateFacebookInstagramAdContentInput): Promise<GenerateFacebookInstagramAdContentOutput> {
  return generateFacebookInstagramAdContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFacebookInstagramAdContentPrompt',
  input: { schema: GenerateFacebookInstagramAdContentInputSchema },
  output: { schema: GenerateFacebookInstagramAdContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert Meta (Facebook & Instagram) Ads Strategist and Copywriter.
Your task is to generate {{{numVariations}}} distinct set(s) of ad content tailored for Facebook and/or Instagram campaigns, based on the user's inputs.
The ad content should be in '{{{targetLanguage}}}'.

Ad Campaign Details:
- Product/Service: {{{productOrService}}}
- Target Audience: {{{targetAudience}}}
- Ad Objective: {{{adObjective}}}
- Key Message/Offer: {{{keyMessage}}}
- Desired Tone: {{{desiredTone}}}
- Platform Focus: {{{platformFocus}}}

For EACH of the {{{numVariations}}} ad variations, provide:
1.  **primaryText:** The main ad copy. Make it engaging, clear, and persuasive, tailored to the '{{{desiredTone}}}' and '{{{adObjective}}}'. Incorporate the '{{{keyMessage}}}'.
2.  **headline:** A concise and catchy headline. For '{{{platformFocus}}}' Instagram, this might be shorter.
3.  **description (Optional):** A slightly longer description if applicable, mainly for some Facebook placements. Can be omitted if not central.
4.  **suggestedImagePrompt:** A detailed text prompt for an AI image generator.
    *   The prompt should describe a compelling visual relevant to the '{{{productOrService}}}', '{{{keyMessage}}}', and '{{{targetAudience}}}'.
    *   **Crucially, include aspect ratio hints:**
        *   If '{{{platformFocus}}}' is 'Instagram' or 'Both', suggest "square (1:1) for feed post" or "vertical (9:16) for Stories/Reels ad".
        *   If '{{{platformFocus}}}' is 'Facebook', suggest "landscape (1.91:1) for feed" or "square (1:1) for carousel/feed".
        *   Example: "Vibrant flat lay of eco-friendly yoga mat, water bottle, and a plant, minimalist style, bright natural light, square (1:1) for feed post."
5.  **suggestedVideoConcept:** A brief (1-3 sentences) idea for a short video ad concept (e.g., for Reels, Stories, or Facebook video ads). Describe the visual flow or core message.
6.  **callToActionText:** A strong call-to-action button text (e.g., "Shop Now", "Learn More", "Sign Up Today", "Get Offer").

Additionally, provide a general list of 3-5 **audienceTargetingIdeas**:
*   These should be conceptual ideas for targeting on Facebook/Instagram based on the '{{{productOrService}}}' and '{{{targetAudience}}}' description.
*   Examples: "Interests: Organic food, Sustainable living, Yoga and meditation", "Behaviors: Engaged shoppers, Purchased fitness products online", "Demographics: Women aged 25-45, living in urban areas, interested in wellness".

Ensure all text outputs are in '{{{targetLanguage}}}'. If not specified, use English.
Provide a variety of distinct ideas across the {{{numVariations}}} variations.
`,
});

const generateFacebookInstagramAdContentFlow = ai.defineFlow(
  {
    name: 'generateFacebookInstagramAdContentFlow',
    inputSchema: GenerateFacebookInstagramAdContentInputSchema,
    outputSchema: GenerateFacebookInstagramAdContentOutputSchema,
  },
  async (input: GenerateFacebookInstagramAdContentInput): Promise<GenerateFacebookInstagramAdContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.adVariations || output.adVariations.length === 0) {
      return {
        adVariations: [{
          primaryText: "Error: Could not generate primary text.",
          headline: "Error: No headline.",
          suggestedImagePrompt: "Error: No image prompt.",
          suggestedVideoConcept: "Error: No video concept.",
          callToActionText: "Error",
        }],
        audienceTargetingIdeas: ["Error: Could not generate audience targeting ideas. Please refine inputs and try again."]
      };
    }
    return output;
  }
);
