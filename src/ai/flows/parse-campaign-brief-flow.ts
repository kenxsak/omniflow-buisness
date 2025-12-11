'use server';
/**
 * @fileOverview A Genkit flow for parsing free-text campaign briefs into structured data.
 *
 * - parseCampaignBrief - A function that parses campaign prompts into structured format.
 * - ParseCampaignBriefInput - The input type.
 * - ParseCampaignBriefOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseCampaignBriefInputSchema = z.object({
  campaignPrompt: z.string().min(1).describe('Free-text campaign description (e.g., "Flash sale - 50% off everything, ends tonight. Target past customers. Urgent tone. CTA: Shop Now, link: https://store.com/sale")'),
});
export type ParseCampaignBriefInput = z.infer<typeof ParseCampaignBriefInputSchema>;

const ParseCampaignBriefOutputSchema = z.object({
  campaignGoal: z.string().describe('The primary objective of the campaign (e.g., "Promote flash sale")'),
  targetAudience: z.string().describe('Description of the intended recipients (e.g., "Past customers")'),
  keyPoints: z.string().describe('Comma-separated list of key messages or information (e.g., "50% off everything, ends tonight, free shipping")'),
  tone: z.enum(['Formal', 'Informal', 'Friendly', 'Professional', 'Enthusiastic', 'Urgent']).describe('The desired tone of voice for the campaign'),
  callToAction: z.string().describe('The desired call to action text (e.g., "Shop Now")'),
  callToActionLink: z.string().optional().describe('The URL the call to action should link to'),
  businessContext: z.string().optional().describe('Any business name or context mentioned'),
});
export type ParseCampaignBriefOutput = z.infer<typeof ParseCampaignBriefOutputSchema>;

export async function parseCampaignBrief(input: ParseCampaignBriefInput): Promise<ParseCampaignBriefOutput> {
  return parseCampaignBriefFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseCampaignBriefPrompt',
  input: { schema: ParseCampaignBriefInputSchema },
  output: { schema: ParseCampaignBriefOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  config: {
    maxOutputTokens: 400,
    temperature: 0.5,
  },
  prompt: `You are an expert marketing analyst. Your task is to parse a free-text campaign brief and extract structured information.

**Campaign Prompt:**
{{{campaignPrompt}}}

**Instructions:**
1. **Campaign Goal:** Identify and summarize the main objective or purpose of this campaign in 1-2 sentences.
2. **Target Audience:** Determine who this campaign is intended for. If not explicitly mentioned, infer from context (default to "All customers" if unclear).
3. **Key Points:** Extract all important messages, offers, features, or information that should be communicated. Format as a comma-separated list.
4. **Tone:** Analyze the language and intent to determine the most appropriate tone from: Formal, Informal, Friendly, Professional, Enthusiastic, or Urgent.
5. **Call to Action:** Identify the main action you want recipients to take (e.g., "Shop Now", "Learn More", "Sign Up"). If not explicitly stated, suggest an appropriate CTA based on the campaign goal.
6. **Call to Action Link:** Extract any URLs mentioned in the prompt. Only include if a valid URL is present.
7. **Business Context:** Extract any business name, brand name, or company context mentioned. Leave empty if none found.

**Examples:**

Input: "Flash sale - 50% off everything, ends tonight. Target past customers. Urgent tone. CTA: Shop Now, link: https://store.com/sale"
Output:
{
  "campaignGoal": "Promote time-limited flash sale with 50% discount",
  "targetAudience": "Past customers",
  "keyPoints": "50% off everything, ends tonight, limited time offer",
  "tone": "Urgent",
  "callToAction": "Shop Now",
  "callToActionLink": "https://store.com/sale",
  "businessContext": ""
}

Input: "New product launch for TechCo's AI assistant. Professional audience. Highlight: saves 10 hours/week, integrates with existing tools, free trial available."
Output:
{
  "campaignGoal": "Launch TechCo's new AI assistant product",
  "targetAudience": "Professional users",
  "keyPoints": "Saves 10 hours per week, integrates with existing tools, free trial available",
  "tone": "Professional",
  "callToAction": "Start Free Trial",
  "callToActionLink": "",
  "businessContext": "TechCo"
}

Parse the campaign prompt now and provide structured output.
`,
});

const parseCampaignBriefFlow = ai.defineFlow(
  {
    name: 'parseCampaignBriefFlow',
    inputSchema: ParseCampaignBriefInputSchema,
    outputSchema: ParseCampaignBriefOutputSchema,
  },
  async (input: ParseCampaignBriefInput): Promise<ParseCampaignBriefOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.campaignGoal) {
      // Fallback if AI fails to parse
      return {
        campaignGoal: input.campaignPrompt.substring(0, 100),
        targetAudience: "All customers",
        keyPoints: input.campaignPrompt,
        tone: "Friendly",
        callToAction: "Learn More",
        callToActionLink: undefined,
        businessContext: undefined,
      };
    }
    
    // Normalize callToActionLink: convert "null", "undefined", empty strings to undefined
    // Also validate it's a proper URL if provided
    let normalizedLink: string | undefined = output.callToActionLink;
    if (normalizedLink !== undefined && normalizedLink !== null) {
      const trimmed = normalizedLink.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined' || trimmed === 'N/A') {
        normalizedLink = undefined;
      } else {
        // Basic URL validation
        try {
          new URL(trimmed);
          normalizedLink = trimmed;
        } catch {
          // If not a valid URL, set to undefined
          console.warn(`Invalid URL provided in callToActionLink: "${trimmed}". Setting to undefined.`);
          normalizedLink = undefined;
        }
      }
    } else {
      // Explicitly handle undefined/null by setting to undefined
      normalizedLink = undefined;
    }
    
    return {
      ...output,
      callToActionLink: normalizedLink,
    };
  }
);
