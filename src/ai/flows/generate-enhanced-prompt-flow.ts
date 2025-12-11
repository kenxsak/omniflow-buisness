
'use server';
/**
 * @fileOverview A Genkit flow for enhancing a user's basic prompt into a more detailed and effective one
 * for various AI tasks (image generation, text content, video script ideas).
 *
 * - generateEnhancedPrompt - Generates an enhanced prompt.
 * - GenerateEnhancedPromptInput - Input type.
 * - GenerateEnhancedPromptOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Export PromptGoal type
export type PromptGoal = "ImageGeneration" | "TextContent" | "VideoScriptIdea" | "SalesPageBrief";

// Internal Zod schema - NOT exported
const GenerateEnhancedPromptInputSchema = z.object({
  originalPrompt: z.string().min(1, { message: "Original prompt/idea is required." }).describe("The user's basic idea or simple prompt."),
  promptGoal: z.enum(["ImageGeneration", "TextContent", "VideoScriptIdea", "SalesPageBrief"]).describe("The type of AI output the enhanced prompt is intended for."),
  desiredStyle: z.string().optional().describe("Optional: Desired style, mood, or artistic direction (e.g., photorealistic, cinematic, witty, formal, inspirational)."),
  keyElements: z.string().optional().describe("Optional: Comma-separated list of specific key elements, themes, or keywords the user wants to ensure are included or emphasized."),
});
export type GenerateEnhancedPromptInput = z.infer<typeof GenerateEnhancedPromptInputSchema>;

// Internal Zod schema - NOT exported
const GenerateEnhancedPromptOutputSchema = z.object({
  enhancedPrompt: z.string().describe("The AI-generated detailed and enhanced prompt, ready to be used with another AI tool."),
  guidanceNotes: z.string().optional().describe("Optional: Brief notes from the AI explaining why the prompt was enhanced in a certain way, or tips for using it effectively."),
});
export type GenerateEnhancedPromptOutput = z.infer<typeof GenerateEnhancedPromptOutputSchema>;

export async function generateEnhancedPrompt(input: GenerateEnhancedPromptInput): Promise<GenerateEnhancedPromptOutput> {
  return generateEnhancedPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEnhancedPromptFlowPrompt',
  input: { schema: GenerateEnhancedPromptInputSchema }, // Use internal schema
  output: { schema: GenerateEnhancedPromptOutputSchema }, // Use internal schema
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an Expert AI Prompt Engineer. Your mission is to transform a user's simple idea or basic prompt into a highly effective, detailed, and structured prompt suitable for a specified AI generation task.

User's Inputs:
- Original Idea/Simple Prompt: {{{originalPrompt}}}
- Desired AI Task (Goal for this enhanced prompt): {{{promptGoal}}}
{{#if desiredStyle}}- Optional Desired Style/Tone: {{{desiredStyle}}}{{/if}}
{{#if keyElements}}- Optional Key Elements/Keywords to Emphasize: {{{keyElements}}}{{/if}}

Your Task:
1.  Analyze the user's inputs.
2.  Generate an 'enhancedPrompt'. This enhanced prompt should be significantly more detailed and better structured than the original, designed to elicit a high-quality response from an AI model for the specified '{{{promptGoal}}}'.
3.  Optionally, provide brief 'guidanceNotes' (1-2 sentences) explaining key additions or offering tips for using the enhanced prompt.

**Instructions for 'enhancedPrompt' based on 'promptGoal':**

*   **If 'promptGoal' is "ImageGeneration":**
    *   Create a rich, descriptive prompt for an AI image generator. Include details like subject, action/setting, art style, composition, lighting, color palette, and specific keywords for detail.
    *   Example: "Photorealistic action shot of a fluffy ginger tabby cat expertly riding a skateboard down a sun-drenched suburban street, low-angle view, dynamic motion blur, vibrant afternoon lighting, highly detailed fur texture, wearing tiny cool sunglasses. Style: action photography."

*   **If 'promptGoal' is "TextContent":**
    *   Craft a detailed prompt for an LLM to generate text. Specify output format, target audience, tone/voice, key messages, and desired length/structure.
    *   Example: "Generate a persuasive Instagram caption (around 100-150 words) targeted at busy professionals. The tone should be calm and reassuring. Highlight 3 key benefits of daily meditation, such as stress reduction, improved focus, and better sleep. Include a call to action: 'Discover tranquility – try our 5-minute guided meditation today! Link in bio. #meditation #mindfulness #stressrelief'."

*   **If 'promptGoal' is "VideoScriptIdea":**
    *   Develop a prompt for an LLM to outline a video script. Specify video purpose, target audience, key scenes, desired tone/style, visual style notes, and approximate length.
    *   Example: "Generate a video script outline for a 2-minute animated explainer video targeting new users of our SaaS product..."

*   **If 'promptGoal' is "SalesPageBrief":**
    *   Function as a marketing strategist and copywriter. Take the user's simple idea and flesh it out into a comprehensive creative brief for generating a full sales page.
    *   The output should be a detailed, structured prompt that the OmniFlow Sales Page Generator can use.
    *   The prompt must be structured with clear sections using Markdown headings (e.g., '## Hero Section', '## Key Features').
    *   Infer and create logical sections: Hero, Features, Benefits, Testimonials (with placeholder content), Pricing Tiers (create logical tiers like Free, Pro, Enterprise if not specified), and a final Call-to-Action.
    *   For each section, generate compelling copy (headlines, sub-headlines, body text).
    *   Example output for "A sales page for my SaaS company OmniFlow":
        \`\`\`
        Create a complete, modern, and professional sales landing page for a SaaS product called **OmniFlow**. The page should be fully responsive with a mobile-friendly hamburger menu, and include both light and dark mode styling.

        Here is the content and structure for each section:

        ## Hero Section:
        *   **Top Badge:** "Your All-in-One Business Automation Platform"
        *   **Main Headline:** "Stop Juggling Tools. Start Dominating Your Market."
        *   **Sub-headline:** "OmniFlow integrates your CRM, AI content creation, and multi-channel marketing into one seamless platform."
        *   **Buttons:** "View Plans" and "Get Started Free".

        ## Key Features Section:
        *   **Headline:** "Everything You Need to Scale"
        *   Create a grid of feature cards for: CRM & Lead Management, AI Campaign Studio, AI Blog Post Generation, etc.

        ## Pricing Section (ID: "pricing"):
        *   **Headline:** "Flexible Pricing for Every Team"
        *   Create a grid of four pricing cards for: **Free, Starter, Pro, and Enterprise**.
        *   The Pro plan should be marked as "Most Popular".

        ## Final Call-to-Action (CTA) Section:
        *   **Headline:** "Ready to Grow Your Business?"
        *   **Button:** "Sign Up for Free"

        Please use placeholder images (\`https://placehold.co/...\`) and ensure the entire page has a clean, professional design with good use of whitespace and typography.
        \`\`\`
    
Focus on making the 'enhancedPrompt' self-contained and rich with detail. The 'guidanceNotes' should be very brief if provided at all.
`,
});

const generateEnhancedPromptFlow = ai.defineFlow(
  {
    name: 'generateEnhancedPromptFlow',
    inputSchema: GenerateEnhancedPromptInputSchema, // Use internal schema
    outputSchema: GenerateEnhancedPromptOutputSchema, // Use internal schema
  },
  async (input: GenerateEnhancedPromptInput): Promise<GenerateEnhancedPromptOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.enhancedPrompt) {
      throw new Error("AI failed to generate an enhanced prompt.");
    }
    return output;
  }
);
