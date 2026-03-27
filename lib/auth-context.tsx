/**
 * Authentication Context Provider
 * 
 * Manages user authentication state across the application.
 * Provides current user, loading state, and auth functions to all components.
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut, subscribeToUserProfile, updateLastActive } from '@/lib/firebase';
import { isPlanExpired } from '@/lib/plan-utils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userProfile: any | null;
  isAdmin: boolean;
  isPro: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userProfile: null,
  isAdmin: false,
  isPro: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes + real-time profile listener
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous profile listener
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        // Real-time listener — updates immediately when admin changes plan/role
        profileUnsub = subscribeToUserProfile(firebaseUser.uid, (data) => {
          setUserProfile(data);
          setLoading(false);
        });
        updateLastActive(firebaseUser.uid);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const handleSignIn = async () => {
    const { user, error } = await signInWithGoogle();
    if (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in: ' + error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Sign out error:', error);
      alert('Failed to sign out: ' + error);
    }
  };

  // No-op — profile updates are handled by the real-time listener above
  const refreshProfile = async () => {};

  const isAdmin = userProfile?.role === 'admin';
  const planExpired = isPlanExpired(userProfile?.planExpiresAt);
  const isPro = (!planExpired && userProfile?.plan === 'pro') || isAdmin;

  const value = {
    user,
    loading,
    userProfile,
    isAdmin,
    isPro,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
