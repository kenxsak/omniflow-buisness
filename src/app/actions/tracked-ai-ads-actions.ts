'use server';

/**
 * Tracked AI Ads Actions - Ad platform content generation with usage tracking
 */

import { executeTrackedOperation, type TrackedOperationResult } from './ai-tracking-util';
import { generateGoogleAdsKeywords, type GenerateGoogleAdsKeywordsInput, type GenerateGoogleAdsKeywordsOutput } from '@/ai/flows/generate-google-ads-keywords-flow';
import { generateGoogleSearchAdCopy, type GenerateGoogleSearchAdCopyInput, type GenerateGoogleSearchAdCopyOutput } from '@/ai/flows/generate-google-search-ad-copy-flow';
import { generateFacebookInstagramAdContent, type GenerateFacebookInstagramAdContentInput, type GenerateFacebookInstagramAdContentOutput } from '@/ai/flows/generate-facebook-instagram-ad-content-flow';
import { generateLinkedInAdContent, type GenerateLinkedInAdContentInput, type GenerateLinkedInAdContentOutput } from '@/ai/flows/generate-linkedin-ad-content-flow';
import { generateTiktokReelsAdContent, type GenerateTiktokReelsAdContentInput, type GenerateTiktokReelsAdContentOutput } from '@/ai/flows/generate-tiktok-reels-ad-content-flow';
import { generateYouTubeAdContent, type GenerateYouTubeAdContentInput, type GenerateYouTubeAdContentOutput } from '@/ai/flows/generate-youtube-ad-content-flow';

export async function generateTrackedGoogleAdsKeywordsAction(
  companyId: string,
  userId: string,
  input: GenerateGoogleAdsKeywordsInput
): Promise<TrackedOperationResult<GenerateGoogleAdsKeywordsOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Google Ads Keywords',
    input,
    generateGoogleAdsKeywords
  );
}

export async function generateTrackedGoogleSearchAdCopyAction(
  companyId: string,
  userId: string,
  input: GenerateGoogleSearchAdCopyInput
): Promise<TrackedOperationResult<GenerateGoogleSearchAdCopyOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Google Ads Copy',
    input,
    generateGoogleSearchAdCopy
  );
}

export async function generateTrackedFacebookAdAction(
  companyId: string,
  userId: string,
  input: GenerateFacebookInstagramAdContentInput
): Promise<TrackedOperationResult<GenerateFacebookInstagramAdContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Facebook/IG Ads',
    input,
    generateFacebookInstagramAdContent
  );
}

export async function generateTrackedLinkedInAdAction(
  companyId: string,
  userId: string,
  input: GenerateLinkedInAdContentInput
): Promise<TrackedOperationResult<GenerateLinkedInAdContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'LinkedIn Ads',
    input,
    generateLinkedInAdContent
  );
}

export async function generateTrackedTiktokReelsAdAction(
  companyId: string,
  userId: string,
  input: GenerateTiktokReelsAdContentInput
): Promise<TrackedOperationResult<GenerateTiktokReelsAdContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'TikTok/Reels Ads',
    input,
    generateTiktokReelsAdContent
  );
}

export async function generateTrackedYouTubeAdAction(
  companyId: string,
  userId: string,
  input: GenerateYouTubeAdContentInput
): Promise<TrackedOperationResult<GenerateYouTubeAdContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'YouTube Ads',
    input,
    generateYouTubeAdContent
  );
}
