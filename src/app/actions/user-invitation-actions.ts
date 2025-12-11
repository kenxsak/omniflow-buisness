
'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, getDocs, query, where, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import type { UserInvitation, UserType, Role, AppUser } from '@/types/saas';
import { sendInvitationEmail, type SendInvitationEmailParams } from './invitation-actions';
import { trackAIUsage } from '@/lib/ai-usage-tracker';
import { updateChecklistItem } from './onboarding-actions';

export interface CreateAndSendInvitationParams {
  email: string;
  companyId: string;
  companyName: string;
  inviterId: string;
  inviterEmail: string;
  inviterName?: string;
  type: UserType;
  role: Role;
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  brevoSenderName?: string;
}

export interface CreateAndSendInvitationResult {
  success: boolean;
  message?: string;
  emailSent?: boolean;
  invitationId?: string;
}

/**
 * Creates a user invitation in Firestore and automatically sends an invitation email.
 * This is the main entry point for the invitation flow, combining database operations
 * with email notifications.
 */
export async function createAndSendInvitation(
  params: CreateAndSendInvitationParams
): Promise<CreateAndSendInvitationResult> {
  try {
    if (!serverDb) {
      return { 
        success: false, 
        message: 'Database not initialized' 
      };
    }

    // SECURITY: Verify the inviter has proper permissions
    const inviterDoc = await getDoc(doc(serverDb, 'users', params.inviterId));
    if (!inviterDoc.exists()) {
      return {
        success: false,
        message: 'Unauthorized: Inviter not found'
      };
    }

    const inviter = inviterDoc.data() as AppUser;
    
    // Check if inviter belongs to the company they're inviting to
    if (inviter.companyId !== params.companyId) {
      return {
        success: false,
        message: 'Unauthorized: Cannot invite users to a different company'
      };
    }

    // Check if inviter has permission to invite (admin or manager)
    if (!['admin', 'manager', 'superadmin'].includes(inviter.role)) {
      return {
        success: false,
        message: 'Unauthorized: Only admins and managers can invite users'
      };
    }

    // Managers can only invite users with 'user' role
    if (inviter.role === 'manager' && params.role !== 'user') {
      return {
        success: false,
        message: 'Unauthorized: Managers can only invite users with "user" role'
      };
    }

    // Define collections early for use in limit checks
    const usersCol = collection(serverDb, 'users');
    const invitationsCol = collection(serverDb, 'invitations');

    // SERVER-SIDE PLAN LIMIT ENFORCEMENT
    // Get company details and check plan limits
    const companyDoc = await getDoc(doc(serverDb, 'companies', params.companyId));
    if (!companyDoc.exists()) {
      return {
        success: false,
        message: 'Company not found'
      };
    }

    const companyData = companyDoc.data();
    const planId = companyData.planId;

    // Plan limits - default to Free plan limits if plan not found
    // Free = 1 user, Starter = 3, Pro = 10, Enterprise = unlimited
    // Support both short names and plan_* format
    const PLAN_LIMITS: Record<string, number> = {
      'free': 1,
      'plan_free': 1,
      'starter': 3,
      'plan_starter': 3,
      'pro': 10,
      'plan_pro': 10,
      'enterprise': 999999,
      'plan_enterprise': 999999
    };

    // Determine max users - try Firestore first, then fallback to hardcoded limits
    let maxUsers = 1; // Default to Free plan (most restrictive)
    let planName = 'Free';

    if (planId) {
      // Try to get plan from Firestore
      try {
        const planDoc = await getDoc(doc(serverDb, 'plans', planId));
        if (planDoc.exists()) {
          const planData = planDoc.data();
          maxUsers = planData.maxUsers || PLAN_LIMITS[planId.toLowerCase()] || 1;
          planName = planData.name || planId;
        } else {
          // Plan not in Firestore, use hardcoded limits
          maxUsers = PLAN_LIMITS[planId.toLowerCase()] || 1;
          planName = planId.charAt(0).toUpperCase() + planId.slice(1);
        }
      } catch (planError) {
        console.warn('⚠️ Error fetching plan, defaulting to Free limits:', planError);
        // Default to Free plan limits on error
        maxUsers = 1;
        planName = 'Free';
      }
    }

    // Count current users in the company
    const companyUsersQuery = query(usersCol, where('companyId', '==', params.companyId));
    const companyUsersSnap = await getDocs(companyUsersQuery);
    const currentUserCount = companyUsersSnap.size;

    // Count pending invitations for the company
    const companyInvitationsQuery = query(invitationsCol, where('companyId', '==', params.companyId));
    const companyInvitationsSnap = await getDocs(companyInvitationsQuery);
    const pendingInvitationsCount = companyInvitationsSnap.size;

    const totalUserCount = currentUserCount + pendingInvitationsCount;

    // Block if at or over limit
    if (totalUserCount >= maxUsers) {
      return {
        success: false,
        message: `User limit reached. Your ${planName} plan allows a maximum of ${maxUsers} user${maxUsers === 1 ? '' : 's'}. Please upgrade your plan to invite more team members.`
      };
    }

    const lowerEmail = params.email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowerEmail)) {
      return { 
        success: false, 
        message: 'Invalid email format.' 
      };
    }

    // Check if user already exists or has a pending invitation

    const userQuery = query(usersCol, where('email', '==', lowerEmail));
    const invQuery = query(invitationsCol, where('email', '==', lowerEmail));
    
    const [userSnap, invSnap] = await Promise.all([
      getDocs(userQuery),
      getDocs(invQuery)
    ]);

    if (!userSnap.empty) {
      return { 
        success: false, 
        message: 'A user with this email already exists in the system.' 
      };
    }

    if (!invSnap.empty) {
      return { 
        success: false, 
        message: 'This email already has a pending invitation.' 
      };
    }

    // Create the invitation in Firestore
    const newInvitation: Omit<UserInvitation, 'id'> = {
      email: lowerEmail,
      companyId: params.companyId,
      role: params.role,
      type: params.type,
      invitedBy: params.inviterId,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(invitationsCol, newInvitation);
    console.log(`✅ Invitation created in database with ID: ${docRef.id}`);

    // Mark onboarding checklist item as complete
    try {
      await updateChecklistItem(params.companyId, 'invitedTeamMember', true);
      console.log(`✅ Onboarding checklist updated: invitedTeamMember marked as complete`);
    } catch (error) {
      console.error('⚠️ Failed to update onboarding checklist:', error);
      // Don't fail the invitation if checklist update fails
    }

    // Attempt to send the email if Brevo API key is provided
    let emailSent = false;
    let emailError: string | undefined;

    if (params.brevoApiKey && params.brevoSenderEmail && params.brevoSenderName) {
      const emailParams: SendInvitationEmailParams = {
        recipientEmail: lowerEmail,
        companyName: params.companyName,
        role: params.role,
        type: params.type,
        inviterEmail: params.inviterEmail,
        inviterName: params.inviterName,
        brevoApiKey: params.brevoApiKey,
        senderEmail: params.brevoSenderEmail,
        senderName: params.brevoSenderName,
      };

      const emailResult = await sendInvitationEmail(emailParams);
      
      if (emailResult.success) {
        emailSent = true;
        console.log(`✅ Invitation email sent successfully to ${lowerEmail}`, {
          messageId: emailResult.messageId,
          companyName: params.companyName,
        });
      } else {
        emailError = emailResult.error;
        console.warn(`⚠️ Invitation created but email failed to send: ${emailError}`);
      }
    } else if (params.brevoApiKey && (!params.brevoSenderEmail || !params.brevoSenderName)) {
      // Brevo API key is configured but sender info is missing
      emailError = 'Brevo sender email or name is not configured. Please complete your Brevo setup in Settings > API Keys.';
      console.warn(`⚠️ Brevo API key present but sender info missing`);
    }

    // Return appropriate success message based on whether email was sent
    if (emailSent) {
      return {
        success: true,
        emailSent: true,
        invitationId: docRef.id,
        message: `Invitation sent successfully! ${lowerEmail} will receive an email with instructions to join your company.`,
      };
    } else if (emailError) {
      // Email sending was attempted but failed
      return {
        success: true,
        emailSent: false,
        invitationId: docRef.id,
        message: `Invitation created, but email delivery failed: ${emailError}. Please manually notify ${lowerEmail} to sign up at the signup page.`,
      };
    } else {
      // No complete Brevo configuration
      return {
        success: true,
        emailSent: false,
        invitationId: docRef.id,
        message: `Invitation created. To send automated emails, please configure your Brevo API key, sender email, and sender name in Settings > API Keys. In the meantime, manually notify ${lowerEmail} to sign up.`,
      };
    }

  } catch (error: any) {
    console.error('❌ Error in createAndSendInvitation:', error);
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while creating the invitation.',
    };
  }
}

export interface RevokeInvitationParams {
  invitationId: string;
  revokerUserId: string;
}

export interface RevokeInvitationResult {
  success: boolean;
  message?: string;
}

/**
 * Revoke (delete) a pending user invitation
 * SECURITY: Only admins and managers can revoke invitations
 * - Managers can only revoke invitations for 'user' role
 * - Must be in the same company as the invitation
 */
export async function revokeInvitation(
  params: RevokeInvitationParams
): Promise<RevokeInvitationResult> {
  try {
    if (!serverDb) {
      return {
        success: false,
        message: 'Database not initialized'
      };
    }

    // SECURITY: Verify the revoker has proper permissions
    const revokerDoc = await getDoc(doc(serverDb, 'users', params.revokerUserId));
    if (!revokerDoc.exists()) {
      return {
        success: false,
        message: 'Unauthorized: User not found'
      };
    }

    const revoker = revokerDoc.data() as AppUser;
    
    // Only admins and managers can revoke invitations
    if (!['admin', 'manager', 'superadmin'].includes(revoker.role)) {
      return {
        success: false,
        message: 'Unauthorized: Only admins and managers can revoke invitations'
      };
    }

    // Get the invitation to check company and role
    const invitationDoc = await getDoc(doc(serverDb, 'invitations', params.invitationId));
    if (!invitationDoc.exists()) {
      return {
        success: false,
        message: 'Invitation not found'
      };
    }

    const invitation = invitationDoc.data() as UserInvitation;

    // Verify revoker is in the same company (unless superadmin)
    if (revoker.role !== 'superadmin' && revoker.companyId !== invitation.companyId) {
      return {
        success: false,
        message: 'Unauthorized: Cannot revoke invitations from other companies'
      };
    }

    // Managers can only revoke invitations for 'user' role
    if (revoker.role === 'manager' && invitation.role !== 'user') {
      return {
        success: false,
        message: 'Unauthorized: Managers can only revoke invitations for "user" role'
      };
    }

    // Delete the invitation
    const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
    await deleteDoc(firestoreDoc(serverDb, 'invitations', params.invitationId));

    return {
      success: true,
      message: `Invitation for ${invitation.email} has been revoked successfully`
    };

  } catch (error: any) {
    console.error('❌ Error in revokeInvitation:', error);
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred while revoking the invitation.'
    };
  }
}
