/**
 * Server-side Firebase Utilities
 * 
 * REST API-based Firebase operations for Edge runtime and server components.
 * This avoids the 'navigator is not defined' error that occurs with the 
 * Firebase client SDK in server environments.
 */

// Firebase configuration with fallbacks for demo/dev mode
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key';

// Check if Firebase is properly configured
const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                              process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * Get user config by username using REST API
 */
export async function getUserConfigByUsername(username: string) {
  // Return demo config if Firebase is not configured
  if (!isFirebaseConfigured) {
    console.log('Firebase not configured - returning demo config for', username);
    return { 
      data: {
        birthDate: '1990-01-01',
        device: 'desktop',
        layout: 'life-view',
        colors: {
          background: '#000000',
          foreground: '#FFFFFF',
          accent: '#888888'
        },
        typography: {
          fontFamily: 'monospace',
          fontSize: 16
        }
      }, 
      error: null 
    };
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/configs/${username.toLowerCase()}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: 'Config not found' };
      }
      return { data: null, error: `HTTP ${response.status}` };
    }

    const doc = await response.json();
    
    // Convert Firestore document format to plain object
    const data = convertFirestoreDocument(doc);
    
    // Debug logging
    console.log('Fetched config for', username);
    console.log('- layout:', data?.layout);
    console.log('- typography:', data?.typography);
    console.log('- colors:', data?.colors);
    console.log('- device:', data?.device);
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get user plan by userId using REST API
 */
export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  if (!isFirebaseConfigured) return 'free';
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`;
    const response = await fetch(url);
    if (!response.ok) return 'free';
    const doc = await response.json();
    const data = convertFirestoreDocument(doc);
    return data?.plan === 'pro' ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}

/**
 * Get plugin by ID using REST API
 */
export async function getPlugin(pluginId: string) {
  // Return demo plugin if Firebase is not configured
  if (!isFirebaseConfigured) {
    console.log('Firebase not configured - returning demo plugin for', pluginId);
    return { 
      data: null, 
      error: 'Firebase not configured - plugin system unavailable in demo mode' 
    };
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/plugins/${pluginId}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: 'Plugin not found' };
      }
      return { data: null, error: `HTTP ${response.status}` };
    }

    const doc = await response.json();
    const data = { id: pluginId, ...convertFirestoreDocument(doc) };
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching plugin:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Convert Firestore REST API document format to plain object
 */
function convertFirestoreDocument(doc: any): any {
  if (!doc.fields) return null;

  const result: any = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

/**
 * Convert Firestore REST API value to JavaScript value
 */
function convertFirestoreValue(value: any): any {
  // Handle null/undefined
  if (!value || value.nullValue !== undefined) return null;
  
  // Handle primitive types
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  
  // Handle arrays (including empty arrays)
  if (value.arrayValue !== undefined) {
    if (!value.arrayValue.values || value.arrayValue.values.length === 0) {
      return [];
    }
    return value.arrayValue.values.map((v: any) => convertFirestoreValue(v));
  }
  
  // Handle nested objects/maps (including empty objects)
  if (value.mapValue !== undefined) {
    if (!value.mapValue.fields || Object.keys(value.mapValue.fields).length === 0) {
      return {};
    }
    const obj: any = {};
    for (const [k, v] of Object.entries(value.mapValue.fields)) {
      obj[k] = convertFirestoreValue(v);
    }
    return obj;
  }
  
  // Fallback
  console.warn('Unknown Firestore value type:', JSON.stringify(value));
  return null;
}
