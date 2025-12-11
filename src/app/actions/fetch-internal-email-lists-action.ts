'use server';

import { getServerEmailLists } from '@/lib/email-list-data-server';
import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';

export interface InternalEmailList {
  id: string;
  name: string;
  contactCount: number;
  type: string;
}

export async function fetchInternalEmailListsAction(
  idToken: string
): Promise<{
  success: boolean;
  lists?: InternalEmailList[];
  error?: string;
}> {
  try {
    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success || !authResult.uid) {
      return { success: false, error: 'Authentication failed' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return { success: false, error: 'Company not found' };
    }

    const emailLists = await getServerEmailLists(companyId);

    const lists: InternalEmailList[] = emailLists.map(list => ({
      id: list.id,
      name: list.name,
      contactCount: list.contactCount || 0,
      type: list.type || 'custom',
    }));

    return {
      success: true,
      lists,
    };
  } catch (error: any) {
    console.error('Error fetching internal email lists:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch email lists',
    };
  }
}
