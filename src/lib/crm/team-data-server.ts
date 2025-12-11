import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import type { AppUser, Role, UserType } from '@/types/saas';

/**
 * Get all team members for a company (server-side)
 */
export async function getServerTeamMembers(companyId: string): Promise<AppUser[]> {
  if (!adminDb || !companyId) {
    return [];
  }

  try {
    const snapshot = await adminDb
      .collection('users')
      .where('companyId', '==', companyId)
      .get();

    const users: AppUser[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || '',
        name: data.name || data.displayName || data.email?.split('@')[0] || '',
        role: (data.role || 'user') as Role,
        type: (data.type || 'office') as UserType,
        companyId: data.companyId,
        phone: data.phone,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    return users;
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

/**
 * Get user role and info from server session
 */
export async function getServerUserRole(userId: string): Promise<{ role: Role; companyId: string } | null> {
  if (!adminDb || !userId) {
    return null;
  }

  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data();
    return {
      role: (data?.role || 'user') as Role,
      companyId: data?.companyId || '',
    };
  } catch (error: any) {
    console.error('Error fetching user role:', error);
    return null;
  }
}
