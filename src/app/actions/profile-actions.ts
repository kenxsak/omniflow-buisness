'use server';

import { serverDb } from '@/lib/firebase-server';
import { verifyAuthToken } from '@/lib/firebase-admin';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Update user's personal profile information
 * SECURITY: Verifies ID token to ensure user can only update their OWN profile
 */
export async function updateUserProfileAction(params: {
  idToken: string;
  data: { name?: string; phone?: string };
}): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // SECURITY: Verify the Firebase ID token to get the authenticated user
    const verification = await verifyAuthToken(params.idToken);
    
    if (!verification.success) {
      return {
        success: false,
        error: 'Unauthorized: Invalid authentication token',
      };
    }

    // Use the verified UID from the token (not trusting client input)
    const authenticatedUserId = verification.uid;

    // Verify user exists in database
    const userRef = doc(serverDb, 'users', authenticatedUserId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    // Update user profile (only their own)
    await updateDoc(userRef, {
      ...(params.data.name && { name: params.data.name }),
      ...(params.data.phone && { phone: params.data.phone }),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update user profile' };
  }
}

/**
 * Update company profile information
 * SECURITY: Verifies ID token and ensures only admins/superadmins can update company details
 */
export async function updateCompanyProfileAction(params: {
  idToken: string;
  data: { 
    name?: string; 
    website?: string; 
    country?: string;
    countryCode?: string;
    currencyCode?: string;
    timezone?: string;
    registeredEmail?: string;
    adminEmail?: string;
    phone?: string;
    address?: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    // SECURITY: Verify the Firebase ID token to get the authenticated user
    const verification = await verifyAuthToken(params.idToken);
    
    if (!verification.success) {
      return {
        success: false,
        error: 'Unauthorized: Invalid authentication token',
      };
    }

    // Use the verified UID from the token (not trusting client input)
    const authenticatedUserId = verification.uid;

    // Get user document to verify role and company membership
    const userRef = doc(serverDb, 'users', authenticatedUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();

    // SECURITY CHECK 1: Verify user has admin or superadmin role
    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return {
        success: false,
        error: 'Unauthorized: Only admins can update company information',
      };
    }

    // Get the company ID from the authenticated user's data (not from client)
    const companyId = userData.companyId;
    
    if (!companyId) {
      return {
        success: false,
        error: 'User is not associated with any company',
      };
    }

    // Verify company exists
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);

    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }

    // Update company profile with all provided fields
    const updateData: Record<string, any> = {};
    if (params.data.name) updateData.name = params.data.name;
    if (params.data.website !== undefined) updateData.website = params.data.website || null;
    if (params.data.country) updateData.country = params.data.country;
    if (params.data.countryCode) updateData.countryCode = params.data.countryCode;
    if (params.data.currencyCode) updateData.currencyCode = params.data.currencyCode;
    if (params.data.timezone) updateData.timezone = params.data.timezone;
    if (params.data.registeredEmail !== undefined) updateData.registeredEmail = params.data.registeredEmail || null;
    if (params.data.adminEmail !== undefined) updateData.adminEmail = params.data.adminEmail || null;
    if (params.data.phone !== undefined) updateData.phone = params.data.phone || null;
    if (params.data.address !== undefined) updateData.address = params.data.address || null;

    await updateDoc(companyRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating company profile:', error);
    return { success: false, error: 'Failed to update company profile' };
  }
}
