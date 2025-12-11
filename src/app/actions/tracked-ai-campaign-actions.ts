'use server';

/**
 * Tracked AI Campaign Actions - Campaign and task management with usage tracking
 */

import { executeTrackedOperation, type TrackedOperationResult } from './ai-tracking-util';
import { generateTaskSuggestions, type GenerateTaskSuggestionsInput, type GenerateTaskSuggestionsOutput } from '@/ai/flows/generate-task-suggestions-flow';
import { parseCampaignBrief, type ParseCampaignBriefOutput } from '@/ai/flows/parse-campaign-brief-flow';
import { generateUnifiedCampaign, type GenerateUnifiedCampaignOutput } from '@/ai/flows/generate-unified-campaign-flow';

export async function generateTrackedTaskSuggestionsAction(
  companyId: string,
  userId: string,
  input: GenerateTaskSuggestionsInput
): Promise<TrackedOperationResult<GenerateTaskSuggestionsOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Task Suggestion AI',
    input,
    generateTaskSuggestions
  );
}

export async function generateTrackedUnifiedCampaignAction(
  companyId: string,
  userId: string,
  campaignPrompt: string
): Promise<TrackedOperationResult<ParseCampaignBriefOutput & GenerateUnifiedCampaignOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Unified Campaign Generator',
    { campaignPrompt },
    async (input: { campaignPrompt: string; apiKey?: string }) => {
      // Parse the campaign brief
      const parsedBrief = await parseCampaignBrief({ campaignPrompt: input.campaignPrompt });

      // Generate unified campaign content
      const campaignContent = await generateUnifiedCampaign(parsedBrief);

      return {
        ...parsedBrief,
        ...campaignContent,
      };
    }
  );
}
