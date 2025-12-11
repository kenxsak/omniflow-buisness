
'use server';
/**
 * @fileOverview A Genkit flow for generating YouTube ad campaign content,
 * including script ideas, titles, descriptions, thumbnail prompts, and targeting ideas.
 *
 * - generateYouTubeAdContent - Generates YouTube ad content variations.
 * - GenerateYouTubeAdContentInput - Input type.
 * - GenerateYouTubeAdContentOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const YouTubeAdVariationSchema = z.object({
  adFormatSuggestion: z.string().describe("Suggested YouTube ad format (e.g., 'Skippable In-stream (15-30s)', 'Bumper Ad (6s)', 'Non-skippable In-stream (15s)', 'Discovery Ad showing product in use')."),
  videoTitle: z.string().describe('Compelling title for the ad if used as a standalone video or for campaign naming (max 100 chars).'),
  script: z.string().describe('Detailed ad script. Structure with scenes, voice-over (VO), on-screen text (OST), and visual cues (VISUAL). For bumper ads, this will be very short and impactful. Include specific image generation prompts within the script if needed for key visuals, like [IMAGE PROMPT FOR AI: detailed description, 16:9 aspect ratio].'),
  voiceOverTone: z.string().describe('Suggested tone for the voice-over (e.g., "Energetic and Upbeat", "Calm and Reassuring", "Authoritative and Clear").'),
  visualStyleNotes: z.string().describe('Brief notes on the overall visual style of the ad (e.g., "Fast-paced cuts, bright modern graphics", "Clean, minimalist animation with product focus", "Real-life user testimonials with natural lighting").'),
  thumbnailPrompt: z.string().describe('Descriptive prompt for an AI image generator to create an eye-catching YouTube thumbnail image (16:9 aspect ratio is standard). Should be highly engaging.'),
  callToActionText: z.string().describe('Clear call-to-action text for the ad button, overlay, or end screen (e.g., "Shop Now", "Learn More", "Visit Website", "Sign Up Free").'),
  suggestedVideoDescription: z.string().optional().describe("A brief YouTube video description (if the ad is also usable as standalone content). Include key points, the CTA, and a placeholder for the link like [YOUR_LINK_HERE]. Max 2-3 lines for ad context.")
});

const GenerateYouTubeAdContentInputSchema = z.object({
  productOrService: z.string().min(1).describe('The product, service, or brand being advertised.'),
  targetAudience: z.string().min(1).describe('A detailed description of the target audience (e.g., demographics, interests, pain points, online behavior).'),
  adObjective: z.enum(['BrandAwareness', 'WebsiteTraffic', 'LeadGeneration', 'Sales', 'ProductConsideration', 'AppPromotion']).describe('The primary goal of the YouTube ad campaign.'),
  keyMessagePoints: z.string().min(1).describe('Comma-separated or bulleted list of 2-4 key messages, unique selling propositions (USPs), or benefits to convey in the ad.'),
  desiredVideoStyleAndLength: z.string().min(1).describe('Guidance on the desired video ad style and approximate length (e.g., "Short and punchy 6s bumper ad for brand recall", "Engaging 30-second skippable in-stream ad showcasing product benefits", "Informative 1-2 minute explainer video for product consideration focusing on ease of use"). This will heavily influence the adFormatSuggestion and script.'),
  overallTone: z.enum(['Professional', 'Friendly', 'Energetic', 'Humorous', 'Serious', 'Inspirational', 'Empathetic', 'Authoritative']).describe('The overall desired tone for the ad creative and voice-over.'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of ad creative variations to generate (1-3).'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the ad script and text elements (e.g., "Spanish", "Hindi"). Default is English.'),
});
export type GenerateYouTubeAdContentInput = z.infer<typeof GenerateYouTubeAdContentInputSchema>;

const GenerateYouTubeAdContentOutputSchema = z.object({
  adVariations: z.array(YouTubeAdVariationSchema).describe('An array of generated YouTube ad creative variations.'),
  audienceTargetingIdeas: z.array(z.string()).describe('A list of 3-5 conceptual YouTube audience targeting ideas (e.g., "In-market for: Software solutions", "Affinity: Tech Enthusiasts", "Demographics: Marketing Managers, Age 25-45 in Urban Areas", "Keywords: AI tools for business productivity", "Topics: Digital Marketing Strategies", "Placements: Popular tech review channels").'),
});
export type GenerateYouTubeAdContentOutput = z.infer<typeof GenerateYouTubeAdContentOutputSchema>;

export async function generateYouTubeAdContent(input: GenerateYouTubeAdContentInput): Promise<GenerateYouTubeAdContentOutput> {
  return generateYouTubeAdContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateYouTubeAdContentPrompt',
  input: { schema: GenerateYouTubeAdContentInputSchema },
  output: { schema: GenerateYouTubeAdContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert YouTube Ads Strategist and Video Scriptwriter.
Your task is to generate {{{numVariations}}} distinct set(s) of YouTube ad creative content based on the user's inputs.
The ad content should be in '{{{targetLanguage}}}'.

Ad Campaign Details:
- Product/Service: {{{productOrService}}}
- Target Audience: {{{targetAudience}}}
- Ad Objective: {{{adObjective}}}
- Key Message Points: {{{keyMessagePoints}}}
- Desired Video Style & Length: {{{desiredVideoStyleAndLength}}}
- Overall Tone: {{{overallTone}}}

For EACH of the {{{numVariations}}} ad variations, provide:
1.  **adFormatSuggestion:** Suggest a suitable YouTube ad format based on '{{{desiredVideoStyleAndLength}}}' and '{{{adObjective}}}' (e.g., 'Skippable In-stream (15-30s)', 'Bumper Ad (6s)', 'Non-skippable In-stream (15s)', 'Video Discovery Ad concept').
2.  **videoTitle:** A compelling title for the ad (max 100 chars).
3.  **script:** A detailed ad script.
    *   The script's length and structure MUST align with the 'adFormatSuggestion' and '{{{desiredVideoStyleAndLength}}}'.
    *   Use clear sections like:
        *   **Hook (First 3-5 seconds for skippable ads):** Grab attention immediately.
        *   **Problem/Opportunity:** Briefly address a pain point or desire of the '{{{targetAudience}}}'.
        *   **Solution/Product Intro:** Introduce '{{{productOrService}}}' as the solution.
        *   **Key Benefits/Features Demo (Visual):** Highlight points from '{{{keyMessagePoints}}}'. Suggest visuals or on-screen text.
        *   **Call to Action (Visual & Audio):** Clear next step.
    *   Use these tags for structure:
        *   \`[SCENE START: Brief description of setting/action]\`
        *   \`VO:\` (Voice-over script for that scene)
        *   \`OST:\` (On-Screen Text for that scene)
        *   \`VISUAL:\` (Description of key visuals or actions)
        *   \`[IMAGE PROMPT FOR AI: Detailed description of a specific visual needed, 16:9 aspect ratio]\` (Include this where a generated image would enhance the scene, like a product shot or abstract concept).
    *   Example snippet for script:
        \`[SCENE START: Bright, modern office setting]\`
        \`VO: Tired of juggling multiple marketing tools? OmniFlow streamlines everything!\`
        \`OST: OmniFlow: Your All-in-One Marketing Hub\`
        \`VISUAL: Quick cuts showing different OmniFlow features in action.\`
        \`[IMAGE PROMPT FOR AI: OmniFlow dashboard on a laptop screen, clean interface, vibrant charts, 16:9 aspect ratio]\`
4.  **voiceOverTone:** Suggest an appropriate tone for the voice-over, aligned with '{{{overallTone}}}'.
5.  **visualStyleNotes:** Brief notes on the ad's visual style.
6.  **thumbnailPrompt:** A detailed text prompt for an AI image generator to create an engaging YouTube thumbnail (16:9 aspect ratio). It should be click-worthy and represent the ad's core message or '{{{productOrService}}}'.
7.  **callToActionText:** The text for the ad's button or end-screen CTA.
8.  **suggestedVideoDescription (Optional):** A concise YouTube video description (2-3 lines) if the ad could also serve as standalone content. Include key elements and a placeholder for the link, like \`Learn more at [YOUR_LINK_HERE]\`.

Additionally, provide a general list of 3-5 **audienceTargetingIdeas** for YouTube:
*   These should be conceptual ideas for YouTube targeting options based on the '{{{targetAudience}}}' and '{{{productOrService}}}'.
*   Examples: "In-market for: [Relevant Product/Service Category]", "Affinity: [Relevant Interest Group]", "Custom Audience: Website Visitors (Retargeting)", "Keywords: [Relevant search terms on YouTube]", "Topics: [Relevant content categories]", "Placements: [Specific channels or videos where audience might be found]".

Ensure all text outputs are in '{{{targetLanguage}}}'.
Provide a variety of distinct ideas across the {{{numVariations}}} variations, especially for the script and ad format.
Focus on clarity, engagement, and effectiveness for YouTube advertising.
`,
});

const generateYouTubeAdContentFlow = ai.defineFlow(
  {
    name: 'generateYouTubeAdContentFlow',
    inputSchema: GenerateYouTubeAdContentInputSchema,
    outputSchema: GenerateYouTubeAdContentOutputSchema,
  },
  async (input: GenerateYouTubeAdContentInput): Promise<GenerateYouTubeAdContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.adVariations || output.adVariations.length === 0) {
      // Fallback if AI returns empty or invalid output
      return {
        adVariations: [{
          adFormatSuggestion: "Error: Could not suggest ad format.",
          videoTitle: "Error: No title generated.",
          script: "Error: Could not generate script. Please refine inputs (especially Video Style & Length) and try again.",
          voiceOverTone: "Error",
          visualStyleNotes: "Error",
          thumbnailPrompt: "Error: No thumbnail prompt.",
          callToActionText: "Error",
        }],
        audienceTargetingIdeas: ["Error: Could not generate audience targeting ideas."]
      };
    }
    return output;
  }
);
