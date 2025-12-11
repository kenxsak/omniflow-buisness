import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import type { ActivityType, EntityType } from '@/types/activity';

export interface LogActivityParams {
  companyId: string;
  type: ActivityType;
  description: string;
  entityId: string;
  entityType: EntityType;
  performedBy: string;
  performedByName?: string;
  targetUserId?: string;
  targetUserName?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams): Promise<string | null> {
  if (!adminDb) {
    console.warn('Activity logging: Database not initialized');
    return null;
  }

  try {
    const activityRef = adminDb.collection('activity_logs').doc();
    
    await activityRef.set({
      ...params,
      id: activityRef.id,
      createdAt: new Date().toISOString(),
    });

    return activityRef.id;
  } catch (error: any) {
    console.error('Error logging activity:', error);
    return null;
  }
}

export async function logBulkAssignment(
  companyId: string,
  leadIds: string[],
  assignedToUserId: string,
  assignedToUserName: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  if (!adminDb) return;

  try {
    await logActivity({
      companyId,
      type: 'bulk_assign',
      description: `${leadIds.length} lead(s) assigned to ${assignedToUserName}`,
      entityId: leadIds.join(','),
      entityType: 'lead',
      performedBy,
      performedByName,
      targetUserId: assignedToUserId,
      targetUserName: assignedToUserName,
      metadata: {
        leadCount: leadIds.length,
        leadIds,
      },
    });
  } catch (error: any) {
    console.error('Error logging bulk assignment:', error);
  }
}
