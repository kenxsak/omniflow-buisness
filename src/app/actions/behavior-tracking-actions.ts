'use server';

/**
 * Behavior Tracking Server Actions
 * 
 * Server actions for tracking and managing user behavior metrics.
 * These actions are used by the recommendation engine to provide
 * personalized quick action suggestions.
 */

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { UserBehaviorMetrics, FeatureUsageStats } from '@/types/behavior';
import { classifyUserStage } from '@/lib/recommendation-engine';

/**
 * Initialize behavior metrics for a new company
 * Called when a company is created or on first dashboard visit
 */
export async function initializeBehaviorMetrics(
  companyId: string
): Promise<{ success: boolean; data?: UserBehaviorMetrics; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const now = new Date().toISOString();
    
    const initialMetrics: UserBehaviorMetrics = {
      companyId,
      lastLoginAt: now,
      loginFrequency: 'monthly',
      totalLogins: 1,
      featureUsage: [],
      campaignEngagement: {
        emailsSentCount: 0,
        smsSentCount: 0,
        whatsappSentCount: 0,
      },
      digitalCard: {
        hasDigitalCard: false,
        cardCompleteness: 0,
        cardViewsLast30Days: 0,
        cardLeadsGenerated: 0,
      },
      crmIntegration: {
        hasHubspot: false,
        hasZoho: false,
        hasBitrix24: false,
        totalLeadsSynced: 0,
      },
      automation: {
        hasAutomations: false,
        automationsCount: 0,
        automationRunsLast30Days: 0,
      },
      aiUsageStats: {
        totalAIOperations: 0,
        aiUsageFrequency: 'none',
      },
      leadMetrics: {
        totalLeads: 0,
        leadsAddedLast30Days: 0,
      },
      analyticsEngagement: {
        analyticsViewsLast30Days: 0,
      },
      userStage: 'new',
      lastUpdatedAt: now,
      createdAt: now,
    };

    const metricsRef = doc(serverDb, 'behaviorMetrics', companyId);
    await setDoc(metricsRef, initialMetrics);

    return { success: true, data: initialMetrics };
  } catch (error: any) {
    console.error('Error initializing behavior metrics:', error);
    return { success: false, error: error.message || 'Failed to initialize behavior metrics' };
  }
}

/**
 * Get user behavior metrics for a company
 * Returns existing metrics or initializes new ones if they don't exist
 */
export async function getUserBehaviorMetrics(
  companyId: string
): Promise<{ success: boolean; data?: UserBehaviorMetrics; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const metricsRef = doc(serverDb, 'behaviorMetrics', companyId);
    const metricsSnap = await getDoc(metricsRef);

    if (!metricsSnap.exists()) {
      // Initialize metrics if they don't exist
      return await initializeBehaviorMetrics(companyId);
    }

    const metrics = metricsSnap.data() as UserBehaviorMetrics;
    
    // Ensure userStage is up to date
    const currentStage = classifyUserStage(metrics);
    if (currentStage !== metrics.userStage) {
      metrics.userStage = currentStage;
      await updateDoc(metricsRef, { userStage: currentStage });
    }

    return { success: true, data: metrics };
  } catch (error: any) {
    console.error('Error getting behavior metrics:', error);
    return { success: false, error: error.message || 'Failed to get behavior metrics' };
  }
}

/**
 * Update user behavior metrics
 * Accepts partial updates and merges with existing data
 */
export async function updateUserBehaviorMetrics(
  companyId: string,
  updates: Partial<UserBehaviorMetrics>
): Promise<{ success: boolean; data?: UserBehaviorMetrics; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const metricsRef = doc(serverDb, 'behaviorMetrics', companyId);
    const metricsSnap = await getDoc(metricsRef);

    if (!metricsSnap.exists()) {
      // Initialize if doesn't exist
      return await initializeBehaviorMetrics(companyId);
    }

    const currentMetrics = metricsSnap.data() as UserBehaviorMetrics;
    
    // Merge updates
    const updatedMetrics: UserBehaviorMetrics = {
      ...currentMetrics,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
    
    // Recalculate user stage
    updatedMetrics.userStage = classifyUserStage(updatedMetrics);
    
    // Recalculate login frequency
    updatedMetrics.loginFrequency = calculateLoginFrequency(
      updatedMetrics.totalLogins,
      updatedMetrics.createdAt
    );
    
    // Determine most used feature
    if (updatedMetrics.featureUsage.length > 0) {
      const mostUsed = updatedMetrics.featureUsage.reduce((prev, current) => 
        (current.usageCount > prev.usageCount) ? current : prev
      );
      updatedMetrics.mostUsedFeature = mostUsed.featureName;
    }
    
    await updateDoc(metricsRef, updatedMetrics as any);

    return { success: true, data: updatedMetrics };
  } catch (error: any) {
    console.error('Error updating behavior metrics:', error);
    return { success: false, error: error.message || 'Failed to update behavior metrics' };
  }
}

/**
 * Track feature usage
 * Updates or adds feature usage statistics
 */
export async function trackFeatureUsage(
  companyId: string,
  featureName: string,
  timeSpent?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const metricsRef = doc(serverDb, 'behaviorMetrics', companyId);
    const metricsSnap = await getDoc(metricsRef);

    if (!metricsSnap.exists()) {
      // Initialize if doesn't exist
      await initializeBehaviorMetrics(companyId);
      // Then track the feature usage
      return await trackFeatureUsage(companyId, featureName, timeSpent);
    }

    const metrics = metricsSnap.data() as UserBehaviorMetrics;
    const now = new Date().toISOString();
    
    // Find existing feature usage or create new entry
    const existingFeatureIndex = metrics.featureUsage.findIndex(
      f => f.featureName === featureName
    );
    
    let updatedFeatureUsage: FeatureUsageStats[];
    
    if (existingFeatureIndex >= 0) {
      // Update existing feature
      updatedFeatureUsage = [...metrics.featureUsage];
      updatedFeatureUsage[existingFeatureIndex] = {
        ...updatedFeatureUsage[existingFeatureIndex],
        lastUsedAt: now,
        usageCount: updatedFeatureUsage[existingFeatureIndex].usageCount + 1,
        totalTimeSpent: timeSpent 
          ? (updatedFeatureUsage[existingFeatureIndex].totalTimeSpent || 0) + timeSpent
          : updatedFeatureUsage[existingFeatureIndex].totalTimeSpent,
      };
    } else {
      // Add new feature
      updatedFeatureUsage = [
        ...metrics.featureUsage,
        {
          featureName,
          lastUsedAt: now,
          usageCount: 1,
          totalTimeSpent: timeSpent,
        },
      ];
    }
    
    // Update metrics with new feature usage
    await updateUserBehaviorMetrics(companyId, {
      featureUsage: updatedFeatureUsage,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error tracking feature usage:', error);
    return { success: false, error: error.message || 'Failed to track feature usage' };
  }
}

/**
 * Track login event
 * Updates login count and last login timestamp
 */
export async function trackLogin(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const metricsRef = doc(serverDb, 'behaviorMetrics', companyId);
    const metricsSnap = await getDoc(metricsRef);

    if (!metricsSnap.exists()) {
      // Initialize with login
      return await initializeBehaviorMetrics(companyId);
    }

    const metrics = metricsSnap.data() as UserBehaviorMetrics;
    
    await updateUserBehaviorMetrics(companyId, {
      lastLoginAt: new Date().toISOString(),
      totalLogins: metrics.totalLogins + 1,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error tracking login:', error);
    return { success: false, error: error.message || 'Failed to track login' };
  }
}

/**
 * Calculate login frequency based on total logins and account age
 */
function calculateLoginFrequency(
  totalLogins: number,
  createdAt: string
): UserBehaviorMetrics['loginFrequency'] {
  const accountAgeInDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );
  
  const loginsPerDay = totalLogins / accountAgeInDays;
  
  if (loginsPerDay >= 0.8) return 'daily';
  if (loginsPerDay >= 0.3) return 'weekly';
  if (loginsPerDay >= 0.1) return 'monthly';
  return 'dormant';
}
