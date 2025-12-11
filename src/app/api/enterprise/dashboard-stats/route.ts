import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';
import { isFeatureEnabledServer } from '@/lib/plan-helpers-server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.replace('Bearer ', '') || '';

    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;
    const userRole = userData?.role;

    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 });
    }

    if (!['admin', 'manager', 'superadmin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (userRole !== 'superadmin') {
      const hasEnterpriseFeature = await isFeatureEnabledServer(companyId, 'feat_enterprise_team');
      if (!hasEnterpriseFeature) {
        return NextResponse.json(
          { error: 'Enterprise plan required. Please upgrade to access this feature.' },
          { status: 403 }
        );
      }
    }

    const usersSnapshot = await adminDb
      .collection('users')
      .where('companyId', '==', companyId)
      .get();

    const totalMembers = usersSnapshot.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    let activeToday = 0;
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.lastActiveAt && userData.lastActiveAt >= todayISO) {
        activeToday++;
      }
    });

    const now = new Date();
    const claimedLeadsSnapshot = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('claimedBy', '!=', null)
      .get();

    let claimedLeads = 0;
    claimedLeadsSnapshot.forEach((doc) => {
      const leadData = doc.data();
      if (leadData.claimExpiry) {
        const expiry = new Date(leadData.claimExpiry);
        if (expiry > now) {
          claimedLeads++;
        }
      }
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const auditLogsSnapshot = await adminDb
      .collection('audit_logs')
      .where('companyId', '==', companyId)
      .where('timestamp', '>=', oneDayAgo)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentActivity: Array<{
      id: string;
      action: string;
      performedByName?: string;
      entityType: string;
      timestamp: string;
    }> = [];

    auditLogsSnapshot.forEach((doc) => {
      const data = doc.data();
      recentActivity.push({
        id: doc.id,
        action: data.action,
        performedByName: data.performedByName,
        entityType: data.entityType,
        timestamp: data.timestamp,
      });
    });

    return NextResponse.json({
      totalMembers,
      activeToday,
      claimedLeads,
      recentActivity,
    });
  } catch (error: any) {
    console.error('Error fetching enterprise stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
