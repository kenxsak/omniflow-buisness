'use client';

export interface LeadClaimInfo {
  claimedBy: string | null;
  claimedByName?: string;
  claimedAt: string | null;
  claimExpiry: string | null;
  isLocked: boolean;
}

export interface LeadClaimResult {
  success: boolean;
  message: string;
  claimInfo?: LeadClaimInfo;
  claimedByOther?: {
    userId: string;
    userName: string;
    expiresAt: string;
  };
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  entityType: 'lead' | 'task' | 'deal' | 'appointment' | 'user' | 'company' | 'campaign';
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
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'assign'
  | 'unassign'
  | 'claim'
  | 'release'
  | 'status_change'
  | 'bulk_assign'
  | 'bulk_delete'
  | 'bulk_update'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'invite_user'
  | 'remove_user'
  | 'change_role'
  | 'change_plan'
  | 'api_access';

export interface AutoDistributionConfig {
  enabled: boolean;
  method: 'round_robin' | 'load_balanced' | 'random';
  eligibleRoles: string[];
  excludeUserIds?: string[];
  maxLeadsPerRep?: number;
  lastAssignedIndex?: number;
}

export interface AutoDistributionResult {
  success: boolean;
  assignedLeads: Array<{
    leadId: string;
    assignedTo: string;
    assignedToName: string;
  }>;
  errors?: string[];
  summary: {
    totalLeads: number;
    assignedCount: number;
    failedCount: number;
  };
}

export interface EnterpriseFeatureStatus {
  leadClaiming: boolean;
  auditTrail: boolean;
  autoDistribution: boolean;
  sso: boolean;
  loadBalancing: boolean;
}

export const CLAIM_DURATION_MINUTES = 30;
export const CLAIM_EXTEND_MINUTES = 15;
