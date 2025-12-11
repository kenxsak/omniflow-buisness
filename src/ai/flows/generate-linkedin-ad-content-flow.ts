
'use server';
/**
 * @fileOverview A Genkit flow for generating LinkedIn ad content.
 *
 * - generateLinkedInAdContent - Generates ad content variations for LinkedIn.
 * - GenerateLinkedInAdContentInput - Input type.
 * - GenerateLinkedInAdContentOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LinkedInAdVariationSchema = z.object({
  introductoryText: z.string().describe('The main ad copy (body text for a LinkedIn post). Should be professional and value-driven.'),
  headline: z.string().describe('A concise headline for the ad (e.g., for a single image ad or below a carousel).'),
  sponsoredContentOutline: z.string().describe('A brief (2-4 bullet points) outline or concept for a sponsored content piece (e.g., article, document ad) related to the product/service and value proposition.'),
  suggestedImagePrompt: z.string().describe('A detailed text prompt for an AI image generator to create a professional visual (e.g., "diverse business professionals collaborating in a modern office, natural light, 1.91:1 aspect ratio for LinkedIn feed"). Include aspect ratio.'),
  callToActionText: z.string().describe('A clear call-to-action phrase for the ad button (e.g., "Learn More", "Download", "Request Demo", "Visit Website").'),
});

const TargetingSuggestionsSchema = z.object({
  jobTitles: z.array(z.string()).describe('Suggestions for relevant job titles to target.'),
  skills: z.array(z.string()).describe('Suggestions for relevant skills to target.'),
  industries: z.array(z.string()).describe('Suggestions for relevant industries to target.'),
  companySizes: z.array(z.string()).describe('Suggestions for company sizes to target (e.g., "1-10 employees", "51-200 employees", "1000+ employees").'),
});

const GenerateLinkedInAdContentInputSchema = z.object({
  b2bProductOrService: z.string().min(1).describe('The B2B product or service being advertised.'),
  targetIndustry: z.string().optional().describe('The primary industry being targeted (e.g., "Software Development", "Healthcare IT", "Financial Services").'),
  targetRole: z.string().optional().describe('The primary job role or seniority level being targeted (e.g., "CTOs", "Marketing Managers", "HR Directors", "Sales Executives").'),
  adObjective: z.enum(['Lead Generation', 'Brand Awareness', 'Website Visits', 'Engagement', 'Talent Acquisition']).describe('The primary goal of the LinkedIn ad campaign.'),
  valueProposition: z.string().min(1).describe('The core value proposition or unique selling point for the B2B audience.'),
  desiredTone: z.enum(['Professional', 'Authoritative', 'Insightful', 'Innovative', 'Friendly', 'Problem-solving']).describe('The desired tone for the ad copy.'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of ad content variations to generate (1-3).'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the ad content (e.g., "Spanish", "Hindi"). Default is English.'),
});
export type GenerateLinkedInAdContentInput = z.infer<typeof GenerateLinkedInAdContentInputSchema>;

const GenerateLinkedInAdContentOutputSchema = z.object({
  adVariations: z.array(LinkedInAdVariationSchema).describe('An array of generated LinkedIn ad content variations.'),
  targetingSuggestions: TargetingSuggestionsSchema.describe('Suggestions for LinkedIn ad campaign targeting parameters.'),
});
export type GenerateLinkedInAdContentOutput = z.infer<typeof GenerateLinkedInAdContentOutputSchema>;

export async function generateLinkedInAdContent(input: GenerateLinkedInAdContentInput): Promise<GenerateLinkedInAdContentOutput> {
  return generateLinkedInAdContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLinkedInAdContentPrompt',
  input: { schema: GenerateLinkedInAdContentInputSchema },
  output: { schema: GenerateLinkedInAdContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert B2B LinkedIn Ads Strategist and Copywriter.
Your task is to generate {{{numVariations}}} distinct set(s) of ad content tailored for LinkedIn campaigns, based on the user's inputs.
The ad content should be in '{{{targetLanguage}}}'.

Ad Campaign Details:
- B2B Product/Service: {{{b2bProductOrService}}}
{{#if targetIndustry}}- Target Industry: {{{targetIndustry}}}{{/if}}
{{#if targetRole}}- Target Role/Seniority: {{{targetRole}}}{{/if}}
- Ad Objective: {{{adObjective}}}
- Value Proposition: {{{valueProposition}}}
- Desired Tone: {{{desiredTone}}}

For EACH of the {{{numVariations}}} ad variations, provide:
1.  **introductoryText:** The main ad copy for a LinkedIn post. Should be professional, engaging, and clearly articulate the '{{{valueProposition}}}'. Tailor to the '{{{desiredTone}}}'.
2.  **headline:** A concise and compelling headline.
3.  **sponsoredContentOutline:** A brief outline (2-4 bullet points or short sentences) for a potential sponsored content piece (like an article or document ad) that expands on the '{{{valueProposition}}}' or addresses a key pain point for the '{{{targetRole}}}' or '{{{targetIndustry}}}'.
4.  **suggestedImagePrompt:** A detailed text prompt for an AI image generator.
    *   The prompt should describe a professional and relevant visual for LinkedIn.
    *   **Crucially, specify aspect ratio, typically "1.91:1 for LinkedIn feed/carousel ads" or "1:1 for some placements like company page updates".**
    *   Example: "Clean and modern flat lay of a laptop, notebook with charts, and a pen, on a minimalist desk, focused on productivity, 1.91:1 aspect ratio for LinkedIn feed."
5.  **callToActionText:** A strong call-to-action button text suitable for B2B (e.g., "Learn More", "Download", "Request a Demo", "Visit Website", "Get Started").

Additionally, provide overall **targetingSuggestions**:
1.  **jobTitles:** Suggest 3-5 specific job titles relevant to '{{{targetRole}}}'.
2.  **skills:** Suggest 3-5 key skills or areas of expertise that professionals in the '{{{targetRole}}}' or '{{{targetIndustry}}}' might have.
3.  **industries:** Suggest 2-3 related or more specific industries based on '{{{targetIndustry}}}' if provided, or broader suggestions if not.
4.  **companySizes:** Suggest 2-3 company size segments (e.g., "1-10 employees", "51-200 employees", "1001-5000 employees", "10,000+ employees").

Ensure all text outputs are in '{{{targetLanguage}}}'. If not specified, use English.
Provide a variety of distinct ideas across the {{{numVariations}}} variations.
Focus on clarity, professionalism, and value for a B2B audience on LinkedIn.
`,
});

const generateLinkedInAdContentFlow = ai.defineFlow(
  {
    name: 'generateLinkedInAdContentFlow',
    inputSchema: GenerateLinkedInAdContentInputSchema,
    outputSchema: GenerateLinkedInAdContentOutputSchema,
  },
  async (input: GenerateLinkedInAdContentInput): Promise<GenerateLinkedInAdContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.adVariations || output.adVariations.length === 0 || !output.targetingSuggestions) {
      return {
        adVariations: [{
          introductoryText: "Error: Could not generate introductory text.",
          headline: "Error: No headline.",
          sponsoredContentOutline: "Error: No sponsored content outline.",
          suggestedImagePrompt: "Error: No image prompt. Ensure aspect ratio hint like '1.91:1 for LinkedIn feed'.",
          callToActionText: "Error",
        }],
        targetingSuggestions: {
          jobTitles: ["Error: Could not generate job title suggestions."],
          skills: ["Error: Could not generate skill suggestions."],
          industries: ["Error: Could not generate industry suggestions."],
          companySizes: ["Error: Could not generate company size suggestions."],
        }
      };
    }
    return output;
  }
);
