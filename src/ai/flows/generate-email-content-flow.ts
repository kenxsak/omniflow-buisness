
'use server';
/**
 * @fileOverview A Genkit flow for generating email campaign content using AI.
 *
 * - generateEmailContent - A function that handles email content generation.
 * - GenerateEmailContentInput - The input type.
 * - GenerateEmailContentOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateEmailContentInputSchema = z.object({
  campaignGoal: z.string().describe('The primary objective of the email campaign (e.g., promote new product, announce sale, share newsletter).'),
  targetAudience: z.string().describe('Description of the intended recipients (e.g., existing customers, new subscribers, specific segment).'),
  keyPoints: z.string().describe('Bulleted or comma-separated list of key messages or information to include in the email.'),
  tone: z.enum(['Formal', 'Informal', 'Friendly', 'Professional', 'Enthusiastic', 'Urgent']).describe('The desired tone of voice for the email content.'),
  callToAction: z.string().optional().describe('The desired call to action text (e.g., Shop Now, Learn More, Sign Up).'),
  callToActionLink: z.union([z.string().url(), z.literal(''), z.undefined()]).optional().describe('The URL the call to action should link to (must be a valid URL if provided).'),
});
export type GenerateEmailContentInput = z.infer<typeof GenerateEmailContentInputSchema>;

const GenerateEmailContentOutputSchema = z.object({
  htmlContent: z.string().describe('The AI-generated email content in basic, well-formatted HTML suitable for email clients, including Brevo personalization tags.'),
});
export type GenerateEmailContentOutput = z.infer<typeof GenerateEmailContentOutputSchema>;

export async function generateEmailContent(input: GenerateEmailContentInput): Promise<GenerateEmailContentOutput> {
  return generateEmailContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmailContentPrompt',
  input: { schema: GenerateEmailContentInputSchema },
  output: { schema: GenerateEmailContentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  config: {
    maxOutputTokens: 1500,
    temperature: 0.8,
  },
  prompt: `You are an expert email marketer and copywriter tasked with generating compelling, professional email content in HTML format, ready for use in Brevo campaigns.

**Instructions:**
1.  Generate the email content based on the following inputs:
    *   **Campaign Goal:** {{{campaignGoal}}}
    *   **Target Audience:** {{{targetAudience}}}
    *   **Key Points:** {{{keyPoints}}}
    *   **Desired Tone:** {{{tone}}}
    *   **Call To Action Text (Optional):** {{{callToAction}}}
    *   **Call To Action Link (Optional):** {{{callToActionLink}}}

2.  **CRITICAL FOR PERSONALIZATION:** The email content MUST start with a personalized greeting using Brevo's contact attribute syntax. Always include \`Hi {{ contact.FIRSTNAME }},\` (or a similar greeting appropriate to the tone like \`Dear {{ contact.FIRSTNAME }},\` if formal) at the very beginning of the email body. This exact tag is essential for Brevo to personalize the email.

3.  **Content Length:** Generate engaging, comprehensive email content (180-220 words). Create rich copy that tells a story while remaining scannable for busy readers.

4.  **Required Structure:**
    *   **Opening Greeting:** Personalized greeting with {{ contact.FIRSTNAME }}
    *   **Introduction (1-2 sentences):** Hook the reader with an engaging opening that sets up the campaign goal
    *   **Main Value Proposition (2-3 sentences):** Expand on the primary benefit with details and storytelling
    *   **Supporting Points (2-3 sentences):** Cover additional key points with rich details or examples
    *   **Transition to Action (1-2 sentences):** Build urgency or excitement leading into the CTA
    *   **Clear Call to Action:** Prominent button or link with the CTA text
    *   **Closing (Optional):** Friendly sign-off or P.S. with additional value if appropriate

5.  **Output Format:** Produce clean, well-structured HTML suitable for email clients. Use semantic HTML tags:
    *   <h1> for main headline, <h2> for section headers
    *   <p> for paragraphs
    *   <ul> and <li> for lists when presenting multiple benefits
    *   <strong> and <em> for emphasis
    *   <a> for links
    *   **Avoid complex CSS or JavaScript.** Inline styles are acceptable for the CTA button.

6.  **Engagement:** Focus on benefits and clear value. Address pain points and present solutions concisely.

7.  **Tone Adaptation:** Ensure the generated content reflects the desired '{{{tone}}}' while maintaining professionalism.

8.  **Call to Action:**
    *   If a '{{{callToAction}}}' is provided, create a visually prominent button-style CTA
    *   If a '{{{callToActionLink}}}' is also provided and is a valid URL, use this '{{{callToActionLink}}}' as the \`href\` value
    *   Otherwise, use '#' as a placeholder for the link URL
    *   Example HTML for a button CTA: <a href="{{{callToActionLink}}}" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: bold; color: white; background-color: #008080; text-align: center; text-decoration: none; border-radius: 5px; margin: 15px 0;">{{{callToAction}}}</a>

**IMPORTANT:** Create engaging, detailed content that tells a story and connects emotionally with readers. Balance depth with scannability.

**Generate ONLY the HTML content for the email body.** Do not include <head>, <body>, or <html> tags. Start directly with the content, such as an <h1> or <p> tag containing the personalized greeting.
`,
});


const generateEmailContentFlow = ai.defineFlow(
  {
    name: 'generateEmailContentFlow',
    inputSchema: GenerateEmailContentInputSchema,
    outputSchema: GenerateEmailContentOutputSchema,
  },
  async (input: GenerateEmailContentInput): Promise<GenerateEmailContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.htmlContent) {
      throw new Error("Failed to generate email content from AI.");
    }

    let finalHtmlContent = output.htmlContent;

    // Fallback: Ensure the {{ contact.FIRSTNAME }} tag is present
    if (!finalHtmlContent.includes('{{ contact.FIRSTNAME }}')) {
      console.warn("AI content missing {{ contact.FIRSTNAME }}. Prepending default greeting.");
      const greeting = input.tone === 'Formal' ? `<h1>Dear {{ contact.FIRSTNAME }},</h1><br/>` : `<h1>Hi {{ contact.FIRSTNAME }},</h1><br/>`;
      finalHtmlContent = greeting + finalHtmlContent;
    }
    
    return { htmlContent: finalHtmlContent };
  }
);
    
