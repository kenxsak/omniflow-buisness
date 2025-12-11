'use server';

/**
 * Tracked AI Assistants - AI assistant features with usage tracking
 */

import { executeTrackedOperation, type TrackedOperationResult } from './ai-tracking-util';
import { aiReviewResponder, type AiReviewResponderInput, type AiReviewResponderOutput } from '@/ai/flows/ai-review-responder';

export async function generateTrackedReviewResponseAction(
  companyId: string,
  userId: string,
  input: AiReviewResponderInput
): Promise<TrackedOperationResult<AiReviewResponderOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Review Responder',
    input,
    aiReviewResponder
  );
}

// Re-export types for convenience
export type { AiReviewResponderInput, AiReviewResponderOutput };
