import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import type { AutoDistributionConfig, AutoDistributionResult } from '@/types/enterprise';
import type { AppUser } from '@/types/saas';
import { logAuditEntry } from './audit-trail';

export async function getAutoDistributionConfig(companyId: string): Promise<AutoDistributionConfig | null> {
  if (!adminDb) {
    return null;
  }

  try {
    const configDoc = await adminDb
      .collection('company_settings')
      .doc(companyId)
      .get();

    if (!configDoc.exists) {
      return getDefaultConfig();
    }

    const data = configDoc.data();
    return data?.autoDistribution || getDefaultConfig();
  } catch (error) {
    console.error('Error fetching auto-distribution config:', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig(): AutoDistributionConfig {
  return {
    enabled: false,
    method: 'round_robin',
    eligibleRoles: ['user', 'manager'],
    excludeUserIds: [],
    maxLeadsPerRep: undefined,
    lastAssignedIndex: 0,
  };
}

export async function saveAutoDistributionConfig(
  companyId: string,
  config: AutoDistributionConfig,
  performedBy: string
): Promise<boolean> {
  if (!adminDb) {
    return false;
  }

  try {
    const settingsRef = adminDb.collection('company_settings').doc(companyId);
    
    await settingsRef.set(
      { autoDistribution: config },
      { merge: true }
    );

    await logAuditEntry({
      companyId,
      entityType: 'company',
      entityId: companyId,
      action: 'update',
      performedBy,
      newValue: { autoDistribution: config },
      metadata: { configType: 'auto_distribution' },
      severity: 'info',
    });

    return true;
  } catch (error) {
    console.error('Error saving auto-distribution config:', error);
    return false;
  }
}

export async function getEligibleReps(
  companyId: string,
  config: AutoDistributionConfig
): Promise<AppUser[]> {
  if (!adminDb) {
    return [];
  }

  try {
    const usersSnapshot = await adminDb
      .collection('users')
      .where('companyId', '==', companyId)
      .get();

    const eligibleReps: AppUser[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const role = userData.role || 'user';
      
      if (config.eligibleRoles.includes(role)) {
        if (!config.excludeUserIds?.includes(doc.id)) {
          let createdAtValue: string | undefined;
          if (userData.createdAt) {
            if (typeof userData.createdAt.toDate === 'function') {
              createdAtValue = userData.createdAt.toDate().toISOString();
            } else if (userData.createdAt._seconds) {
              createdAtValue = new Date(userData.createdAt._seconds * 1000).toISOString();
            } else if (typeof userData.createdAt === 'string') {
              createdAtValue = userData.createdAt;
            }
          }
          
          eligibleReps.push({
            uid: doc.id,
            email: userData.email || '',
            name: userData.name || userData.displayName || userData.email?.split('@')[0] || '',
            role: role,
            type: userData.type || 'office',
            companyId: userData.companyId,
            createdAt: createdAtValue,
          });
        }
      }
    });

    return eligibleReps;
  } catch (error) {
    console.error('Error fetching eligible reps:', error);
    return [];
  }
}

export async function getRepLeadCounts(
  companyId: string,
  repIds: string[]
): Promise<Map<string, number>> {
  if (!adminDb || repIds.length === 0) {
    return new Map();
  }

  try {
    const counts = new Map<string, number>();
    repIds.forEach((id) => counts.set(id, 0));

    const chunks = [];
    for (let i = 0; i < repIds.length; i += 10) {
      chunks.push(repIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const leadsSnapshot = await adminDb
        .collection('leads')
        .where('companyId', '==', companyId)
        .where('assignedTo', 'in', chunk)
        .get();

      leadsSnapshot.forEach((doc) => {
        const assignedTo = doc.data().assignedTo;
        if (assignedTo && counts.has(assignedTo)) {
          counts.set(assignedTo, counts.get(assignedTo)! + 1);
        }
      });
    }

    return counts;
  } catch (error) {
    console.error('Error fetching rep lead counts:', error);
    return new Map();
  }
}

export async function autoDistributeLeads(
  companyId: string,
  leadIds: string[],
  performedBy: string,
  performedByName?: string
): Promise<AutoDistributionResult> {
  if (!adminDb) {
    return {
      success: false,
      assignedLeads: [],
      errors: ['Database not initialized'],
      summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length },
    };
  }

  if (leadIds.length === 0) {
    return {
      success: true,
      assignedLeads: [],
      summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 },
    };
  }

  try {
    const config = await getAutoDistributionConfig(companyId);
    if (!config || !config.enabled) {
      return {
        success: false,
        assignedLeads: [],
        errors: ['Auto-distribution is not enabled for this company'],
        summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length },
      };
    }

    const eligibleReps = await getEligibleReps(companyId, config);
    if (eligibleReps.length === 0) {
      return {
        success: false,
        assignedLeads: [],
        errors: ['No eligible sales reps available for assignment'],
        summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length },
      };
    }

    const repLeadCounts = await getRepLeadCounts(
      companyId,
      eligibleReps.map((r) => r.uid)
    );

    const verifiedLeadIds: string[] = [];
    const errors: string[] = [];

    for (const leadId of leadIds) {
      const leadDoc = await adminDb.collection('leads').doc(leadId).get();
      if (!leadDoc.exists) {
        errors.push(`Lead ${leadId} not found`);
        continue;
      }
      const leadData = leadDoc.data();
      if (leadData?.companyId !== companyId) {
        errors.push(`Lead ${leadId} does not belong to this company`);
        continue;
      }
      verifiedLeadIds.push(leadId);
    }

    if (verifiedLeadIds.length === 0) {
      return {
        success: false,
        assignedLeads: [],
        errors: errors.length > 0 ? errors : ['No valid leads to distribute'],
        summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length },
      };
    }

    const assignedLeads: AutoDistributionResult['assignedLeads'] = [];
    let currentIndex = config.lastAssignedIndex || 0;

    const result = await adminDb.runTransaction(async (transaction) => {
      const configRef = adminDb!.collection('company_settings').doc(companyId);
      const configDoc = await transaction.get(configRef);
      const currentConfig = configDoc.data()?.autoDistribution || config;
      currentIndex = currentConfig.lastAssignedIndex || 0;

      for (const leadId of verifiedLeadIds) {
        let selectedRep: AppUser | null = null;

        switch (config.method) {
          case 'round_robin':
            selectedRep = eligibleReps[currentIndex % eligibleReps.length];
            currentIndex++;
            break;

          case 'load_balanced':
            const sortedReps = [...eligibleReps].sort((a, b) => {
              const countA = repLeadCounts.get(a.uid) || 0;
              const countB = repLeadCounts.get(b.uid) || 0;
              return countA - countB;
            });
            
            selectedRep = sortedReps[0];
            
            if (config.maxLeadsPerRep) {
              const currentCount = repLeadCounts.get(selectedRep.uid) || 0;
              if (currentCount >= config.maxLeadsPerRep) {
                selectedRep = sortedReps.find((rep) => {
                  const count = repLeadCounts.get(rep.uid) || 0;
                  return count < config.maxLeadsPerRep!;
                }) || null;
              }
            }
            break;

          case 'random':
            const randomIndex = Math.floor(Math.random() * eligibleReps.length);
            selectedRep = eligibleReps[randomIndex];
            break;
        }

        if (!selectedRep) {
          errors.push(`No available rep for lead ${leadId}`);
          continue;
        }

        const leadRef = adminDb!.collection('leads').doc(leadId);
        transaction.update(leadRef, {
          assignedTo: selectedRep.uid,
          updatedAt: new Date().toISOString(),
        });

        if (config.method === 'load_balanced') {
          repLeadCounts.set(
            selectedRep.uid,
            (repLeadCounts.get(selectedRep.uid) || 0) + 1
          );
        }

        assignedLeads.push({
          leadId,
          assignedTo: selectedRep.uid,
          assignedToName: selectedRep.name || selectedRep.email,
        });
      }

      transaction.set(
        configRef,
        { autoDistribution: { ...currentConfig, lastAssignedIndex: currentIndex } },
        { merge: true }
      );

      return true;
    });

    await logAuditEntry({
      companyId,
      entityType: 'lead',
      entityId: verifiedLeadIds.join(',').substring(0, 100),
      action: 'bulk_assign',
      performedBy,
      performedByName,
      metadata: {
        method: config.method,
        totalLeads: leadIds.length,
        assignedCount: assignedLeads.length,
        distribution: assignedLeads.reduce((acc, curr) => {
          acc[curr.assignedToName] = (acc[curr.assignedToName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      severity: 'info',
    });

    return {
      success: true,
      assignedLeads,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalLeads: leadIds.length,
        assignedCount: assignedLeads.length,
        failedCount: leadIds.length - assignedLeads.length,
      },
    };
  } catch (error: any) {
    console.error('Error in auto-distribution:', error);
    return {
      success: false,
      assignedLeads: [],
      errors: [error?.message || 'Auto-distribution failed'],
      summary: { totalLeads: leadIds.length, assignedCount: 0, failedCount: leadIds.length },
    };
  }
}

export async function distributeUnassignedLeads(
  companyId: string,
  performedBy: string,
  performedByName?: string
): Promise<AutoDistributionResult> {
  if (!adminDb) {
    return {
      success: false,
      assignedLeads: [],
      errors: ['Database not initialized'],
      summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 },
    };
  }

  try {
    const unassignedSnapshot = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('assignedTo', '==', null)
      .get();

    const unassignedWithEmptyString = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('assignedTo', '==', '')
      .get();

    const unassignedMarker = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('assignedTo', '==', '_UNASSIGNED_')
      .get();

    const leadIds: string[] = [];
    
    unassignedSnapshot.forEach((doc) => leadIds.push(doc.id));
    unassignedWithEmptyString.forEach((doc) => {
      if (!leadIds.includes(doc.id)) leadIds.push(doc.id);
    });
    unassignedMarker.forEach((doc) => {
      if (!leadIds.includes(doc.id)) leadIds.push(doc.id);
    });

    if (leadIds.length === 0) {
      return {
        success: true,
        assignedLeads: [],
        summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 },
      };
    }

    return await autoDistributeLeads(companyId, leadIds, performedBy, performedByName);
  } catch (error: any) {
    console.error('Error distributing unassigned leads:', error);
    return {
      success: false,
      assignedLeads: [],
      errors: [error?.message || 'Failed to fetch unassigned leads'],
      summary: { totalLeads: 0, assignedCount: 0, failedCount: 0 },
    };
  }
}
