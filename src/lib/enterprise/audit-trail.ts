import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import type { AuditLogEntry, AuditAction } from '@/types/enterprise';
import * as admin from 'firebase-admin';

export interface LogAuditParams {
  companyId: string;
  entityType: AuditLogEntry['entityType'];
  entityId: string;
  action: AuditAction;
  performedBy: string;
  performedByName?: string;
  performedByEmail?: string;
  performedByRole?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export async function logAuditEntry(params: LogAuditParams): Promise<string | null> {
  if (!adminDb) {
    console.warn('Audit logging: Database not initialized');
    return null;
  }

  try {
    const auditRef = adminDb.collection('audit_logs').doc();
    
    const entry: Omit<AuditLogEntry, 'id'> & { id: string } = {
      id: auditRef.id,
      companyId: params.companyId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      performedByRole: params.performedByRole,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date().toISOString(),
      severity: params.severity || 'info',
    };

    await auditRef.set(entry);
    return auditRef.id;
  } catch (error: any) {
    console.error('Error logging audit entry:', error);
    return null;
  }
}

export async function getAuditLogs(
  companyId: string,
  options?: {
    entityType?: AuditLogEntry['entityType'];
    entityId?: string;
    action?: AuditAction;
    performedBy?: string;
    startDate?: string;
    endDate?: string;
    severity?: 'info' | 'warning' | 'critical';
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  if (!adminDb) {
    return { logs: [], total: 0 };
  }

  try {
    let queryRef: admin.firestore.Query = adminDb
      .collection('audit_logs')
      .where('companyId', '==', companyId);

    if (options?.entityType) {
      queryRef = queryRef.where('entityType', '==', options.entityType);
    }

    if (options?.entityId) {
      queryRef = queryRef.where('entityId', '==', options.entityId);
    }

    if (options?.action) {
      queryRef = queryRef.where('action', '==', options.action);
    }

    if (options?.performedBy) {
      queryRef = queryRef.where('performedBy', '==', options.performedBy);
    }

    if (options?.severity) {
      queryRef = queryRef.where('severity', '==', options.severity);
    }

    queryRef = queryRef.orderBy('timestamp', 'desc');

    if (options?.limit) {
      queryRef = queryRef.limit(options.limit);
    }

    const snapshot = await queryRef.get();
    
    const logs: AuditLogEntry[] = [];
    snapshot.forEach((doc) => {
      logs.push(doc.data() as AuditLogEntry);
    });

    if (options?.startDate || options?.endDate) {
      const startDate = options.startDate ? new Date(options.startDate) : new Date(0);
      const endDate = options.endDate ? new Date(options.endDate) : new Date();
      
      const filteredLogs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });
      
      return { logs: filteredLogs, total: filteredLogs.length };
    }

    return { logs, total: logs.length };
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
}

export async function getAuditLogsForEntity(
  companyId: string,
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const result = await getAuditLogs(companyId, {
    entityType,
    entityId,
    limit,
  });
  return result.logs;
}

export async function getRecentAuditActivity(
  companyId: string,
  hoursBack: number = 24
): Promise<AuditLogEntry[]> {
  const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  
  const result = await getAuditLogs(companyId, {
    startDate,
    limit: 100,
  });
  return result.logs;
}

export async function getCriticalAuditEvents(
  companyId: string,
  daysBack: number = 7
): Promise<AuditLogEntry[]> {
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  
  const result = await getAuditLogs(companyId, {
    severity: 'critical',
    startDate,
    limit: 100,
  });
  return result.logs;
}

export async function getUserActivityReport(
  companyId: string,
  userId: string,
  daysBack: number = 30
): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  recentLogs: AuditLogEntry[];
}> {
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  
  const result = await getAuditLogs(companyId, {
    performedBy: userId,
    startDate,
    limit: 500,
  });

  const actionsByType: Record<string, number> = {};
  result.logs.forEach((log) => {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
  });

  return {
    totalActions: result.total,
    actionsByType,
    recentLogs: result.logs.slice(0, 50),
  };
}

export async function exportAuditLogs(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<AuditLogEntry[]> {
  const result = await getAuditLogs(companyId, {
    startDate,
    endDate,
    limit: 10000,
  });
  return result.logs;
}

export function formatAuditLogForDisplay(log: AuditLogEntry): string {
  const actionVerbs: Record<AuditAction, string> = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    view: 'viewed',
    assign: 'assigned',
    unassign: 'unassigned',
    claim: 'claimed',
    release: 'released',
    status_change: 'changed status of',
    bulk_assign: 'bulk assigned',
    bulk_delete: 'bulk deleted',
    bulk_update: 'bulk updated',
    export: 'exported',
    import: 'imported',
    login: 'logged in',
    logout: 'logged out',
    invite_user: 'invited user to',
    remove_user: 'removed user from',
    change_role: 'changed role in',
    change_plan: 'changed plan for',
    api_access: 'accessed API for',
  };

  const verb = actionVerbs[log.action] || log.action;
  const performer = log.performedByName || log.performedByEmail || 'Unknown user';
  
  return `${performer} ${verb} ${log.entityType} (${log.entityId})`;
}
