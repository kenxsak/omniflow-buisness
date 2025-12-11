/**
 * Types for tracking AI API usage, tokens, and costs
 * Supports Gemini 2.0 Flash, Imagen 3, and Gemini TTS
 */

/**
 * Types of AI operations that consume tokens/credits
 */
export type AIOperationType = 
  | 'text_generation'
  | 'image_generation'
  | 'text_to_speech'
  | 'video_generation';

/**
 * AI model identifiers
 */
export type AIModel = 
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'imagen-3'
  | 'imagen-4'
  | 'gemini-tts'
  | 'veo-video';

/**
 * Pricing structure for different AI operations (2025 Google Pricing)
 * All prices in USD
 */
export interface AIPricing {
  // Text generation (per million tokens)
  textGeneration: {
    input: number;  // $0.10 per million tokens
    output: number; // $0.40 per million tokens
  };
  
  // Image generation (per image)
  imageGeneration: {
    imagen3: number;       // $0.03 per image
    imagen4: number;       // $0.04 per image
    imagen4Ultra: number;  // $0.06 per image
  };
  
  // Text-to-speech (per character or per million tokens)
  textToSpeech: {
    perCharacter: number;      // ~$0.000016 per character
    perMillionTokens: number;  // Using token-based pricing
  };
  
  // Video generation (when available)
  videoGeneration: {
    perSecond: number; // TBD when API is available
  };
}

/**
 * Default Google pricing for 2025
 */
export const DEFAULT_AI_PRICING: AIPricing = {
  textGeneration: {
    input: 0.10,  // $0.10 per million input tokens
    output: 0.40, // $0.40 per million output tokens
  },
  imageGeneration: {
    imagen3: 0.03,      // $0.03 per image
    imagen4: 0.04,      // $0.04 per image
    imagen4Ultra: 0.06, // $0.06 per image
  },
  textToSpeech: {
    perCharacter: 0.000016,    // ~$0.000016 per character
    perMillionTokens: 0.10,    // Using input token pricing
  },
  videoGeneration: {
    perSecond: 0,  // Not yet available
  },
};

/**
 * Platform pricing with margin applied
 * This is what we charge users (100% margin = 2x cost)
 */
export const PLATFORM_PRICING_MARGIN = 2.0; // 100% margin

/**
 * Single AI usage record for tracking individual API calls
 */
export interface AIUsageRecord {
  id: string;
  companyId: string;
  userId: string;
  
  // Operation details
  operationType: AIOperationType;
  model: AIModel;
  timestamp: string; // ISO string
  
  // Token/usage metrics
  inputTokens?: number;      // For text generation
  outputTokens?: number;     // For text generation
  totalTokens?: number;      // For text generation (input + output)
  imageCount?: number;       // For image generation
  characterCount?: number;   // For TTS
  audioSeconds?: number;     // For TTS (25 tokens = 1 second)
  videoSeconds?: number;     // For video generation (future)
  
  // Cost tracking (in USD)
  rawCost: number;           // Actual Google API cost
  platformCost: number;      // Cost with our margin applied
  margin: number;            // Our profit on this call
  
  // API key used (company's own or platform's)
  apiKeyType: 'platform' | 'company_owned';
  apiKeyId?: string;         // Reference to the API key used
  
  // Additional metadata
  feature?: string;          // Which feature was used (e.g., 'social_media', 'ads_manager')
  success: boolean;          // Whether the API call succeeded
  errorMessage?: string;     // If failed, what was the error
}

/**
 * Monthly usage summary for a company
 */
export interface MonthlyAIUsageSummary {
  companyId: string;
  month: string; // Format: "YYYY-MM"
  
  // Total usage by operation type
  textGeneration?: {
    totalCalls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    rawCost: number;
    platformCost: number;
  };
  
  imageGeneration?: {
    totalImages: number;
    rawCost: number;
    platformCost: number;
  };
  
  textToSpeech?: {
    totalCalls: number;
    totalCharacters: number;
    totalAudioSeconds: number;
    rawCost: number;
    platformCost: number;
  };
  
  // Overall totals
  totalOperations: number;
  totalRawCost: number;        // What we paid to Google
  totalPlatformCost: number;   // What we charged the user
  totalMargin: number;         // Our profit
  
  // API key breakdown
  platformApiUsage: {
    operations: number;
    cost: number;
  };
  companyOwnedApiUsage: {
    operations: number;
    cost: number;
  };
  
  // Subscription plan info
  planId: string;
  aiCreditsLimit: number;      // Credits allowed per month
  aiCreditsUsed: number;       // Credits consumed (1 credit = 1 operation or configurable)
  aiCreditsRemaining: number;
  
  lastUpdated: string; // ISO string
}

/**
 * Company API key configuration
 * Allows companies to add their own Gemini API keys
 */
export interface CompanyAIApiKey {
  id: string;
  companyId: string;
  
  // Key details
  keyType: 'gemini' | 'vertex_ai';
  apiKey: string;              // Encrypted API key
  projectId?: string;          // For Vertex AI
  
  // Status
  isActive: boolean;
  isPrimary: boolean;          // If true, use this key instead of platform key
  
  // Validation
  lastValidated: string | null;
  isValid: boolean;
  validationError?: string;
  
  // Usage limits (optional - set by company admin)
  monthlyBudgetUSD?: number;
  currentMonthSpend?: number;
  alertThresholdPercent?: number; // Alert when reaching X% of budget
  
  // Metadata
  label?: string;              // Custom label for the key
  createdAt: string;
  createdBy: string;           // User ID who added the key
  updatedAt?: string;
}

/**
 * Real-time usage tracking for rate limiting and quota management
 */
export interface CompanyAIQuota {
  companyId: string;
  currentMonth: string;        // Format: "YYYY-MM"
  
  // Current usage
  operationsThisMonth: number;
  creditsUsed: number;
  estimatedCost: number;
  
  // Limits
  monthlyOperationsLimit: number;
  monthlyCreditsLimit: number;
  monthlyBudgetLimit?: number;
  
  // Warnings
  quotaWarningsSent: string[]; // Timestamps of warning emails sent
  quotaExceeded: boolean;
  budgetExceeded: boolean;
  
  // Reset info
  resetDate: string;           // When quota resets
  lastUpdated: string;
}

/**
 * Super Admin platform-wide statistics
 */
export interface PlatformAIStatistics {
  id: 'platform_stats';
  month: string; // Format: "YYYY-MM"
  
  // Total across all companies
  totalCompanies: number;
  totalOperations: number;
  
  // Cost breakdown
  totalGoogleAPIsCost: number;     // What we paid to Google
  totalRevenueFromUsers: number;   // What we charged users
  totalPlatformProfit: number;     // Our profit
  profitMarginPercent: number;     // Profit / Cost ratio
  
  // Usage by operation type
  textGenerationOperations: number;
  imageGenerationOperations: number;
  ttsOperations: number;
  
  // API key distribution
  companiesUsingPlatformAPI: number;
  companiesUsingOwnAPI: number;
  
  // Top consumers
  topConsumers: Array<{
    companyId: string;
    companyName: string;
    totalCost: number;
    operations: number;
  }>;
  
  lastUpdated: string;
}

/**
 * Configuration for AI credit system
 * Defines how credits map to operations
 */
export interface AICreditConfiguration {
  // Credit cost per operation type
  textGenerationCredits: number;    // e.g., 1 credit per request
  imageGenerationCredits: number;   // e.g., 5 credits per image
  ttsCredits: number;               // e.g., 2 credits per request
  videoGenerationCredits: number;   // e.g., 10 credits per video
  
  // Or use token-based credits
  creditsPerThousandTokens?: number; // e.g., 1 credit per 1000 tokens
}

/**
 * Default credit configuration (UPDATED FOR PROFITABILITY)
 * Based on actual cost ratios:
 * - Text: $0.00065 per request (baseline = 1 credit)
 * - Image: $0.03 per image (46x more expensive = 25 credits, was 5)
 * - TTS: $0.008 per request (12x more expensive = 5 credits, was 2)
 */
export const DEFAULT_CREDIT_CONFIG: AICreditConfiguration = {
  textGenerationCredits: 1,      // 1 credit per text generation request (baseline)
  imageGenerationCredits: 25,    // 25 credits per image (UPDATED: was 5, should be ~50, compromise at 25)
  ttsCredits: 5,                 // 5 credits per TTS request (UPDATED: was 2, should be ~12, compromise at 5)
  videoGenerationCredits: 50,    // 50 credits per video (when available)
};

/**
 * Cost optimization recommendation
 */
export interface CostOptimizationRecommendation {
  companyId: string;
  type: 'api_key' | 'usage_pattern' | 'plan_upgrade' | 'plan_downgrade';
  priority: 'high' | 'medium' | 'low';
  
  title: string;
  description: string;
  potentialSavings?: number;     // Estimated monthly savings in USD
  actionRequired?: string;       // What the user should do
  
  createdAt: string;
  dismissed: boolean;
}

/**
 * Free Tier Limits (Google Gemini AI & Firebase)
 * Updated for 2025 - helps control platform costs
 */
export interface FreeTierLimits {
  // Gemini API Free Tier (per API key)
  gemini: {
    requestsPerMinute: number;      // 15 RPM
    tokensPerMinute: number;        // 1M TPM
    requestsPerDay: number;         // 1,500 RPD
  };
  
  // Firebase Free Tier (Spark Plan - entire project)
  firebase: {
    firestoreReadsPerDay: number;   // 50,000 reads/day
    firestoreWritesPerDay: number;  // 20,000 writes/day
    firestoreDeletesPerDay: number; // 20,000 deletes/day
    storageGB: number;              // 1 GB
    bandwidthGBPerMonth: number;    // 10 GB/month
  };
}

/**
 * Default free tier limits
 */
export const DEFAULT_FREE_TIER_LIMITS: FreeTierLimits = {
  gemini: {
    requestsPerMinute: 15,
    tokensPerMinute: 1_000_000,
    requestsPerDay: 1500,
  },
  firebase: {
    firestoreReadsPerDay: 50000,
    firestoreWritesPerDay: 20000,
    firestoreDeletesPerDay: 20000,
    storageGB: 1,
    bandwidthGBPerMonth: 10,
  },
};

/**
 * Platform Free Tier Usage Tracking
 * Tracks daily usage against free tier limits
 */
export interface PlatformFreeTierUsage {
  id: string;              // Format: "YYYY-MM-DD"
  date: string;
  
  // Gemini API usage (platform-wide)
  geminiRequests: number;
  geminiTokens: number;
  geminiCostSaved: number;          // Estimated cost saved by free tier
  geminiCostPaid: number;           // Actual cost paid (beyond free tier)
  
  // Firebase usage (platform-wide)
  firestoreReads: number;
  firestoreWrites: number;
  firestoreDeletes: number;
  firebaseCostSaved: number;
  firebaseCostPaid: number;
  
  // Total savings
  totalCostSaved: number;
  totalCostPaid: number;
  
  // Thresholds
  geminiFreeTierExhausted: boolean;
  firebaseFreeTierExhausted: boolean;
  
  lastUpdated: string;
}

/**
 * Pricing Configuration for Super Admin
 * Allows dynamic adjustment of pricing, credits, and margins
 */
export interface PricingConfiguration {
  id: 'pricing_config';
  
  // Credit system configuration
  creditConfig: AICreditConfiguration;
  
  // Pricing margins
  platformMargin: number;           // e.g., 2.0 = 100% margin (2x cost)
  
  // AI Pricing overrides (if different from Google's default)
  customPricing?: AIPricing;
  
  // Free tier awareness
  useFreeTierTracking: boolean;     // If true, deduct free tier costs from profitability
  freeTierLimits: FreeTierLimits;
  
  // Emergency controls
  emergencyPauseAI: boolean;        // If true, pause all AI operations platform-wide
  pausedCompanyIds: string[];       // Companies with AI temporarily disabled
  
  // Overage pricing
  overageCreditsEnabled: boolean;   // Allow purchasing extra credits
  overagePricePerThousandCredits: number; // e.g., $5 per 1,000 credits
  
  // Alert thresholds
  quotaWarningPercent: number;      // Alert at 80%
  quotaCriticalPercent: number;     // Alert at 95%
  
  lastUpdatedBy: string;            // User ID who last modified
  lastUpdatedAt: string;
}

/**
 * Overage Charge Tracking
 * Tracks credits used beyond monthly plan limits for billing
 */
export interface AIOverageCharge {
  id: string;                        // Format: "companyId_YYYY-MM"
  companyId: string;
  month: string;                     // Format: "YYYY-MM"
  
  // Plan context
  planId: string;
  planCreditLimit: number;           // Monthly limit from plan
  planOveragePrice: number;          // Price per credit from plan
  
  // Overage tracking
  creditsOverLimit: number;          // Credits used beyond monthly limit
  overageChargeUSD: number;          // Total overage charge in USD
  
  // Breakdown by operation type
  textGenerationOverage: number;
  imageGenerationOverage: number;
  ttsOverage: number;
  videoOverage?: number;  // For future video generation
  
  // Billing status
  billingStatus: 'pending' | 'invoiced' | 'paid' | 'failed' | 'waived';
  stripeInvoiceId?: string;          // Stripe invoice ID when billed
  billedAt?: string;                 // When invoice was created
  paidAt?: string;                   // When payment was received
  failureReason?: string;            // If payment failed
  
  // Metadata
  createdAt: string;
  lastUpdated: string;
}
