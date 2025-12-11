'use server';

/**
 * Server actions for overage billing with SERVER-SIDE AUTHORIZATION
 * 
 * SECURITY: All actions verify user authentication and authorization server-side
 * - getCompanyOverageAction: Verifies user can only access their own company data
 * - waiveCompanyOverageAction: Verifies user is a superadmin before allowing waiver
 */

import { getCurrentOverageCharge, waiveOverageCharge } from '@/lib/ai-overage-tracker';
import { getUserFromServerSession } from '@/lib/firebase-admin';
import type { AIOverageCharge } from '@/types/ai-usage';

/**
 * Get current month's overage charge for a company
 * 
 * SECURITY: Verifies server-side that user is authenticated and authorized to view this company's data
 */
export async function getCompanyOverageAction(
  companyId: string
): Promise<{ success: boolean; overage?: AIOverageCharge; error?: string }> {
  if (!companyId) {
    return { success: false, error: 'Company ID required' };
  }

  // SERVER-SIDE AUTH: Verify user session
  const authResult = await getUserFromServerSession();
  if (!authResult.success) {
    return { success: false, error: `Unauthorized: ${authResult.error}` };
  }

  // AUTHORIZATION: User can only view their own company's overage (unless superadmin)
  if (authResult.user.companyId !== companyId && authResult.user.role !== 'superadmin') {
    return { 
      success: false, 
      error: 'Forbidden: Cannot access another company\'s overage data' 
    };
  }

  return await getCurrentOverageCharge(companyId);
}

/**
 * Waive overage charge (SuperAdmin ONLY)
 * 
 * SECURITY: Verifies server-side that user is a superadmin before allowing waiver
 */
export async function waiveCompanyOverageAction(
  companyId: string,
  month: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!companyId || !month) {
    return { success: false, error: 'Company ID and month required' };
  }

  // SERVER-SIDE AUTH: Verify user session
  const authResult = await getUserFromServerSession();
  if (!authResult.success) {
    return { success: false, error: `Unauthorized: ${authResult.error}` };
  }

  // AUTHORIZATION: Only superadmins can waive charges
  if (authResult.user.role !== 'superadmin') {
    return { 
      success: false, 
      error: 'Forbidden: Only superadmins can waive overage charges' 
    };
  }

  return await waiveOverageCharge(companyId, month, reason);
}
