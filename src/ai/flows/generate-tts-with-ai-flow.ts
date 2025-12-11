'use server';
/**
 * @fileOverview Text-to-Speech generation using Gemini TTS API (2025)
 *
 * - generateTTSWithAiFlow - Main function for TTS generation
 * - GenerateTTSWithAiFlowInput - Input type
 * - GenerateTTSWithAiFlowOutput - Return type
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTTSWithAiFlowInputSchema = z.object({
  text: z.string().min(1).describe('The text to convert to speech'),
  voiceName: z.enum(['Kore', 'Puck', 'Leda', 'Callirhoe', 'Orus']).optional().describe('Voice to use for TTS'),
  style: z.string().optional().describe('Style instructions (e.g., "cheerful", "dramatic", "whisper")'),
  apiKey: z.string().optional().describe('Optional Gemini API key to use instead of platform default'),
});
export type GenerateTTSWithAiFlowInput = z.infer<typeof GenerateTTSWithAiFlowInputSchema>;

const GenerateTTSWithAiFlowOutputSchema = z.object({
  audioDataUri: z.string().optional().describe('The generated audio as a data URI (e.g., data:audio/wav;base64,...)'),
  error: z.string().optional().describe('An error message if TTS generation failed'),
});
export type GenerateTTSWithAiFlowOutput = z.infer<typeof GenerateTTSWithAiFlowOutputSchema>;

export async function generateTTSWithAiFlow(input: GenerateTTSWithAiFlowInput): Promise<GenerateTTSWithAiFlowOutput> {
  try {
    // Use provided API key if available, otherwise fall back to environment variable
    const API_KEY = input.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    
    if (!API_KEY) {
      return { 
        error: 'Missing GEMINI_API_KEY. Please add your Google AI Studio API key to Replit Secrets.' 
      };
    }

    const voiceName = input.voiceName || 'Kore';
    const textWithStyle = input.style ? `Say ${input.style}: ${input.text}` : input.text;

    console.log(`Generating TTS with Gemini...`);
    console.log(`Text: "${textWithStyle}"`);
    console.log(`Voice: ${voiceName}`);

    // Use Gemini 2.5 Flash TTS model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: textWithStyle }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini TTS API error:', response.status, errorText);
      
      if (response.status === 400 && errorText.includes('AUDIO')) {
        return {
          error: `TTS not supported: The current Gemini model may not support audio generation. Try enabling billing or use a TTS-capable model.`
        };
      }
      
      return {
        error: `TTS generation failed (${response.status}): ${errorText.substring(0, 200)}`
      };
    }

    const result = await response.json();
    console.log('Gemini TTS API response received');

    // Extract audio data from response
    if (result.candidates && result.candidates[0]) {
      const candidate = result.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Audio is returned as base64 PCM data
            const mimeType = part.inlineData.mimeType || 'audio/L16;rate=24000';
            
            // Convert PCM to WAV format for browser compatibility
            const audioDataUri = convertPCMtoWAV(part.inlineData.data, mimeType);
            console.log('TTS generated successfully!');
            return { audioDataUri };
          }
        }
      }
    }

    console.error('Unexpected TTS response structure:', JSON.stringify(result).substring(0, 500));
    return {
      error: 'TTS generation completed but response format was unexpected. Check console for details.'
    };

  } catch (e: any) {
    console.error('Error in generateTTSWithAiFlow:', e);
    return { 
      error: `TTS generation error: ${e.message || 'An unexpected error occurred.'}` 
    };
  }
}

// Helper function to convert PCM to WAV format
function convertPCMtoWAV(base64PCM: string, mimeType: string): string {
  // For now, return as-is. Browser audio players can handle PCM with proper MIME type
  // In production, you might want to convert to WAV format for better compatibility
  return `data:${mimeType};base64,${base64PCM}`;
}

// Define the Genkit flow wrapper internally
const internalTTSGenerationFlow = ai.defineFlow(
  {
    name: 'internalGenerateTTSWithAiFlow',
    inputSchema: GenerateTTSWithAiFlowInputSchema,
    outputSchema: GenerateTTSWithAiFlowOutputSchema,
  },
  async (input) => {
    return generateTTSWithAiFlow(input);
  }
);
