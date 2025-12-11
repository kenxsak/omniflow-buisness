import { NextRequest, NextResponse } from 'next/server';
import { aiReviewResponder } from '@/ai/flows/ai-review-responder';
import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from '@/app/actions/ai-api-key-actions';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewText, sentiment, businessName, companyId, userId } = body;

    if (!companyId || !userId || !reviewText || !sentiment || !businessName) {
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
      feature: 'Review Responder',
      apiKeyType,
      operation: async () => {
        const output = await aiReviewResponder({
          reviewText,
          sentiment: sentiment as 'positive' | 'negative' | 'neutral',
          businessName
        });

        if (!output || !output.response) {
          return { success: false, error: 'Failed to generate review response' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(JSON.stringify({ reviewText, sentiment, businessName })),
          outputTokens: estimateTokenCount(output.response)
        };
      }
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate review response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: result.data.response,
      creditsConsumed: result.quotaInfo?.consumed || 0
    });
  } catch (error: any) {
    console.error('Review response API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
