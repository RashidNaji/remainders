import { auth } from '@/lib/firebase';

/** Returns the current user's Firebase ID token, or null if not signed in. */
export async function getAuthToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}
