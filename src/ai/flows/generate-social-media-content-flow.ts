
'use server';
/**
 * @fileOverview A Genkit flow for generating social media content using AI.
 *
 * - generateSocialMediaContent - A function that handles social media content generation.
 * - GenerateSocialMediaContentInput - The input type.
 * - GenerateSocialMediaContentOutput - The return type.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSocialMediaContentInputSchema = z.object({
  topic: z.string().optional().describe('The main topic, theme, or user prompt. For Sales Pages, this is the primary instruction for the AI.'),
  platform: z.enum(['BlogPost', 'TwitterX', 'Instagram', 'LinkedIn', 'Facebook', 'YouTubeVideoScript', 'SalesLandingPage'])
    .describe('The target social media platform for the content.'),
  tone: z.enum(['Formal', 'Casual', 'Humorous', 'Inspirational', 'Professional', 'Witty', 'Urgent'])
    .describe('The desired tone of voice for the content.'),
  // The following fields are now optional for more flexibility, especially for sales pages
  goal: z.string().optional().describe('The primary objective of the post.'),
  keywords: z.string().optional().describe('Comma-separated list of keywords to try and include (especially for Blog Posts or Sales Page for SEO).'),
  callToAction: z.string().optional().describe('The desired call to action (e.g., Visit our website, Learn more, Shop now, Comment below).'),
  
  includeHashtags: z.boolean().optional().default(true).describe('Whether to include relevant hashtags (for applicable platforms).'),
  numVariations: z.number().min(1).max(3).optional().default(1).describe('Number of content variations to generate (1-3).'),
  blogPostApproximateWords: z.number().min(50).optional().describe("Target approximate word count for the blog post section (e.g., 500, 1000). Relevant only if platform is 'BlogPost'."),
  targetLanguage: z.string().optional().default('English').describe('The desired language for the output content (e.g., "Spanish", "Hindi", "French", "German"). Default is English if not specified.'),
  
  // Existing HTML content for editing sales pages or blogs
  salesPageContent: z.string().optional().describe('Optional: The full HTML content of a previously generated sales page or blog post. If provided, the "topic" field will be treated as an editing instruction.'),
  
  // New field for website URL to include in blogs
  websiteUrl: z.string().url().optional().describe('The base URL of the user\'s website, for creating backlinks in blog posts.'),
});
export type GenerateSocialMediaContentInput = z.infer<typeof GenerateSocialMediaContentInputSchema>;

const SocialMediaPostVariationSchema = z.object({
    textContent: z.string().describe('The AI-generated text content. For BlogPost or YouTubeVideoScript, this will be the main article/script. For others, it is the post text/caption.'),
    suggestedImagePrompt: z.string().optional().describe('A concise, descriptive prompt for an AI image generation model to create a relevant visual. Example: "A flat lay of a laptop, notebook, and coffee cup on a wooden desk, minimalist style, bright lighting, square aspect ratio". Include aspect ratio hints.'),
    suggestedVideoScriptIdea: z.string().optional().describe('For platforms other than YouTubeVideoScript, a brief (1-3 sentence) idea for a short video. For YouTubeVideoScript, the detailed script is in textContent.'),
    // YouTube Specific fields - populated only when platform is 'YouTubeVideoScript'
    suggestedVideoTitle: z.string().optional().describe('A compelling and SEO-friendly title for the YouTube video.'),
    suggestedVideoDescription: z.string().optional().describe('A well-structured YouTube video description, including key points, relevant links (placeholders), and a call to action.'),
    suggestedVideoKeywordsTags: z.array(z.string()).optional().describe('An array of 5-10 relevant keywords/tags for the YouTube video.'),
    suggestedVideoHashtags: z.array(z.string()).optional().describe('An array of 3-5 relevant hashtags for the YouTube video description.'),
    suggestedVideoThumbnailPrompt: z.string().optional().describe('A specific text prompt for generating an engaging YouTube thumbnail image (16:9 aspect ratio).'),
});
export type SocialMediaPostVariation = z.infer<typeof SocialMediaPostVariationSchema>;

const GenerateSocialMediaContentOutputSchema = z.object({
  variations: z.array(SocialMediaPostVariationSchema).describe('An array of generated social media post variations.')
});
export type GenerateSocialMediaContentOutput = z.infer<typeof GenerateSocialMediaContentOutputSchema>;

export async function generateSocialMediaContent(input: GenerateSocialMediaContentInput): Promise<GenerateSocialMediaContentOutput> {
  return generateSocialMediaContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSocialMediaContentPrompt',
  input: { schema: GenerateSocialMediaContentInputSchema },
  output: { schema: GenerateSocialMediaContentOutputSchema },
  model: geminiModel,
  prompt: `You are an expert content strategist, SEO specialist, and full-stack web developer with a keen eye for modern, professional design. Generate {{{numVariations}}} variation(s) of content for the specified platform.

**Overall User Inputs:**
-   Target Platform: {{{platform}}}
-   Desired Tone: {{{tone}}}
-   User Prompt / Topic / Editing Request: {{{topic}}}
-   Base HTML Content (if any): {{{salesPageContent}}}
-   Target Language (Default is English): {{{targetLanguage}}}
-   User's Website URL (for backlinks): {{{websiteUrl}}}

**General Instruction:** Generate all text-based outputs in the '{{{targetLanguage}}}' if provided. Otherwise, generate in English.

**Output Instructions (For EACH variation, populate these fields for the 'variations' array):**

**1.  textContent:**
    *   Adapt the language and style to the specified '{{{tone}}}'.

    *   **Platform Specifics for 'textContent':**
        *   **If Platform is 'BlogPost':**
            *   Act as an expert SEO and content marketer. Your task is to generate a complete, SEO-optimized, mobile-friendly HTML blog post.
            *   **Analyze the User's Prompt:** Use '{{{topic}}}' as the core subject for the blog post.
            *   **Create or Edit:**
                *   If '{{{salesPageContent}}}' is provided, treat it as the base HTML. The '{{{topic}}}' is an **editing instruction**. Modify the existing HTML based on this prompt.
                *   If '{{{salesPageContent}}}' is NOT provided, generate a new blog post from scratch.
            *   **Generate a COMPLETE, single-file HTML document.** The output MUST be valid HTML, including \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, and \`<body>\` tags.
            *   **In the \`<head>\` section, you MUST include:**
                *   An SEO-optimized \`<title>\` tag based on the '{{{topic}}}'.
                *   A compelling \`<meta name="description" content="...">\` that summarizes the article.
                *   A complete \`<style>\` tag with embedded CSS for a clean, professional, readable, mobile-first blog layout. Use a professional, legible sans-serif font stack like 'GeistSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'. Ensure styles for headings, paragraphs, links, and lists are well-defined.
            *   **In the \`<body>\` section, generate a well-structured article with the following elements:**
                *   A clear \`<h1>\` headline based on the '{{{topic}}}'.
                *   **A hero image section below the headline.** Use a placeholder like \`<img src="https://placehold.co/1200x600.png" alt="[AI-generated alt text based on topic]" ...>\`.
                *   An engaging introduction.
                *   Multiple sections with descriptive \`<h2>\` and \`<h3>\` subheadings that use related keywords.
                *   Informative paragraphs with bolding (\`<strong>\`) for emphasis on key terms.
                *   Bulleted or numbered lists (\`<ul>\`, \`<ol>\`) for clarity.
                *   **Backlinks:** Naturally weave in 2-3 hyperlinks (\`<a href="...">\`) back to the user's main website ('{{{websiteUrl}}}').
                *   A concluding summary.
                *   A call to action, if provided in '{{{callToAction}}}'.
                 *   A simple, single-line footer with a copyright notice. Do NOT use a complex, multi-column footer for blog posts.
            *   **SEO & Content:**
                *   If '{{{keywords}}}' are provided, integrate them naturally.
                *   The content should be well-researched, informative, and provide genuine value to the reader, similar to high-quality blogs on platforms like Medium.
            *   The 'textContent' field in the output must contain this full HTML string.

        *   **If Platform is 'SalesLandingPage':**
            *   Act as an expert UI/UX Designer and Frontend Developer. Your mission is to take a simple user prompt about their business (e.g., "a sales page for my SaaS product OmniFlow") and expand it into a complete, modern, and professional sales landing page, mirroring the quality of the static \`/pricing\` page.
            *   **Analyze the User's Prompt:** Use '{{{topic}}}' as the core concept. Intelligently generate compelling copy for all sections based on this simple idea. Use '{{{keywords}}}' for SEO.
            *   **Create or Edit:**
                *   If '{{{salesPageContent}}}' is provided, treat it as the base HTML. The '{{{topic}}}' is an **editing instruction**. Modify the existing HTML based on this prompt.
                *   If '{{{salesPageContent}}}' is NOT provided, generate a new sales page from scratch.
            *   **Generate a COMPLETE, single-file HTML document.** The output MUST be valid HTML, including \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, and \`<body>\` tags.
            *   **In the \`<head>\` section, you MUST include:**
                *   A \`<title>\` tag derived from the '{{{topic}}}'.
                *   A \`<meta name="description" content="...">\` tag.
                *   A complete \`<style>\` tag with embedded CSS. The CSS must be modern, clean, mobile-first, and support **both light and dark modes** using a \`@media (prefers-color-scheme: dark)\` query. The design must use a professional font stack like 'GeistSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'. Use the provided CSS variables for colors (e.g., var(--primary)).
            *   **In the \`<body>\` section, generate a page with ALL OF THE FOLLOWING SECTIONS:**
                *   **Responsive Header:** Include a logo placeholder and navigation. The menu MUST collapse into a **hamburger menu on mobile devices**.
                *   **Hero Section:** A compelling hero with a top badge, main headline (H1), sub-headline, two CTA buttons, and a **placeholder hero image**.
                *   **Key Features Grid:** A responsive grid showcasing 4-6 key product features with **inline SVG icons** and short descriptions.
                *   **Testimonials Section:** A grid with 2-3 customer testimonials. Use placeholder names, quotes, and placeholder images.
                *   **Pricing Section:** A grid of 3-4 pricing tiers. One plan should be marked as "Most Popular."
                *   **FAQ (Accordion):** An interactive accordion-style FAQ section answering 4-5 common questions.
                *   **Final Call-to-Action (CTA) Section:** A final, strong CTA to encourage sign-ups.
                *   **Multi-Column Footer:** A comprehensive footer with columns for Product, Company, and Legal links, and a copyright notice.
            *   **SVG Icon Library (for your reference):** When generating feature icons, use these SVG strings.
                *   CRM: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\`
                *   AI Content: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.41 1.41L9.17 3 7.76 4.41 9.17 5.83 7.76 7.24 9.17 8.66 7.76 10.07 9.17 11.5 7.76 12.91 9.17 14.33l-1.41 1.41L9.17 17.17l-1.41 1.41L9.17 20l-1.41 1.41L12 21l1.41-1.41L14.83 21l1.41-1.41L14.83 18.17l1.41-1.41L14.83 15.34l1.41-1.41L14.83 12.5l1.41-1.41L14.83 9.67l1.41-1.41L14.83 6.83l1.41-1.41L14.83 4l1.41-1.41L12 3Z"/><path d="M8 12h8"/><path d="M8 16h4"/></svg>\`
                *   Marketing: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 1.94a2 2 0 0 1 1.06 1.06L13 13"/><path d="M13 13l5.5-5.5"/><path d="m3 3 1.94 7.07a2 2 0 0 0 1.06 1.06L13 13"/><path d="M13 13l-5.5 5.5"/></svg>\`
                *   Analytics: \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>\`
            *   Include a **small, safe JavaScript snippet** at the end of the \`<body>\` to handle the hamburger menu's click functionality and the FAQ accordion.
            *   Ensure the entire page is well-structured with semantic tags and is **fully mobile-responsive**.

        *   **If Platform is 'YouTubeVideoScript':**
            *   Create a detailed video script with scene descriptions, voice-over, and on-screen text suggestions based on '{{{topic}}}'.
        *   **For other platforms (TwitterX, Instagram, etc.):**
            *   Generate concise and engaging post text suitable for the platform based on '{{{topic}}}'.

**2.  suggestedImagePrompt:** (Required for 'BlogPost' and 'SalesLandingPage')
    *   Provide a concise, descriptive text prompt for an AI image generator to create a relevant hero image. Include aspect ratio hints.

**3.  suggestedVideoScriptIdea:** (Not required for 'SalesLandingPage' or 'BlogPost')
    *   Provide a brief video concept if the platform is not 'YouTubeVideoScript'.

**4.  YouTube-specific fields:** Populate these only when platform is 'YouTubeVideoScript'.

Generate the content now, following these platform-specific instructions precisely. For 'SalesLandingPage' and 'BlogPost', remember to generate a complete and valid HTML file as a single string.
`,
});

const generateSocialMediaContentFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaContentFlow',
    inputSchema: GenerateSocialMediaContentInputSchema,
    outputSchema: GenerateSocialMediaContentOutputSchema,
  },
  async (input: GenerateSocialMediaContentInput): Promise<GenerateSocialMediaContentOutput> => {
    const { output } = await prompt(input);
    if (!output || !output.variations) {
      throw new Error("Failed to generate social media content from AI.");
    }
    return { variations: output.variations };
  }
);
    
