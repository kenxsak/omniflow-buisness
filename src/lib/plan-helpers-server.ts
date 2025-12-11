import 'server-only';
import { adminDb } from '@/lib/firebase-admin';

const featureCheckCache = new Map<string, { enabled: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Server-side helper to check if a company has a specific feature enabled
 * Checks the company's plan and feature flags
 * Includes caching for performance
 * 
 * @param companyId - Company ID
 * @param featureId - Feature ID to check (e.g., 'feat_enterprise_team')
 * @returns true if feature is enabled, false otherwise
 */
export async function isFeatureEnabledServer(
  companyId: string,
  featureId: string
): Promise<boolean> {
  if (!adminDb) {
    console.error('Database not initialized');
    return false;
  }

  const cacheKey = `${companyId}-${featureId}`;
  const cached = featureCheckCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.enabled;
  }

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return false;
    }

    const company = companyDoc.data();
    const planId = company?.planId || 'plan_free';

    const planDoc = await adminDb.collection('plans').doc(planId).get();
    if (!planDoc.exists) {
      return false;
    }

    const plan = planDoc.data();
    const featureIds = plan?.featureIds || [];
    
    const featureDoc = await adminDb.collection('features').doc(featureId).get();
    if (!featureDoc.exists) {
      return false;
    }
    
    const feature = featureDoc.data();
    if (!feature?.active) {
      return false;
    }
    
    const enabled = featureIds.includes(featureId);
    
    featureCheckCache.set(cacheKey, {
      enabled,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    
    return enabled;
  } catch (error) {
    console.error(`Error checking feature ${featureId} for company ${companyId}:`, error);
    return false;
  }
}

/**
 * Server-side guard for enterprise features
 * Throws an error if the company doesn't have the enterprise feature
 * 
 * @param companyId - Company ID
 * @throws Error if enterprise feature is not enabled
 */
export async function assertEnterpriseFeature(companyId: string): Promise<void> {
  const hasFeature = await isFeatureEnabledServer(companyId, 'feat_enterprise_team');
  if (!hasFeature) {
    throw new Error('Enterprise plan required. Please upgrade to access this feature.');
  }
}

/**
 * Clear feature check cache for a specific company or all companies
 * Call this when plan changes are made
 * 
 * @param companyId - Optional company ID (clears all if not provided)
 */
export function clearFeatureCache(companyId?: string): void {
  if (companyId) {
    for (const key of featureCheckCache.keys()) {
      if (key.startsWith(companyId)) {
        featureCheckCache.delete(key);
      }
    }
  } else {
    featureCheckCache.clear();
  }
}

/**
 * Server-side helper to get plan metadata for a company
 * Used for displaying contact usage indicators and limits
 * 
 * @param companyId - Company ID
 * @returns Plan metadata including planId, planName, maxContacts
 */
export async function getPlanMetadata(
  companyId: string
): Promise<{
  planId: string;
  planName: string;
  maxContacts: number | null;
} | null> {
  if (!adminDb) {
    console.error('Database not initialized');
    return null;
  }

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return null;
    }

    const company = companyDoc.data();
    const planId = company?.planId || 'plan_free';

    const planDoc = await adminDb.collection('plans').doc(planId).get();
    if (!planDoc.exists) {
      return {
        planId: 'plan_free',
        planName: 'Free',
        maxContacts: 100
      };
    }

    const plan = planDoc.data();
    return {
      planId: plan?.id || planId,
      planName: plan?.name || 'Free',
      maxContacts: plan?.maxContacts ?? null
    };
  } catch (error) {
    console.error('Error fetching plan metadata:', error);
    return null;
  }
}
