'use server';

import { checkRateLimit } from './rate-limiter';

export interface ApiProtectionResult {
  allowed: boolean;
  error?: string;
  statusCode?: number;
}

interface RequestContext {
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
}

const SUSPICIOUS_PATTERNS = [
  /(<script|javascript:|on\w+=)/i,
  /(union\s+select|drop\s+table|delete\s+from)/i,
  /(eval\(|document\.cookie)/i,
  /(\.\.\/)/, 
];

export async function detectSuspiciousInput(input: string): Promise<boolean> {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

function sanitizeForLoggingSync(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'creditCard', 'ssn', 'accessToken', 'refreshToken',
    'geminiApiKey', 'stripeSecretKey', 'razorpaySecret',
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLoggingSync(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export async function sanitizeForLogging(data: Record<string, any>): Promise<Record<string, any>> {
  return sanitizeForLoggingSync(data);
}

export async function protectApiAction(context: RequestContext): Promise<ApiProtectionResult> {
  const identifier = context.userId || context.ipAddress || 'anonymous';

  const rateLimitResult = await checkRateLimit(identifier, context.action);
  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
      statusCode: 429,
    };
  }

  return { allowed: true };
}

export async function logSecurityEvent(
  event: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access',
  details: Record<string, any>
): Promise<void> {
  const sanitizedDetails = sanitizeForLogging(details);
  
  console.warn(`[SECURITY EVENT] ${event}:`, JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...sanitizedDetails,
  }));
}

export async function validateCompanyAccess(
  requestCompanyId: string,
  userCompanyId: string
): Promise<boolean> {
  return requestCompanyId === userCompanyId;
}

export async function generateCSRFToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateCSRFToken(token: string, storedToken: string): Promise<boolean> {
  if (!token || !storedToken) return false;
  if (token.length !== storedToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}
