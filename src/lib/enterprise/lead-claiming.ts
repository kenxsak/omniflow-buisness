import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import type { LeadClaimResult, LeadClaimInfo } from '@/types/enterprise';
import { CLAIM_DURATION_MINUTES, CLAIM_EXTEND_MINUTES } from '@/types/enterprise';

export async function claimLead(
  leadId: string,
  userId: string,
  userName: string,
  companyId: string
): Promise<LeadClaimResult> {
  if (!adminDb) {
    return { success: false, message: 'Database not initialized' };
  }

  try {
    const leadRef = adminDb.collection('leads').doc(leadId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      const leadDoc = await transaction.get(leadRef);

      if (!leadDoc.exists) {
        return { success: false, message: 'Lead not found' };
      }

      const leadData = leadDoc.data();
      
      if (leadData?.companyId !== companyId) {
        return { success: false, message: 'Unauthorized: Lead belongs to another company' };
      }

      const now = new Date();
      const currentClaim = leadData?.claimedBy;
      const claimExpiry = leadData?.claimExpiry ? new Date(leadData.claimExpiry) : null;

      if (currentClaim && currentClaim !== userId) {
        if (claimExpiry && claimExpiry > now) {
          return {
            success: false,
            message: `Lead is currently being edited by another user`,
            claimedByOther: {
              userId: currentClaim,
              userName: leadData?.claimedByName || 'Another user',
              expiresAt: claimExpiry.toISOString(),
            },
          };
        }
      }

      const expiryTime = new Date(now.getTime() + CLAIM_DURATION_MINUTES * 60 * 1000);

      transaction.update(leadRef, {
        claimedBy: userId,
        claimedByName: userName,
        claimedAt: now.toISOString(),
        claimExpiry: expiryTime.toISOString(),
      });

      return {
        success: true,
        message: `Lead claimed for ${CLAIM_DURATION_MINUTES} minutes`,
        claimInfo: {
          claimedBy: userId,
          claimedByName: userName,
          claimedAt: now.toISOString(),
          claimExpiry: expiryTime.toISOString(),
          isLocked: true,
        },
      };
    });

    if (result.success) {
      await logClaimActivity(companyId, leadId, userId, userName, 'claim');
    }

    return result;
  } catch (error: any) {
    console.error('Error claiming lead:', error);
    return { success: false, message: error?.message || 'Failed to claim lead' };
  }
}

export async function releaseLead(
  leadId: string,
  userId: string,
  companyId: string,
  userRole?: string
): Promise<LeadClaimResult> {
  if (!adminDb) {
    return { success: false, message: 'Database not initialized' };
  }

  try {
    const leadRef = adminDb.collection('leads').doc(leadId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      const leadDoc = await transaction.get(leadRef);

      if (!leadDoc.exists) {
        return { success: false, message: 'Lead not found' };
      }

      const leadData = leadDoc.data();
      
      if (leadData?.companyId !== companyId) {
        return { success: false, message: 'Unauthorized: Lead belongs to another company' };
      }

      const isAdmin = userRole && ['admin', 'superadmin'].includes(userRole);
      const isOwner = leadData?.claimedBy === userId;

      if (!isOwner && !isAdmin) {
        return { success: false, message: 'Cannot release a lead claimed by another user' };
      }

      if (!leadData?.claimedBy) {
        return { success: false, message: 'Lead is not currently claimed' };
      }

      transaction.update(leadRef, {
        claimedBy: null,
        claimedByName: null,
        claimedAt: null,
        claimExpiry: null,
      });

      return {
        success: true,
        message: 'Lead released successfully',
        claimInfo: {
          claimedBy: null,
          claimedAt: null,
          claimExpiry: null,
          isLocked: false,
        },
      };
    });

    if (result.success) {
      await logClaimActivity(companyId, leadId, userId, '', 'release');
    }

    return result;
  } catch (error: any) {
    console.error('Error releasing lead:', error);
    return { success: false, message: error?.message || 'Failed to release lead' };
  }
}

export async function extendClaimLead(
  leadId: string,
  userId: string,
  companyId: string
): Promise<LeadClaimResult> {
  if (!adminDb) {
    return { success: false, message: 'Database not initialized' };
  }

  try {
    const leadRef = adminDb.collection('leads').doc(leadId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      const leadDoc = await transaction.get(leadRef);

      if (!leadDoc.exists) {
        return { success: false, message: 'Lead not found' };
      }

      const leadData = leadDoc.data();
      
      if (leadData?.companyId !== companyId) {
        return { success: false, message: 'Unauthorized' };
      }

      if (leadData?.claimedBy !== userId) {
        return { success: false, message: 'You do not have this lead claimed' };
      }

      const now = new Date();
      const currentExpiry = leadData?.claimExpiry ? new Date(leadData.claimExpiry) : null;
      
      if (!currentExpiry || currentExpiry < now) {
        return { success: false, message: 'Claim has already expired' };
      }

      const newExpiry = new Date(now.getTime() + CLAIM_EXTEND_MINUTES * 60 * 1000);

      transaction.update(leadRef, {
        claimExpiry: newExpiry.toISOString(),
      });

      return {
        success: true,
        message: `Claim extended by ${CLAIM_EXTEND_MINUTES} minutes`,
        claimInfo: {
          claimedBy: userId,
          claimedByName: leadData?.claimedByName,
          claimedAt: leadData?.claimedAt,
          claimExpiry: newExpiry.toISOString(),
          isLocked: true,
        },
      };
    });

    return result;
  } catch (error: any) {
    console.error('Error extending claim:', error);
    return { success: false, message: error?.message || 'Failed to extend claim' };
  }
}

export async function getLeadClaimStatus(
  leadId: string,
  companyId: string
): Promise<LeadClaimInfo | null> {
  if (!adminDb) {
    return null;
  }

  try {
    const leadDoc = await adminDb.collection('leads').doc(leadId).get();

    if (!leadDoc.exists) {
      return null;
    }

    const leadData = leadDoc.data();
    
    if (leadData?.companyId !== companyId) {
      return null;
    }

    const now = new Date();
    const claimExpiry = leadData?.claimExpiry ? new Date(leadData.claimExpiry) : null;
    const isLocked = !!(leadData?.claimedBy && claimExpiry && claimExpiry > now);

    return {
      claimedBy: isLocked ? leadData.claimedBy : null,
      claimedByName: isLocked ? leadData.claimedByName : undefined,
      claimedAt: isLocked ? leadData.claimedAt : null,
      claimExpiry: isLocked ? leadData.claimExpiry : null,
      isLocked,
    };
  } catch (error) {
    console.error('Error getting claim status:', error);
    return null;
  }
}

export async function cleanupExpiredClaims(companyId: string): Promise<number> {
  if (!adminDb) {
    return 0;
  }

  try {
    const now = new Date().toISOString();
    
    const expiredLeads = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('claimExpiry', '<', now)
      .get();

    const leadsWithClaims = expiredLeads.docs.filter(doc => doc.data().claimedBy != null);

    if (leadsWithClaims.length === 0) {
      return 0;
    }

    const batch = adminDb.batch();
    leadsWithClaims.forEach((doc) => {
      batch.update(doc.ref, {
        claimedBy: null,
        claimedByName: null,
        claimedAt: null,
        claimExpiry: null,
      });
    });

    await batch.commit();
    return leadsWithClaims.length;
  } catch (error) {
    console.error('Error cleaning up expired claims:', error);
    return 0;
  }
}

async function logClaimActivity(
  companyId: string,
  leadId: string,
  userId: string,
  userName: string,
  action: 'claim' | 'release'
): Promise<void> {
  if (!adminDb) return;

  try {
    await adminDb.collection('audit_logs').add({
      companyId,
      entityType: 'lead',
      entityId: leadId,
      action,
      performedBy: userId,
      performedByName: userName,
      timestamp: new Date().toISOString(),
      severity: 'info',
      metadata: {
        claimDurationMinutes: action === 'claim' ? CLAIM_DURATION_MINUTES : null,
      },
    });
  } catch (error) {
    console.error('Error logging claim activity:', error);
  }
}
