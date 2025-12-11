
'use server';

import { serverDb } from '@/lib/firebase-server';
import { getDoc, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { AppUser } from '@/types/saas';
import { trackAIUsage } from '@/lib/ai-usage-tracker';

export interface DeleteUserParams {
  userIdToDelete: string;
  adminUserId: string;
}

export interface DeleteUserResult {
  success: boolean;
  message?: string;
}

/**
 * Delete a user from the system
 * SECURITY: Only admins can delete users
 * - Cannot delete admin or superadmin users
 * - Cannot delete yourself
 * - Deletes from Firestore only (Firebase Auth deletion requires Admin SDK)
 */
export async function deleteUser(
  params: DeleteUserParams
): Promise<DeleteUserResult> {
  try {
    if (!serverDb) {
      return {
        success: false,
        message: 'Database not initialized'
      };
    }

    // SECURITY: Verify the admin user has proper permissions
    const adminDoc = await getDoc(doc(serverDb, 'users', params.adminUserId));
    if (!adminDoc.exists()) {
      return {
        success: false,
        message: 'Unauthorized: Admin user not found'
      };
    }

    const admin = adminDoc.data() as AppUser;
    
    // Only admins and superadmins can delete users
    if (!['admin', 'superadmin'].includes(admin.role)) {
      return {
        success: false,
        message: 'Unauthorized: Only admins can delete users'
      };
    }

    // Prevent self-deletion
    if (params.adminUserId === params.userIdToDelete) {
      return {
        success: false,
        message: 'Cannot delete your own account'
      };
    }

    // Get the user to delete
    const userToDeleteDoc = await getDoc(doc(serverDb, 'users', params.userIdToDelete));
    if (!userToDeleteDoc.exists()) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const userToDelete = userToDeleteDoc.data() as AppUser;

    // Verify both users are in the same company (unless admin is superadmin)
    if (admin.role !== 'superadmin' && admin.companyId !== userToDelete.companyId) {
      return {
        success: false,
        message: 'Unauthorized: Cannot delete users from other companies'
      };
    }

    // Cannot delete admin or superadmin users
    if (['admin', 'superadmin'].includes(userToDelete.role)) {
      return {
        success: false,
        message: 'Cannot delete admin or superadmin users'
      };
    }

    // Delete the user from Firestore
    await deleteDoc(doc(serverDb, 'users', params.userIdToDelete));

    // NOTE: Firebase Auth deletion requires Firebase Admin SDK
    // For now, this only removes from Firestore
    // The user will still be able to log in with Firebase Auth
    // but will not have a user record in Firestore

    return {
      success: true,
      message: `User ${userToDelete.email} has been removed from the system. Note: Firebase Authentication account still exists and requires manual deletion.`
    };

  } catch (error: any) {
    console.error('❌ Error in deleteUser:', error);
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while deleting the user.'
    };
  }
}
