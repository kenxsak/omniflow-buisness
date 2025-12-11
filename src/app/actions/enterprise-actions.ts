'use server';

import { revalidatePath } from 'next/cache';
import { getUserFromServerSession } from '@/lib/firebase-admin';
import { 
  claimLead, 
  releaseLead, 
  extendClaimLead, 
  getLeadClaimStatus,
  cleanupExpiredClaims 
} from '@/lib/enterprise/lead-claiming';
import { 
  getAuditLogs, 
  getRecentAuditActivity, 
  getUserActivityReport,
  exportAuditLogs 
} from '@/lib/enterprise/audit-trail';
import { 
  getAutoDistributionConfig, 
  saveAutoDistributionConfig, 
  autoDistributeLeads,
  distributeUnassignedLeads,
  getEligibleReps 
} from '@/lib/enterprise/auto-distribution';
import type { AutoDistributionConfig } from '@/types/enterprise';

export async function claimLeadAction(leadId: string) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, message: 'Unauthorized: Please log in' };
  }

  const { uid, companyId, email } = currentUser.user;
  if (!companyId) {
    return { success: false, message: 'Company context missing' };
  }

  const result = await claimLead(leadId, uid, email || '', companyId);
  
  if (result.success) {
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
  }

  return result;
}

export async function releaseLeadAction(leadId: string) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, message: 'Unauthorized: Please log in' };
  }

  const { uid, companyId, role } = currentUser.user;
  if (!companyId) {
    return { success: false, message: 'Company context missing' };
  }

  const result = await releaseLead(leadId, uid, companyId, role);
  
  if (result.success) {
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
  }

  return result;
}

export async function extendLeadClaimAction(leadId: string) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, message: 'Unauthorized: Please log in' };
  }

  const { uid, companyId } = currentUser.user;
  if (!companyId) {
    return { success: false, message: 'Company context missing' };
  }

  return await extendClaimLead(leadId, uid, companyId);
}

export async function getLeadClaimStatusAction(leadId: string) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return null;
  }

  const { companyId } = currentUser.user;
  if (!companyId) {
    return null;
  }

  return await getLeadClaimStatus(leadId, companyId);
}

export async function cleanupExpiredClaimsAction() {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, cleaned: 0 };
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin'].includes(role || '')) {
    return { success: false, cleaned: 0 };
  }

  const cleaned = await cleanupExpiredClaims(companyId);
  revalidatePath('/crm');
  
  return { success: true, cleaned };
}

export async function getAuditLogsAction(options?: {
  entityType?: 'lead' | 'task' | 'deal' | 'appointment' | 'user' | 'company' | 'campaign';
  entityId?: string;
  action?: string;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { logs: [], total: 0 };
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return { logs: [], total: 0 };
  }

  return await getAuditLogs(companyId, options as any);
}

export async function getRecentActivityAction(hoursBack: number = 24) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return [];
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return [];
  }

  return await getRecentAuditActivity(companyId, hoursBack);
}

export async function getUserActivityReportAction(userId: string, daysBack: number = 30) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { totalActions: 0, actionsByType: {}, recentLogs: [] };
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin'].includes(role || '')) {
    return { totalActions: 0, actionsByType: {}, recentLogs: [] };
  }

  return await getUserActivityReport(companyId, userId, daysBack);
}

export async function exportAuditLogsAction(startDate: string, endDate: string) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, logs: [] };
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin'].includes(role || '')) {
    return { success: false, logs: [] };
  }

  const logs = await exportAuditLogs(companyId, startDate, endDate);
  return { success: true, logs };
}

export async function getAutoDistributionConfigAction() {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return null;
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return null;
  }

  return await getAutoDistributionConfig(companyId);
}

export async function saveAutoDistributionConfigAction(config: AutoDistributionConfig) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { success: false, message: 'Unauthorized' };
  }

  const { uid, companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin'].includes(role || '')) {
    return { success: false, message: 'Only admins can configure auto-distribution' };
  }

  const result = await saveAutoDistributionConfig(companyId, config, uid);
  return { success: result, message: result ? 'Configuration saved' : 'Failed to save' };
}

export async function autoDistributeLeadsAction(leadIds: string[]) {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { 
      success: false, 
      assignedLeads: [], 
      errors: ['Unauthorized'], 
      summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length } 
    };
  }

  const { uid, companyId, role, email } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return { 
      success: false, 
      assignedLeads: [], 
      errors: ['Only managers and admins can auto-distribute leads'], 
      summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length } 
    };
  }

  const result = await autoDistributeLeads(companyId, leadIds, uid, email);
  
  if (result.success) {
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
    revalidatePath('/crm/dashboard');
  }

  return result;
}

export async function distributeUnassignedLeadsAction() {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return { 
      success: false, 
      assignedLeads: [], 
      errors: ['Unauthorized'], 
      summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 } 
    };
  }

  const { uid, companyId, role, email } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return { 
      success: false, 
      assignedLeads: [], 
      errors: ['Only managers and admins can auto-distribute leads'], 
      summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 } 
    };
  }

  const result = await distributeUnassignedLeads(companyId, uid, email);
  
  if (result.success) {
    revalidatePath('/crm');
    revalidatePath('/crm/leads');
    revalidatePath('/crm/dashboard');
  }

  return result;
}

export async function getEligibleRepsAction() {
  const currentUser = await getUserFromServerSession();
  if (!currentUser.success) {
    return [];
  }

  const { companyId, role } = currentUser.user;
  if (!companyId || !['admin', 'superadmin', 'manager'].includes(role || '')) {
    return [];
  }

  const config = await getAutoDistributionConfig(companyId);
  if (!config) {
    return [];
  }

  return await getEligibleReps(companyId, config);
}
