import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.authDomain && !!firebaseConfig.projectId;

let serverApp: FirebaseApp | null = null;
let serverDb: Firestore | null = null;

function initializeServerFirebase() {
  if (!isFirebaseConfigured) {
    console.warn("Firebase is not fully configured. Please check all NEXT_PUBLIC_FIREBASE_ variables in your .env file.");
    return { app: null, db: null };
  }

  try {
    if (getApps().length === 0) {
      serverApp = initializeApp(firebaseConfig);
      serverDb = getFirestore(serverApp);
    } else {
      serverApp = getApp();
      serverDb = getFirestore(serverApp);
    }
    return { app: serverApp, db: serverDb };
  } catch (error) {
    console.error("Server-side Firebase initialization error:", error);
    return { app: null, db: null };
  }
}

const { app, db } = initializeServerFirebase();

export { app as serverApp, db as serverDb };
