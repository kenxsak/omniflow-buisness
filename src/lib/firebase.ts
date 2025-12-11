
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

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

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _initialized = false;

function initializeFirebase(): void {
  if (_initialized || typeof window === 'undefined') return;
  
  if (!isFirebaseConfigured) {
    console.warn("Firebase is not fully configured. Please check all NEXT_PUBLIC_FIREBASE_ variables in your .env file.");
    _initialized = true;
    return;
  }

  try {
    if (getApps().length === 0) {
      _app = initializeApp(firebaseConfig);
    } else {
      _app = getApp();
    }
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _initialized = true;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    _app = null;
    _auth = null;
    _db = null;
    _initialized = true;
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!_initialized) {
    initializeFirebase();
  }
  if (!_app && typeof window !== 'undefined') {
    console.warn('[Firebase] App instance is null. Check Firebase configuration.');
  }
  return _app;
}

export function getFirebaseAuth(): Auth | null {
  if (!_initialized) {
    initializeFirebase();
  }
  if (!_auth && typeof window !== 'undefined') {
    console.warn('[Firebase] Auth instance is null. Check Firebase configuration.');
  }
  return _auth;
}

export function getFirebaseDb(): Firestore | null {
  if (!_initialized) {
    initializeFirebase();
  }
  if (!_db && typeof window !== 'undefined') {
    console.warn('[Firebase] Firestore instance is null. Check Firebase configuration.');
  }
  return _db;
}

export const app = typeof window !== 'undefined' ? getFirebaseApp() : null;
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : null;
export const db = typeof window !== 'undefined' ? getFirebaseDb() : null;
