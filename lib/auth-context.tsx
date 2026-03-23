/**
 * Authentication Context Provider
 * 
 * Manages user authentication state across the application.
 * Provides current user, loading state, and auth functions to all components.
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut, getUserProfile, updateLastActive } from '@/lib/firebase';

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

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await getUserProfile(userId);
    if (data) {
      setUserProfile(data);
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
        updateLastActive(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isPro = userProfile?.plan === 'pro' || isAdmin;

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
