import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTopicSuggestions } from '@/ai/flows/get-trending-topic-suggestions-flow';
import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from '@/app/actions/ai-api-key-actions';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessNiche, contentType, companyId, userId } = body;

    if (!companyId || !userId || !businessNiche) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

    const result = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'Trending Topics',
      apiKeyType,
      operation: async () => {
        const output = await getTrendingTopicSuggestions({
          businessNiche,
          contentType: contentType || 'BlogPost',
          planningHorizon: 'Weekly',
          targetRegion: 'Global'
        });

        if (!output || !output.suggestions || output.suggestions.length === 0) {
          return { success: false, error: 'Failed to get trending topics' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(JSON.stringify({ businessNiche })),
          outputTokens: estimateTokenCount(JSON.stringify(output))
        };
      }
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to get trending topics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestions: result.data.suggestions,
      creditsConsumed: result.quotaInfo?.consumed || 0
    });
  } catch (error: any) {
    console.error('Trending topics API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
