# AI Usage Tracking Integration Guide

## ✅ UPDATE: Ready-to-Use Tracked Actions Available!

**New in this release:** We've created pre-built tracked server actions in `src/app/actions/tracked-ai-actions.ts` that you can use immediately. No manual integration required!

### Available Actions:
- `generateTrackedImageAction` - Image generation with automatic tracking
- `generateTrackedSocialContentAction` - Social media content generation with tracking  
- `generateTrackedTTSAction` - Text-to-speech with tracking
- `checkAIQuotaAction` - Check quota before operations
- `getAIUsageAnalyticsAction` - Get usage analytics

**See "Using Pre-Built Tracked Actions" section below for examples.**

---

## Overview

This guide explains how to integrate AI usage tracking and cost management into your AI flows to ensure all operations are tracked, quota limits are enforced, and costs are accurately calculated.

## Quick Start

### Option 1: Using Pre-Built Tracked Actions (Easiest)

Import and use the pre-built tracked actions directly in your UI components:

```typescript
'use client';

import { generateTrackedImageAction } from '@/app/actions/tracked-ai-actions';
import { useAuth } from '@/hooks/use-auth';

export default function MyComponent() {
  const { appUser, company } = useAuth();
  
  const handleGenerateImage = async (prompt: string) => {
    if (!appUser || !company) return;
    
    const result = await generateTrackedImageAction(
      company.id,
      appUser.uid,
      { prompt, aspectRatio: '1:1' },
      'my_feature_name' // Optional: for analytics
    );
    
    if (result.success) {
      console.log('Image generated:', result.imageDataUri);
      console.log('Quota remaining:', result.quotaInfo?.remaining);
    } else {
      console.error('Error:', result.error);
    }
  };
  
  return <button onClick={() => handleGenerateImage('A sunset')}>Generate</button>;
}
```

**Benefits:**
- ✅ Automatic quota checking
- ✅ Usage tracking only on success
- ✅ Cost calculation with margins
- ✅ Company API key support
- ✅ No manual integration needed

### Option 2: Using the AI Wrapper (For Custom Flows)

The `executeAIOperation` wrapper automatically handles quota checking, usage tracking, and cost calculation:

```typescript
import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from '@/app/actions/ai-api-key-actions';

export async function myAIFeatureAction(
  userId: string,
  companyId: string,
  input: MyInput
): Promise<ActionResult> {
  // Get the appropriate API key (company's own or platform)
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

  // Execute with automatic tracking
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation', // or 'image_generation', 'text_to_speech'
    model: 'gemini-2.0-flash',
    feature: 'my_feature_name', // For analytics
    apiKeyType,
    
    // Your actual AI operation
    operation: async () => {
      try {
        // Make your AI API call here
        const response = await fetch(/* ... */);
        
        if (!response.ok) {
          return {
            success: false,
            error: 'AI operation failed',
          };
        }

        const data = await response.json();

        return {
          success: true,
          data: /* your result */,
          // Token metrics for tracking
          inputTokens: estimateTokenCount(input.text),
          outputTokens: estimateTokenCount(data.text),
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}
```

### Option 2: Manual Integration

If you prefer manual control:

```typescript
import { checkAIQuota, trackAIUsage } from '@/lib/ai-usage-tracker';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';

export async function myManualAIAction(
  userId: string,
  companyId: string,
  input: MyInput
): Promise<ActionResult> {
  // Step 1: Check quota BEFORE making AI call
  const quotaCheck = await checkAIQuota(companyId);
  
  if (!quotaCheck.allowed) {
    return {
      success: false,
      error: quotaCheck.message || 'AI quota exceeded',
    };
  }

  // Step 2: Make the AI call
  let inputTokens = 0;
  let outputTokens = 0;
  let success = false;
  let resultData;
  let errorMessage;

  try {
    inputTokens = estimateTokenCount(input.text);
    
    const response = await fetch(/* ... */);
    
    if (response.ok) {
      const data = await response.json();
      outputTokens = estimateTokenCount(data.text);
      resultData = data;
      success = true;
    } else {
      errorMessage = 'API call failed';
    }
  } catch (error: any) {
    errorMessage = error.message;
  }

  // Step 3: Track usage (ONLY deducts credits/costs if successful)
  await trackAIUsage({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    inputTokens,
    outputTokens,
    apiKeyType: 'platform', // or 'company_owned'
    feature: 'my_feature',
    success,
    errorMessage,
  });

  if (!success) {
    return { success: false, error: errorMessage };
  }

  return { success: true, data: resultData };
}
```

## Integration Examples by Operation Type

### Text Generation (Gemini 2.0 Flash)

```typescript
import { estimateTokenCount } from '@/lib/ai-cost-calculator';

// In your AI flow:
const inputText = "Your prompt here";
const inputTokens = estimateTokenCount(inputText);

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: inputText }] }]
    })
  }
);

const data = await response.json();
const outputText = data.candidates[0].content.parts[0].text;
const outputTokens = estimateTokenCount(outputText);

// Track with accurate token counts
return {
  success: true,
  data: outputText,
  inputTokens,
  outputTokens,
};
```

### Image Generation (Imagen 3)

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
  {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: input.prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1' }
    })
  }
);

const result = await response.json();

if (result.predictions && result.predictions.length > 0) {
  return {
    success: true,
    data: `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`,
    imageCount: 1, // Track image count
  };
}
```

### Text-to-Speech (Gemini TTS)

```typescript
const textToSpeak = "Hello, world!";
const characterCount = textToSpeak.length;

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: textToSpeak }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    })
  }
);

const result = await response.json();

return {
  success: true,
  data: result.candidates[0].content.parts[0].inlineData.data,
  characterCount, // Track character count
  audioSeconds: Math.ceil(characterCount / 25), // 25 tokens = 1 second
};
```

## Company-Owned API Keys

Allow companies to use their own Gemini API keys to save on platform costs:

```typescript
import { getGeminiApiKeyForCompany } from '@/app/actions/ai-api-key-actions';

// Get the right API key (company's own or platform)
const { apiKey, type } = await getGeminiApiKeyForCompany(companyId);

// Use in executeAIOperation
const result = await executeAIOperation({
  companyId,
  userId,
  operationType: 'text_generation',
  model: 'gemini-2.0-flash',
  apiKeyType: type, // 'platform' or 'company_owned'
  operation: async () => {
    // Use the apiKey variable for the API call
    const response = await fetch(`...?key=${apiKey}`, /* ... */);
    // ...
  },
});
```

## Quota Management

### Check Quota Before Operation

```typescript
import { checkAIQuota } from '@/lib/ai-usage-tracker';

const quota = await checkAIQuota(companyId);

if (!quota.allowed) {
  // Show user-friendly message
  return {
    success: false,
    error: `You've used ${quota.limit} of ${quota.limit} AI credits this month. Please upgrade your plan or wait until next month.`,
  };
}
```

### Get Usage Analytics

```typescript
import { getAIUsageAnalytics } from '@/lib/ai-usage-tracker';

const analytics = await getAIUsageAnalytics(companyId, 3); // Last 3 months

if (analytics.success) {
  console.log('Current quota:', analytics.currentQuota);
  console.log('Monthly summaries:', analytics.data);
}
```

## Cost Calculation

All costs are calculated automatically based on Google's 2025 pricing with 100% margin:

- **Gemini 2.0 Flash**: $0.10/M input tokens, $0.40/M output tokens (2x = $0.20/$0.80)
- **Imagen 3**: $0.03 per image (2x = $0.06)
- **Gemini TTS**: ~$0.000016 per character (2x = ~$0.000032)

```typescript
import {
  calculateTextGenerationCost,
  calculateImageGenerationCost,
  calculateTTSCost,
} from '@/lib/ai-cost-calculator';

// Calculate cost for a specific operation
const cost = calculateTextGenerationCost(1000, 2000);
// {
//   rawCost: 0.0009,      // What we pay Google
//   platformCost: 0.0018, // What we charge users
//   margin: 0.0009        // Our profit
// }
```

## Best Practices

1. **Always use `executeAIOperation` wrapper** for new features - it handles everything automatically
2. **Track token counts accurately** - use `estimateTokenCount()` for text or actual counts from API responses
3. **Handle quota exceeded gracefully** - show clear upgrade prompts to users
4. **Check quota BEFORE making expensive AI calls** - prevents wasted API calls
5. **Only track successful operations for billing** - failed calls should not deduct credits
6. **Use company-owned API keys when available** - saves platform costs
7. **Monitor usage patterns** - use analytics to suggest plan upgrades

## Testing

Test the complete flow:

```typescript
// 1. Check quota works
const quota = await checkAIQuota('company_id');
console.log('Quota remaining:', quota.remaining);

// 2. Make tracked AI call
const result = await executeAIOperation({/* ... */});

// 3. Verify tracking
const analytics = await getAIUsageAnalytics('company_id');
console.log('Usage tracked:', analytics.data[0].totalOperations);

// 4. Test quota exceeded
// (manually set quota to 0 in Firestore and verify blocking works)
```

## Migration Checklist

To integrate tracking into existing AI flows:

- [ ] Replace direct AI API calls with `executeAIOperation` wrapper
- [ ] Add `companyId` and `userId` parameters to all AI action functions
- [ ] Import and use `getGeminiApiKeyForCompany` for API key retrieval
- [ ] Add token/image/character count tracking
- [ ] Test quota checking and blocking
- [ ] Test with company-owned API keys
- [ ] Verify analytics and cost calculation
- [ ] Update UI to show quota usage and limits

## Troubleshooting

**Quota not being tracked:**
- Verify `executeAIOperation` is being called
- Check Firestore for `aiUsage` collection documents
- Ensure `success: true` is being returned

**Costs seem incorrect:**
- Verify token counts are accurate
- Check Google's latest pricing
- Review `src/types/ai-usage.ts` pricing constants

**Company API key not working:**
- Verify key is validated and marked as `isPrimary: true`
- Check encryption/decryption is working
- Ensure `useOwnGeminiApiKey: true` in company document
