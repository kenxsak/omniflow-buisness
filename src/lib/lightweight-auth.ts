"use client";

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig, isFirebaseConfigured } from '@/lib/firebase-config';
import { convertErrorToFriendly } from '@/lib/friendly-messages';
import { addAppUser } from '@/lib/saas-data';
import { seedInitialData } from '@/lib/mock-data';

let auth: Auth | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  if (getApps().length === 0) {
    try {
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      auth = null;
    }
  } else {
    const app = getApp();
    auth = getAuth(app);
  }
}

export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
}

async function setSessionCookie(idToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Failed to set session cookie:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('[Auth] Session cookie set:', data.success);
    return data.success === true;
  } catch (error) {
    console.error('Failed to set session cookie:', error);
    return false;
  }
}

export async function lightweightLogin(email: string, password: string): Promise<AuthResult> {
  if (!isFirebaseConfigured || !auth) {
    const friendlyError = convertErrorToFriendly('auth/configuration-error');
    return {
      success: false,
      error: friendlyError.description,
    };
  }

  try {
    console.log('[Auth] Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Firebase login successful, uid:', userCredential.user.uid);
    
    const idToken = await userCredential.user.getIdToken();
    console.log('[Auth] Got ID token');
    
    // Ensure user document exists in Firestore (handles users who registered before fix)
    try {
      console.log('[Auth] Ensuring user document exists...');
      await addAppUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      });
      console.log('[Auth] User document ready');
    } catch (userError) {
      console.error('[Auth] Error ensuring user document exists:', userError);
      // Continue with login even if this fails - user might already exist
    }
    
    const cookieSet = await setSessionCookie(idToken);
    console.log('[Auth] Cookie set result:', cookieSet);

    return {
      success: true,
      userId: userCredential.user.uid,
    };
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    const friendlyError = convertErrorToFriendly(error.code || 'auth/operation-failed');
    return {
      success: false,
      error: friendlyError.description,
    };
  }
}

export async function lightweightSignup(email: string, password: string): Promise<AuthResult> {
  if (!isFirebaseConfigured || !auth) {
    const friendlyError = convertErrorToFriendly('auth/configuration-error');
    return {
      success: false,
      error: friendlyError.description,
    };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create the user document in Firestore
    const { user: newUser, isNewCompany } = await addAppUser({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
    });
    
    // Seed initial data for new companies
    if (isNewCompany && newUser.companyId && newUser.role === 'admin') {
      await seedInitialData(newUser.companyId, newUser.email);
    }
    
    // Sign out after signup - user needs to log in
    await signOut(auth);

    return {
      success: true,
      userId: userCredential.user.uid,
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    const friendlyError = convertErrorToFriendly(error.code || 'auth/operation-failed');
    return {
      success: false,
      error: friendlyError.description,
    };
  }
}
