/**
 * @fileOverview Quota definitions and types for email automation rate limiting.
 * Prevents runaway email sends, provider bans, and runaway costs.
 */

export interface AutomationQuotas {
  maxEmailsPerDay: number;
  maxEmailsPerHour: number;
  maxConcurrentSends: number;
  maxFailuresBeforeStop: number;
}

/**
 * Plan-based quota configurations.
 * These limits prevent abuse and align with subscription tiers.
 */
export const PLAN_QUOTAS: Record<string, AutomationQuotas> = {
  plan_free: {
    maxEmailsPerDay: 50,
    maxEmailsPerHour: 10,
    maxConcurrentSends: 2,
    maxFailuresBeforeStop: 5,
  },
  plan_starter: {
    maxEmailsPerDay: 500,
    maxEmailsPerHour: 50,
    maxConcurrentSends: 5,
    maxFailuresBeforeStop: 10,
  },
  plan_pro: {
    maxEmailsPerDay: 5000,
    maxEmailsPerHour: 200,
    maxConcurrentSends: 10,
    maxFailuresBeforeStop: 20,
  },
  plan_enterprise: {
    maxEmailsPerDay: 50000,
    maxEmailsPerHour: 2000,
    maxConcurrentSends: 50,
    maxFailuresBeforeStop: 50,
  },
};

/**
 * Default quotas for companies without a recognized plan.
 * Conservative limits to prevent abuse.
 */
export const DEFAULT_QUOTAS: AutomationQuotas = {
  maxEmailsPerDay: 100,
  maxEmailsPerHour: 20,
  maxConcurrentSends: 3,
  maxFailuresBeforeStop: 10,
};

/**
 * Quota tracking data stored in Company document.
 */
export interface QuotaTracking {
  emailsSentToday: number;
  emailsSentThisHour: number;
  lastDailyReset: string; // ISO timestamp
  lastHourlyReset: string; // ISO timestamp
  consecutiveFailures: number;
  circuitBreakerTrippedAt?: string; // ISO timestamp when circuit breaker was triggered
  lastEmailSentAt?: string; // ISO timestamp of last successful send
}

/**
 * Initial quota tracking state for new companies.
 */
export const INITIAL_QUOTA_TRACKING: QuotaTracking = {
  emailsSentToday: 0,
  emailsSentThisHour: 0,
  lastDailyReset: new Date().toISOString(),
  lastHourlyReset: new Date().toISOString(),
  consecutiveFailures: 0,
};
