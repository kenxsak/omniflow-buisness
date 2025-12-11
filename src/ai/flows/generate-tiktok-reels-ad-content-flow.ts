
'use server';
/**
 * @fileOverview A Genkit flow for generating TikTok & Instagram Reels ad content.
 *
 * - generateTiktokReelsAdContent - Generates ad content variations.
 * - GenerateTiktokReelsAdContentInput - Input type.
 * - GenerateTiktokReelsAdContentOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TiktokReelsAdVariationSchema = z.object({
  videoConcept: z.string().describe('A concise (2-4 sentences) description of the short video idea, including potential scenes, transitions, or on-screen text/effect ideas tailored for TikTok/Reels.'),
  captionOptions: z.array(z.string()).max(3).describe('2-3 snappy and engaging caption options for the video concept.'),
  suggestedSoundConcept: z.string().describe('A conceptual suggestion for a trending sound, type of music, or audio effect (e.g., "Upbeat trending pop song," "Popular voice-over sound," "ASMR-style sound effects," "Use a trending challenge audio"). Avoid specific copyrighted song titles.'),
  callToActionText: z.string().describe('A clear call-to-action phrase suitable for TikTok/Reels (e.g., "Shop Link in Bio!", "Try it Now!", "Learn More!", "Comment below!").'),
  suggestedHashtags: z.array(z.string()).max(7).describe('3-7 relevant hashtags, including a mix of broad, niche, and potentially trending ones.'),
});

const GenerateTiktokReelsAdContentInputSchema = z.object({
  productOrService: z.string().min(1).describe('The product or service being advertised.'),
  targetDemographic: z.string().min(1).describe('A description of the target demographic (e.g., "Gen Z interested in sustainable fashion", "Millennials looking for quick recipes", "Gamers aged 18-24").'),
  adVibe: z.enum(['Funny & Relatable', 'Educational & Informative', 'Trendy & Viral-Style', 'Aesthetic & Calming', 'Problem-Solution Focus', 'Inspiring & Motivational', 'Behind-the-Scenes']).describe('The desired vibe or style of the ad.'),
  keyMessage: z.string().min(1).describe('The core message or unique selling proposition to convey concisely.'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of ad content variations to generate (1-3).'),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the ad content (e.g., "Spanish", "Hindi"). Default is English.'),
});
export type GenerateTiktokReelsAdContentInput = z.infer<typeof GenerateTiktokReelsAdContentInputSchema>;

const GenerateTiktokReelsAdContentOutputSchema = z.object({
  adVariations: z.array(TiktokReelsAdVariationSchema).describe('An array of generated TikTok/Reels ad content variations.'),
  generalTipsForPlatform: z.array(z.string()).max(3).describe("2-3 general tips for creating successful TikTok/Reels ads based on the inputs.")
});
export type GenerateTiktokReelsAdContentOutput = z.infer<typeof GenerateTiktokReelsAdContentOutputSchema>;

export async function generateTiktokReelsAdContent(input: GenerateTiktokReelsAdContentInput): Promise<GenerateTiktokReelsAdContentOutput> {
  return generateTiktokReelsAdContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTiktokReelsAdContentPrompt',
  input: { schema: GenerateTiktokReelsAdContentInputSchema },
  output: { schema: GenerateTiktokReelsAdContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert TikTok & Instagram Reels Ad Strategist and Viral Content Creator.
Your task is to generate {{{numVariations}}} distinct set(s) of ad content ideas tailored for these short-form video platforms, based on the user's inputs.
The ad content should be in '{{{targetLanguage}}}'.

Ad Campaign Details:
- Product/Service: {{{productOrService}}}
- Target Demographic: {{{targetDemographic}}}
- Ad Vibe: {{{adVibe}}}
- Key Message: {{{keyMessage}}}

For EACH of the {{{numVariations}}} ad variations, provide:
1.  **videoConcept:** A concise (2-4 sentences) description of the video idea. Think about:
    *   **Hook (first 1-2 seconds):** How to grab attention immediately.
    *   **Visuals/Action:** What happens in the video? Any quick cuts, transitions, or on-screen text/sticker ideas?
    *   **Platform Native Style:** Does it feel like content users would organically watch on TikTok/Reels? Consider trends if the '{{{adVibe}}}' is 'Trendy & Viral-Style'.
2.  **captionOptions:** 2-3 short, snappy, and engaging caption options for the video. Include relevant emojis if appropriate for the '{{{adVibe}}}'.
3.  **suggestedSoundConcept:** A *conceptual* suggestion for audio. **Do NOT suggest specific copyrighted song titles or artists.** Instead, describe the type of sound:
    *   e.g., "Upbeat trending pop instrumental," "Popular funny voice-over sound effect," "ASMR satisfying sounds," "Use audio from a current viral challenge related to [topic]," "Calming lofi beats."
4.  **callToActionText:** A clear and concise call-to-action suitable for these platforms.
5.  **suggestedHashtags:** 3-7 relevant hashtags. Mix broad, niche, and potentially trending (conceptual, e.g., #ViralChallengeName if applicable).

Additionally, provide a general list of 2-3 **generalTipsForPlatform**:
*   These should be actionable tips for creating successful TikTok/Reels ads, considering the '{{{productOrService}}}', '{{{targetDemographic}}}', and '{{{adVibe}}}'.
*   Examples: "Use fast-paced editing and lots of visuals for this demographic.", "Authenticity performs well; consider user-generated style content.", "Leverage text overlays as many watch with sound off."

Ensure all text outputs are in '{{{targetLanguage}}}'.
Provide a variety of distinct ideas across the {{{numVariations}}} variations.
Focus on creativity, engagement, and what works well on TikTok and Instagram Reels.
`,
});

const generateTiktokReelsAdContentFlow = ai.defineFlow(
  {
    name: 'generateTiktokReelsAdContentFlow',
    inputSchema: GenerateTiktokReelsAdContentInputSchema,
    outputSchema: GenerateTiktokReelsAdContentOutputSchema,
  },
  async (input: GenerateTiktokReelsAdContentInput): Promise<GenerateTiktokReelsAdContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.adVariations || output.adVariations.length === 0) {
      return {
        adVariations: [{
          videoConcept: "Error: Could not generate video concept.",
          captionOptions: ["Error: No captions."],
          suggestedSoundConcept: "Error: No sound concept.",
          callToActionText: "Error",
          suggestedHashtags: ["#error"],
        }],
        generalTipsForPlatform: ["Error: Could not generate tips. Please refine inputs and try again."]
      };
    }
    return output;
  }
);
