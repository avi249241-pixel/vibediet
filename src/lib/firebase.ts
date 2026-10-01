import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication helpers
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAsGuest(): Promise<FirebaseUser> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Health check / connectivity test helper (Phase 1 requirement)
export async function testFirestoreConnection(user: FirebaseUser): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    const testDocRef = doc(db, 'health_check', `ping_${user.uid}`);
    await setDoc(testDocRef, {
      userId: user.uid,
      status: 'healthy',
      timestamp: serverTimestamp(),
      clientTime: new Date().toISOString(),
    });
    
    const snap = await getDoc(testDocRef);
    const latencyMs = Date.now() - startTime;
    return {
      success: snap.exists(),
      latencyMs,
    };
  } catch (err: any) {
    console.error('Firestore connection test error:', err);
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'Unknown Firestore error',
    };
  }
}
