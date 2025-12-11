'use server';

/**
 * AI Overage Billing System
 * 
 * Tracks credits used beyond monthly plan limits and calculates overage charges.
 * Integrates with payment processor for automatic billing.
 */

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import type { AIOverageCharge, AIOperationType } from '@/types/ai-usage';
import type { Plan } from '@/types/saas';

/**
 * Track overage usage when a company exceeds their monthly credit limit
 */
export async function trackOverageUsage(
  companyId: string,
  planId: string,
  creditLimit: number,
  overagePrice: number,
  creditsUsed: number,
  operationType: AIOperationType
): Promise<{ success: boolean; overageCharge?: number; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // Only track overage if usage exceeds limit
    const creditsOverLimit = Math.max(0, creditsUsed - creditLimit);
    if (creditsOverLimit <= 0) {
      return { success: true, overageCharge: 0 };
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const overageId = `${companyId}_${currentMonth}`;
    const overageRef = doc(serverDb, 'aiOverageCharges', overageId);

    // Check if overage record exists
    const overageSnap = await getDoc(overageRef);

    if (!overageSnap.exists()) {
      // Create new overage record with correct field names
      const newOverage: Omit<AIOverageCharge, 'id'> = {
        companyId,
        month: currentMonth,
        planId,
        planCreditLimit: creditLimit,
        planOveragePrice: overagePrice,
        creditsOverLimit,
        overageChargeUSD: creditsOverLimit * overagePrice,
        textGenerationOverage: operationType === 'text_generation' ? creditsOverLimit : 0,
        imageGenerationOverage: operationType === 'image_generation' ? creditsOverLimit : 0,
        ttsOverage: operationType === 'text_to_speech' ? creditsOverLimit : 0,
        billingStatus: 'pending',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(overageRef, {
        ...newOverage,
        id: overageId,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      console.log(`✅ Overage tracked: ${companyId} - ${creditsOverLimit} credits = $${(creditsOverLimit * overagePrice).toFixed(4)}`);

      return {
        success: true,
        overageCharge: creditsOverLimit * overagePrice,
      };
    } else {
      // Update existing overage record with proper field mapping
      const currentOverage = overageSnap.data() as AIOverageCharge;
      const additionalCredits = creditsUsed - creditLimit - currentOverage.creditsOverLimit;

      if (additionalCredits > 0) {
        // Map operation type to correct field name
        const fieldMap: Record<AIOperationType, string> = {
          'text_generation': 'textGenerationOverage',
          'image_generation': 'imageGenerationOverage',
          'text_to_speech': 'ttsOverage',
          'video_generation': 'videoOverage',
        };

        const overageField = fieldMap[operationType] || 'textGenerationOverage';

        await updateDoc(overageRef, {
          creditsOverLimit: increment(additionalCredits),
          overageChargeUSD: increment(additionalCredits * overagePrice),
          [overageField]: increment(additionalCredits),
          lastUpdated: serverTimestamp(),
        });

        console.log(`📈 Overage updated: ${companyId} - +${additionalCredits} credits = +$${(additionalCredits * overagePrice).toFixed(4)}`);

        return {
          success: true,
          overageCharge: (currentOverage.creditsOverLimit + additionalCredits) * overagePrice,
        };
      }

      return {
        success: true,
        overageCharge: currentOverage.overageChargeUSD,
      };
    }
  } catch (error: any) {
    console.error('Error tracking overage:', error);
    return {
      success: false,
      error: error.message || 'Failed to track overage',
    };
  }
}

/**
 * Get current overage charge for a company
 */
export async function getCurrentOverageCharge(
  companyId: string,
  month?: string
): Promise<{ success: boolean; overage?: AIOverageCharge; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const overageId = `${companyId}_${currentMonth}`;
    const overageRef = doc(serverDb, 'aiOverageCharges', overageId);

    const overageSnap = await getDoc(overageRef);

    if (!overageSnap.exists()) {
      return { success: true, overage: undefined };
    }

    return {
      success: true,
      overage: overageSnap.data() as AIOverageCharge,
    };
  } catch (error: any) {
    console.error('Error getting overage charge:', error);
    return {
      success: false,
      error: error.message || 'Failed to get overage charge',
    };
  }
}

/**
 * Mark overage as invoiced (when Stripe invoice is created)
 */
export async function markOverageInvoiced(
  companyId: string,
  month: string,
  stripeInvoiceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const overageId = `${companyId}_${month}`;
    const overageRef = doc(serverDb, 'aiOverageCharges', overageId);

    await updateDoc(overageRef, {
      billingStatus: 'invoiced',
      stripeInvoiceId,
      billedAt: new Date().toISOString(),
      lastUpdated: serverTimestamp(),
    });

    console.log(`💳 Overage invoiced: ${companyId} - Invoice ${stripeInvoiceId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error marking overage as invoiced:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark overage as invoiced',
    };
  }
}

/**
 * Mark overage as paid (when Stripe payment is received)
 */
export async function markOveragePaid(
  companyId: string,
  month: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const overageId = `${companyId}_${month}`;
    const overageRef = doc(serverDb, 'aiOverageCharges', overageId);

    await updateDoc(overageRef, {
      billingStatus: 'paid',
      paidAt: new Date().toISOString(),
      lastUpdated: serverTimestamp(),
    });

    console.log(`✅ Overage paid: ${companyId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error marking overage as paid:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark overage as paid',
    };
  }
}

/**
 * Waive overage charges (SuperAdmin only)
 */
export async function waiveOverageCharge(
  companyId: string,
  month: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const overageId = `${companyId}_${month}`;
    const overageRef = doc(serverDb, 'aiOverageCharges', overageId);

    await updateDoc(overageRef, {
      billingStatus: 'waived',
      failureReason: reason || 'Waived by administrator',
      lastUpdated: serverTimestamp(),
    });

    console.log(`🎁 Overage waived: ${companyId} - ${reason || 'No reason provided'}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error waiving overage charge:', error);
    return {
      success: false,
      error: error.message || 'Failed to waive overage charge',
    };
  }
}

/**
 * Get total platform overage revenue for a month
 * (SuperAdmin dashboard use)
 */
export async function getPlatformOverageRevenue(
  month?: string
): Promise<{ success: boolean; totalRevenue?: number; pendingRevenue?: number; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    // In a production system, this would query all overage records for the month
    // For now, returning placeholder values
    // TODO: Implement aggregation query across all companies
    
    return {
      success: true,
      totalRevenue: 0,
      pendingRevenue: 0,
    };
  } catch (error: any) {
    console.error('Error getting platform overage revenue:', error);
    return {
      success: false,
      error: error.message || 'Failed to get platform overage revenue',
    };
  }
}
