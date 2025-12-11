'use server';

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'send-email': { max: 500, windowMs: 3600000 },
  'send-sms': { max: 1000, windowMs: 3600000 },
  'send-whatsapp': { max: 100, windowMs: 3600000 },
  'login': { max: 5, windowMs: 300000 },
  'signup': { max: 3, windowMs: 300000 },
  'create-lead': { max: 100, windowMs: 3600000 },
  'create-contact': { max: 100, windowMs: 3600000 },
  'update-contact': { max: 200, windowMs: 3600000 },
  'delete-contact': { max: 50, windowMs: 3600000 },
  'ai-generation': { max: 50, windowMs: 3600000 },
  'image-generation': { max: 20, windowMs: 3600000 },
  'api-request': { max: 1000, windowMs: 60000 },
  'password-reset': { max: 3, windowMs: 3600000 },
  'export-data': { max: 10, windowMs: 3600000 },
  'import-data': { max: 5, windowMs: 3600000 },
  'campaign-send': { max: 10, windowMs: 3600000 },
  'default': { max: 100, windowMs: 60000 },
};

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  identifier: string,
  action: string = 'default'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const key = `${identifier}:${action}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  if (entry.count >= config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  };
}

export async function getRateLimitStatus(
  identifier: string,
  action: string = 'default'
): Promise<{ remaining: number; resetTime: number; limit: number }> {
  const config = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const key = `${identifier}:${action}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    return {
      remaining: config.max,
      resetTime: now + config.windowMs,
      limit: config.max,
    };
  }

  return {
    remaining: Math.max(0, config.max - entry.count),
    resetTime: entry.resetTime,
    limit: config.max,
  };
}

export async function resetRateLimit(identifier: string, action: string = 'default'): Promise<void> {
  const key = `${identifier}:${action}`;
  rateLimitStore.delete(key);
}

export async function getRateLimitConfig(action: string): Promise<RateLimitConfig> {
  return RATE_LIMITS[action] || RATE_LIMITS['default'];
}

export async function enforceRateLimit(
  identifier: string,
  action: string = 'default'
): Promise<{ success: true } | { success: false; error: string; retryAfter: number }> {
  const result = await checkRateLimit(identifier, action);
  
  if (!result.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded for ${action}. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter || 60,
    };
  }

  return { success: true };
}
