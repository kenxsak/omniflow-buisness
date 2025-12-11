'use server';

/**
 * Tracked AI Media Actions - Image and audio generation with usage tracking
 */

import { executeTrackedOperation, type TrackedOperationResult } from './ai-tracking-util';
import { generateImageWithAiFlow, type GenerateImageWithAiFlowInput, type GenerateImageWithAiFlowOutput } from '@/ai/flows/generate-image-with-ai-flow';
import { generateTTSWithAiFlow, type GenerateTTSWithAiFlowInput, type GenerateTTSWithAiFlowOutput } from '@/ai/flows/generate-tts-with-ai-flow';

export async function generateTrackedImageAction(
  companyId: string,
  userId: string,
  input: GenerateImageWithAiFlowInput
): Promise<TrackedOperationResult<GenerateImageWithAiFlowOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'image_generation',
    'imagen-4',
    'Image Generator',
    input,
    generateImageWithAiFlow
  );
}

export async function generateTrackedTTSAction(
  companyId: string,
  userId: string,
  input: GenerateTTSWithAiFlowInput
): Promise<TrackedOperationResult<GenerateTTSWithAiFlowOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_to_speech',
    'gemini-tts',
    'TTS Generator',
    input,
    generateTTSWithAiFlow
  );
}
