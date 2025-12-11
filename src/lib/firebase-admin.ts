import 'server-only';
import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let initializationAttempted = false;
let initializationError: string | null = null;

/**
 * Initialize Firebase Admin SDK
 * Requires proper service account credentials via environment variables
 */
function initializeFirebaseAdmin() {
  if (initializationAttempted) {
    return adminApp;
  }

  initializationAttempted = true;

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
      console.log('✅ Firebase Admin SDK already initialized');
      return adminApp;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!projectId) {
      initializationError = 'NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set';
      console.warn('⚠️ Firebase Admin: Project ID not found.');
      return null;
    }

    // Try to initialize with service account credentials if available
    if (clientEmail && privateKey) {
      console.log(`📋 Processing private key (length: ${privateKey.length})`);
      
      // Step 1: Handle literal \n characters (common when copying from JSON)
      const originalKey = privateKey;
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        console.log(`✓ Replaced literal \\n with newlines (${originalKey.length} -> ${privateKey.length} chars)`);
      }
      
      // Step 2: Replace non-breaking spaces (char code 160) with regular spaces
      // This fixes issues when copying from some text editors or web pages
      privateKey = privateKey.replace(/\u00A0/g, ' ');
      console.log('✓ Replaced non-breaking spaces with regular spaces');
      
      // Step 3: Clean up any wrapping quotes and trim
      privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
      
      // Step 4: Extract and reformat the key
      const header = '-----BEGIN PRIVATE KEY-----';
      const footer = '-----END PRIVATE KEY-----';
      
      const beginIndex = privateKey.indexOf(header);
      const endIndex = privateKey.indexOf(footer);
      
      if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
        try {
          // Extract the body (everything between header and footer)
          const startIndex = beginIndex + header.length;
          let body = privateKey.substring(startIndex, endIndex);
          
          // Remove all whitespace from body
          body = body.replace(/[\s\r\n]/g, '');
          
          if (body.length > 0) {
            // Split into 64-character lines
            const lines = [];
            for (let i = 0; i < body.length; i += 64) {
              lines.push(body.substring(i, i + 64));
            }
            
            // Reconstruct with proper format
            privateKey = `${header}\n${lines.join('\n')}\n${footer}\n`;
            console.log(`✅ Private key formatted: ${lines.length} lines, ${body.length} chars`);
          } else {
            console.error('❌ Private key body is empty after extraction');
          }
        } catch (error: any) {
          console.error('⚠️ Error reformatting private key:', error.message);
        }
      } else {
        console.error('❌ Invalid private key format');
        console.error(`   Has BEGIN: ${beginIndex !== -1}, Has END: ${endIndex !== -1}`);
        console.error(`   Last 150 chars: ${privateKey.slice(-150)}`);
      }
      
      try {
        console.log('🔑 Creating Firebase credential...');
        const credential = admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        });
        
        console.log('🔑 Initializing Firebase Admin app...');
        adminApp = admin.initializeApp({
          credential,
          projectId,
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (initError: any) {
        console.error('❌ Firebase Admin initialization error:', initError);
        console.error('   Error message:', initError.message);
        console.error('   Error stack:', initError.stack);
        initializationError = initError.message;
        return null;
      }
      return adminApp;
    }

    // Try application default credentials (works in Google Cloud environments)
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log('✅ Firebase Admin SDK initialized with application default credentials');
      return adminApp;
    } catch (credError: any) {
      initializationError = 'No Firebase Admin credentials found. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.';
      console.error('❌ Firebase Admin SDK initialization failed:', credError.message);
      console.error('ℹ️ To enable secure authentication, add Firebase service account credentials:');
      console.error('   - FIREBASE_CLIENT_EMAIL');
      console.error('   - FIREBASE_PRIVATE_KEY');
      return null;
    }
  } catch (error: any) {
    initializationError = error.message;
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    return null;
  }
}

// Initialize on import
const app = initializeFirebaseAdmin();

export { app as adminApp };
export const adminAuth = app ? admin.auth() : null;
export const adminDb = app ? admin.firestore() : null;

/**
 * Check if Firebase Admin SDK is properly initialized
 */
export function isAdminInitialized(): boolean {
  return adminApp !== null && adminAuth !== null;
}

/**
 * Get initialization error message if initialization failed
 */
export function getAdminInitError(): string | null {
  return initializationError;
}

/**
 * Get user from server session (for server actions)
 * Reads the session token from cookies and verifies it
 */
export async function getUserFromServerSession(): Promise<{
  success: true;
  user: {
    uid: string;
    email?: string;
    role?: string;
    companyId?: string;
  };
} | { success: false; error: string }> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-auth-token')?.value;

    if (!sessionToken) {
      return { success: false, error: 'No session token found' };
    }

    // Verify the session token with Firebase Admin
    const tokenResult = await verifyAuthToken(sessionToken);
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    // Get user document from Firestore to retrieve role and companyId
    if (!adminDb) {
      return { success: false, error: 'Admin database not initialized' };
    }

    const userDoc = await adminDb.collection('users').doc(tokenResult.uid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();

    return {
      success: true,
      user: {
        uid: tokenResult.uid,
        email: tokenResult.email,
        role: userData?.role,
        companyId: userData?.companyId,
      },
    };
  } catch (error: any) {
    console.error('Error getting user from server session:', error);
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

/**
 * Verify a Firebase ID token and return the decoded token
 * This ensures the user is authenticated and we can trust their user ID
 */
export async function verifyAuthToken(
  idToken: string
): Promise<{ success: true; uid: string; email?: string } | { success: false; error: string }> {
  if (!adminAuth) {
    const error = getAdminInitError() || 'Firebase Admin not initialized';
    console.error('❌ Cannot verify auth token:', error);
    return { 
      success: false, 
      error: `Authentication service not configured: ${error}` 
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken, true); // checkRevoked = true
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    return {
      success: false,
      error: error.message || 'Invalid authentication token',
    };
  }
}

/**
 * Get the user's companyId from their Firebase auth token
 * This verifies the token and fetches the user document from Firestore
 */
export async function getCompanyIdFromToken(authToken: string): Promise<string | null> {
  if (!adminAuth || !adminDb) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(authToken);
    const uid = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found for uid:', uid);
      return null;
    }

    const userData = userDoc.data();
    return userData?.companyId || null;
  } catch (error) {
    console.error('Error getting companyId from token:', error);
    return null;
  }
}
