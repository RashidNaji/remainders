/**
 * Firebase Configuration and Utilities
 * 
 * Client-side Firebase setup for authentication and Firestore database.
 * Uses environment variables for configuration.
 * 
 * NOTE: This module only initializes Firebase in browser environments.
 * Server-side code should use direct REST API calls or Firebase Admin SDK.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage
} from 'firebase/storage';
import type { UserPlan, PresetBackground } from './types';

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Check if Firebase is properly configured (not using demo values)
const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                              process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Initialize Firebase only in browser environment (singleton pattern)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (typeof window !== 'undefined') {
  // Only initialize Firebase if properly configured
  if (isFirebaseConfigured) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    console.warn('Firebase not configured - running in demo mode. Add .env.local with Firebase credentials for full functionality.');
  }
}

// Export Firebase services (will be undefined on server)
export { auth, db, storage };

// Google Auth Provider (only initialized in browser)
let googleProvider: GoogleAuthProvider | undefined;
if (typeof window !== 'undefined' && auth) {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    const message = isFirebaseConfigured 
      ? 'Auth not initialized (server-side)' 
      : 'Firebase not configured - add .env.local with Firebase credentials to enable authentication';
    return { user: null, error: message };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (!auth) {
    return { error: 'Auth not initialized (server-side)' };
  }
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { error: error.message };
  }
}

/**
 * Subscribe to authentication state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    console.warn('Auth not initialized (server-side)');
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}

/*if (!db) {
    console.error('Firestore not initialized (server-side)');
    return false;
  }
  *
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!db) {
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured - running in demo mode');
    } else {
      console.error('Firestore not initialized');
    }
    return false;
  }
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const profileDoc = await getDoc(doc(db, 'users', userId));
    if (profileDoc.exists()) {
      return { data: profileDoc.data(), error: null };
    }
    return { data: null, error: 'Profile not found' };
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get user config by username
 */
export async function getUserConfigByUsername(username: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const configDoc = await getDoc(doc(db, 'configs', username.toLowerCase()));
    if (configDoc.exists()) {
      return { data: configDoc.data(), error: null };
    }
    return { data: null, error: 'Config not found' };
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Create or update user profile with username
 */
export async function saveUserProfile(userId: string, username: string, displayName: string, email: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { success: false, error: message };
  }
  try {
    const usernameLower = username.toLowerCase();
    
    // Check if username is available
    const isAvailable = await isUsernameAvailable(usernameLower);
    if (!isAvailable) {
      return { success: false, error: 'Username already taken' };
    }

    // Create username claim
    await setDoc(doc(db, 'usernames', usernameLower), {
      userId,
      createdAt: Timestamp.now()
    });

    // Create/update user profile
    await setDoc(doc(db, 'users', userId), {
      username: usernameLower,
      displayName,
      email,
      plan: 'free',
      role: 'user',
      createdAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error saving profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save user wallpaper configuration
 */
export async function saveUserConfig(username: string, config: any) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { success: false, error: message };
  }
  try {
    const usernameLower = username.toLowerCase();

    // Firestore rejects undefined values; use deleteField() to remove optional fields when null/undefined
    const configToSave = { ...config };
    if (configToSave.backgroundImage == null) {
      configToSave.backgroundImage = deleteField();
    }
    // Clear cached wallpaper so next request regenerates with the new config
    configToSave.cacheHash = deleteField();
    configToSave.cachePath = deleteField();

    await setDoc(doc(db, 'configs', usernameLower), {
      ...configToSave,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available plugins from marketplace
 */
export async function getAvailablePlugins(userId?: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: [], error: message };
  }
  try {
    const pluginsQuery = query(
      collection(db, 'plugins'),
      where('approved', '==', true)
    );
    const snapshot = await getDocs(pluginsQuery);
    const plugins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any)).filter((plugin: any) => {
      // Show all public plugins
      if (!plugin.isPrivate) return true;
      // Show private plugins only to their author
      return userId && plugin.authorId === userId;
    });
    return { data: plugins, error: null };
  } catch (error: any) {
    console.error('Error fetching plugins:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get plugin by ID
 */
export async function getPlugin(pluginId: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const pluginDoc = await getDoc(doc(db, 'plugins', pluginId));
    if (pluginDoc.exists()) {
      return { data: { id: pluginDoc.id, ...pluginDoc.data() }, error: null };
    }
    return { data: null, error: 'Plugin not found' };
  } catch (error: any) {
    console.error('Error fetching plugin:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Check for a pending Ko-fi grant and apply it to the user.
 * Called after a user signs up or logs in.
 */
export async function applyPendingKofiGrant(userId: string, email: string, username: string): Promise<boolean> {
  if (!db) return false;
  try {
    const grantDoc = await getDoc(doc(db, 'kofi_grants', email.toLowerCase()));
    if (!grantDoc.exists()) return false;
    const grant = grantDoc.data();
    if (grant?.applied) return false;

    // Use expiry stored in the grant doc (set at donation time), or fall back to 30 days from now
    const expiresAtTs: Timestamp = grant?.planExpiresAt instanceof Timestamp
      ? grant.planExpiresAt
      : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    await updateDoc(doc(db, 'users', userId), {
      plan: 'pro',
      planGrantedBy: 'kofi',
      planGrantedAt: Timestamp.now(),
      planExpiresAt: expiresAtTs,
    });
    if (username) {
      try {
        await updateDoc(doc(db, 'configs', username.toLowerCase()), {
          plan: 'pro',
          planExpiresAt: expiresAtTs,
        });
      } catch { /* config may not exist yet */ }
    }
    await updateDoc(doc(db, 'kofi_grants', email.toLowerCase()), { applied: true });
    return true;
  } catch (error) {
    console.error('Error applying Ko-fi grant:', error);
    return false;
  }
}

/**
 * Subscribe to real-time user profile updates.
 * Returns an unsubscribe function. Callback receives null when the doc doesn't exist.
 */
export function subscribeToUserProfile(userId: string, callback: (data: any | null) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/**
 * Update user's last active timestamp (silent fail)
 */
export async function updateLastActive(userId: string): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastActiveAt: Timestamp.now(),
    });
  } catch {
    // Silently fail — not critical
  }
}

/**
 * Upload a user's custom background image to Firebase Storage
 */
export async function uploadUserBackground(
  userId: string,
  file: File
): Promise<{ url: string; storagePath: string; error: string | null }> {
  if (!storage) return { url: '', storagePath: '', error: 'Storage not initialized' };

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { url: '', storagePath: '', error: 'Invalid file type. Use JPG, PNG, or WebP.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: '', storagePath: '', error: 'File size must be under 5MB.' };
  }

  try {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `backgrounds/users/${userId}/background.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    return { url, storagePath: path, error: null };
  } catch (error: any) {
    return { url: '', storagePath: '', error: error.message };
  }
}

/**
 * Delete a background image from Firebase Storage
 */
export async function deleteUserBackground(storagePath: string): Promise<{ error: string | null }> {
  if (!storage) return { error: 'Storage not initialized' };
  try {
    await deleteObject(storageRef(storage, storagePath));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get all preset backgrounds from Firestore
 */
export async function getPresetBackgrounds(): Promise<{ data: PresetBackground[]; error: string | null }> {
  if (!db) return { data: [], error: 'Firestore not initialized' };
  try {
    const snapshot = await getDocs(collection(db, 'backgrounds'));
    const backgrounds = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PresetBackground[];
    return { data: backgrounds, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

/**
 * Admin: Get all users
 */
export async function adminGetAllUsers(): Promise<{ data: any[]; error: string | null }> {
  if (!db) return { data: [], error: 'Firestore not initialized' };
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return { data: users, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

/**
 * Admin: Update user plan (grant / revoke Pro).
 * Also syncs plan and expiry into the configs doc so the wallpaper API can read it without auth.
 * @param expiresAt - Date when Pro expires. Pass null to never expire, undefined to clear (revoke).
 */
export async function adminUpdateUserPlan(
  userId: string,
  plan: UserPlan,
  username?: string,
  expiresAt?: Date | null
): Promise<{ error: string | null }> {
  if (!db) return { error: 'Firestore not initialized' };
  try {
    const userUpdate: any = { plan, planUpdatedAt: Timestamp.now() };
    const configUpdate: any = { plan };

    if (plan === 'pro') {
      userUpdate.planExpiresAt = expiresAt ? Timestamp.fromDate(expiresAt) : null;
      configUpdate.planExpiresAt = expiresAt ? Timestamp.fromDate(expiresAt) : null;
    } else {
      // Revoking — clear expiry
      userUpdate.planExpiresAt = deleteField();
      configUpdate.planExpiresAt = deleteField();
    }

    await updateDoc(doc(db, 'users', userId), userUpdate);
    // Sync into /configs/{username} so the edge wallpaper API can read it
    if (username) {
      try {
        await updateDoc(doc(db, 'configs', username.toLowerCase()), configUpdate);
      } catch {
        // Config may not exist yet — ignore
      }
    }
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Admin: Remove background image from a user's config (called when revoking Pro)
 */
export async function adminClearUserBackground(username: string): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'configs', username.toLowerCase()), {
      backgroundImage: deleteField(),
    });
  } catch {
    // Config may not exist yet — that's fine
  }
}

/**
 * Admin: Upload a preset background image
 */
export async function adminUploadPresetBackground(
  file: File,
  name: string,
  isFree: boolean,
  category: string = 'general'
): Promise<{ error: string | null }> {
  if (!storage || !db) return { error: 'Storage or Firestore not initialized' };
  try {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const backgroundId = `preset_${Date.now()}`;
    const path = `backgrounds/presets/${backgroundId}.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    await setDoc(doc(db, 'backgrounds', backgroundId), {
      name,
      url,
      thumbnailUrl: url,
      isFree,
      category,
      storagePath: path,
      createdAt: Timestamp.now(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Admin: Delete a preset background
 */
export async function adminDeletePresetBackground(
  backgroundId: string,
  storagePath: string
): Promise<{ error: string | null }> {
  if (!storage || !db) return { error: 'Storage or Firestore not initialized' };
  try {
    await deleteObject(storageRef(storage, storagePath));
    await deleteDoc(doc(db, 'backgrounds', backgroundId));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
