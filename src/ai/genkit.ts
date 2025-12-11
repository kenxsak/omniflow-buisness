import 'server-only';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Singleton genkit instance to prevent memory leaks from multiple initializations
let aiInstance: ReturnType<typeof genkit> | null = null;

function initializeAI(): ReturnType<typeof genkit> {
  if (!aiInstance) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('AI API key not configured - AI features may not work');
    }
    
    aiInstance = genkit({
      plugins: [
        googleAI({
          apiKey: apiKey || '',
        }),
      ],
    });
  }
  return aiInstance;
}

// Initialize genkit singleton
export const ai = initializeAI();

// Export model references for consistent usage
export const geminiModel = 'googleai/gemini-2.0-flash';
