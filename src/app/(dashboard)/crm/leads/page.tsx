import { LeadsTableClient } from './leads-table-client';
import { getPaginatedLeadsForCompany } from '@/lib/crm/lead-data';
import { getUserFromServerSession } from '@/lib/firebase-admin';
import { getPlanMetadata } from '@/lib/plan-helpers-server';

const INITIAL_PAGE_SIZE = 50;

export default async function LeadsTablePage() {
  const userResult = await getUserFromServerSession();
  
  if (!userResult.success || !userResult.user.companyId) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Please log in to view your contacts.</p>
      </div>
    );
  }
  
  const { uid, role, companyId } = userResult.user;
  
  const [paginatedResult, planMetadata] = await Promise.all([
    getPaginatedLeadsForCompany(companyId, {
      currentUserId: uid,
      currentUserRole: role as 'superadmin' | 'admin' | 'manager' | 'user',
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
    }),
    getPlanMetadata(companyId)
  ]);

  return (
    <LeadsTableClient 
      initialLeads={paginatedResult.leads}
      totalLeads={paginatedResult.total}
      hasMore={paginatedResult.hasMore}
      pageSize={INITIAL_PAGE_SIZE}
      companyId={companyId}
      planMetadata={planMetadata}
      userRole={role}
      userId={uid}
    />
  );
}
