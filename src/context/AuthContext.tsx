import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signInAsGuest,
  signOutUser,
  testFirestoreConnection,
} from '../lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isGuest: boolean;
  firestoreStatus: 'connected' | 'testing' | 'error' | 'idle';
  firestoreLatency: number | null;
  firestoreError: string | null;
  loginGoogle: () => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
  checkFirestoreHealth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'testing' | 'error' | 'idle'>('idle');
  const [firestoreLatency, setFirestoreLatency] = useState<number | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const checkFirestoreHealth = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setFirestoreStatus('testing');
    const res = await testFirestoreConnection(auth.currentUser);
    if (res.success) {
      setFirestoreStatus('connected');
      setFirestoreLatency(res.latencyMs);
      setFirestoreError(null);
      return true;
    } else {
      setFirestoreStatus('error');
      setFirestoreLatency(res.latencyMs);
      setFirestoreError(res.error || 'Connection failed');
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await checkFirestoreHealth();
      } else {
        setFirestoreStatus('idle');
      }
    });

    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      setLoading(true);
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      await checkFirestoreHealth();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginGuest = async () => {
    try {
      setLoading(true);
      const guestUser = await signInAsGuest();
      setUser(guestUser);
      await checkFirestoreHealth();
    } catch (err: any) {
      console.error('Guest Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
    setFirestoreStatus('idle');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest: !!user?.isAnonymous,
        firestoreStatus,
        firestoreLatency,
        firestoreError,
        loginGoogle,
        loginGuest,
        logout,
        checkFirestoreHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
