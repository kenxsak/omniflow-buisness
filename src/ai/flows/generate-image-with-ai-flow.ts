'use server';
/**
 * @fileOverview Image generation using Google's latest Imagen 4 API (2025)
 *
 * - generateImageWithAiFlow - Main function for image generation
 * - GenerateImageWithAiFlowInput - Input type
 * - GenerateImageWithAiFlowOutput - Return type
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageWithAiFlowInputSchema = z.object({
  prompt: z.string().min(1).describe('The text prompt to generate an image from.'),
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).optional().describe('Aspect ratio for the image'),
  apiKey: z.string().optional().describe('Optional Gemini API key to use instead of platform default'),
});
export type GenerateImageWithAiFlowInput = z.infer<typeof GenerateImageWithAiFlowInputSchema>;

const GenerateImageWithAiFlowOutputSchema = z.object({
  imageDataUri: z.string().optional().describe('The generated image as a data URI (e.g., data:image/png;base64,...). Present on success.'),
  error: z.string().optional().describe('An error message if image generation failed.'),
});
export type GenerateImageWithAiFlowOutput = z.infer<typeof GenerateImageWithAiFlowOutputSchema>;

export async function generateImageWithAiFlow(input: GenerateImageWithAiFlowInput): Promise<GenerateImageWithAiFlowOutput> {
  try {
    // Use provided API key if available, otherwise fall back to environment variable
    const API_KEY = input.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    
    if (!API_KEY) {
      return { 
        error: 'Missing GEMINI_API_KEY. Please add your Google AI Studio API key to Replit Secrets.' 
      };
    }

    const aspectRatio = input.aspectRatio || getAspectRatioFromPrompt(input.prompt);

    console.log(`Generating image with Imagen 4 API...`);
    console.log(`Prompt: "${input.prompt}"`);
    console.log(`Aspect ratio: ${aspectRatio}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: input.prompt,
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio,
            personGeneration: 'allow_adult',
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen 4 API error:', response.status, errorText);
      
      if (response.status === 400) {
        const lowerErrorText = errorText.toLowerCase();
        if (lowerErrorText.includes('billing') || lowerErrorText.includes('billed')) {
          return {
            error: `Billing required: Image generation requires billing enabled on your Google Cloud project. The Imagen API is only accessible to billed users. Enable billing at https://console.cloud.google.com/billing`
          };
        }
        if (lowerErrorText.includes('api key') || lowerErrorText.includes('authentication') || lowerErrorText.includes('api_key')) {
          return {
            error: `API key error: Please verify your GEMINI_API_KEY is valid and has access to Imagen 4. Get a new key at https://aistudio.google.com/`
          };
        }
      }
      
      return {
        error: `Image generation failed (${response.status}): ${errorText.substring(0, 200)}`
      };
    }

    const result = await response.json();
    console.log('Imagen 4 API response received');

    if (result.predictions && result.predictions.length > 0) {
      const prediction = result.predictions[0];
      
      if (prediction.bytesBase64Encoded) {
        const imageDataUri = `data:image/png;base64,${prediction.bytesBase64Encoded}`;
        console.log('Image generated successfully!');
        return { imageDataUri };
      }
      
      if (prediction.mimeType && prediction.bytesBase64Encoded) {
        const imageDataUri = `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`;
        console.log('Image generated successfully!');
        return { imageDataUri };
      }
      
      if (prediction.raiFilteredReason) {
        console.warn('Image blocked by safety filter:', prediction.raiFilteredReason);
        return {
          error: `Image blocked by safety filter: ${prediction.raiFilteredReason}. Try modifying your prompt to be less sensitive.`
        };
      }
    }

    console.error('Unexpected API response structure:', JSON.stringify(result).substring(0, 500));
    return {
      error: 'Image generation completed but response format was unexpected. Check console logs for details.'
    };

  } catch (e: any) {
    console.error('Error in generateImageWithAiFlow:', e);
    return { 
      error: `Image generation error: ${e.message || 'An unexpected error occurred.'}` 
    };
  }
}

function getAspectRatioFromPrompt(prompt: string): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('16:9') || lowerPrompt.includes('landscape') || lowerPrompt.includes('wide')) {
    return '16:9';
  } else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('vertical') || lowerPrompt.includes('portrait') || lowerPrompt.includes('story')) {
    return '9:16';
  } else if (lowerPrompt.includes('4:3')) {
    return '4:3';
  } else if (lowerPrompt.includes('3:4')) {
    return '3:4';
  } else if (lowerPrompt.includes('square') || lowerPrompt.includes('1:1')) {
    return '1:1';
  }
  
  return '1:1';
}

const internalImageGenerationFlow = ai.defineFlow(
  {
    name: 'internalGenerateImageWithAiFlow',
    inputSchema: GenerateImageWithAiFlowInputSchema,
    outputSchema: GenerateImageWithAiFlowOutputSchema,
  },
  async (input) => {
    return generateImageWithAiFlow(input);
  }
);
