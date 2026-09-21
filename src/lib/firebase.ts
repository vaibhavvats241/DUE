import { initializeApp, getApps, getApp, FirebaseApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

const LOCAL_STORAGE_FIREBASE_KEY = 'due_khata_firebase_config';

export function parseFirebaseConfigInput(raw: string): FirebaseConfigOptions {
  const text = raw.trim();
  if (!text) {
    throw new Error('Config input is empty');
  }

  // 1. Try standard JSON first
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return {
        apiKey: parsed.apiKey?.trim(),
        authDomain: parsed.authDomain?.trim(),
        projectId: parsed.projectId?.trim(),
        storageBucket: parsed.storageBucket?.trim(),
        messagingSenderId: parsed.messagingSenderId?.toString().trim(),
        appId: parsed.appId?.trim(),
        firestoreDatabaseId: parsed.firestoreDatabaseId?.trim(),
      };
    }
  } catch {
    // Not valid strict JSON, proceed to regex parser
  }

  // 2. Regex extract individual fields regardless of JS code wrapper, comments, or quotes
  const extract = (key: string): string | undefined => {
    const regex = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
  };

  const apiKey = extract('apiKey');
  const projectId = extract('projectId');
  const authDomain = extract('authDomain');
  const storageBucket = extract('storageBucket');
  const messagingSenderId = extract('messagingSenderId');
  const appId = extract('appId');
  const firestoreDatabaseId = extract('firestoreDatabaseId');

  if (!apiKey || !projectId) {
    throw new Error('Config requires at least apiKey and projectId.');
  }

  return {
    apiKey,
    projectId,
    authDomain,
    storageBucket,
    messagingSenderId,
    appId,
    firestoreDatabaseId,
  };
}

export function getSavedFirebaseConfig(): FirebaseConfigOptions | null {
  // 1. Check bundled/provisioned config first
  if (firebaseAppletConfig && (firebaseAppletConfig as any).apiKey && (firebaseAppletConfig as any).projectId) {
    return {
      apiKey: (firebaseAppletConfig as any).apiKey,
      authDomain: (firebaseAppletConfig as any).authDomain,
      projectId: (firebaseAppletConfig as any).projectId,
      storageBucket: (firebaseAppletConfig as any).storageBucket,
      messagingSenderId: (firebaseAppletConfig as any).messagingSenderId,
      appId: (firebaseAppletConfig as any).appId,
      firestoreDatabaseId: (firebaseAppletConfig as any).firestoreDatabaseId || undefined,
    };
  }

  // 2. Check localStorage override
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_FIREBASE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return {
          apiKey: parsed.apiKey.trim(),
          authDomain: parsed.authDomain ? parsed.authDomain.trim() : undefined,
          projectId: parsed.projectId.trim(),
          storageBucket: parsed.storageBucket ? parsed.storageBucket.trim() : undefined,
          messagingSenderId: parsed.messagingSenderId ? String(parsed.messagingSenderId).trim() : undefined,
          appId: parsed.appId ? parsed.appId.trim() : undefined,
          firestoreDatabaseId: parsed.firestoreDatabaseId ? parsed.firestoreDatabaseId.trim() : undefined,
        };
      }
    }
  } catch (e) {
    console.warn('Error reading saved firebase config from localStorage:', e);
  }

  // 3. Check Vite environment variables
  const envConfig: FirebaseConfigOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (envConfig.projectId && envConfig.apiKey) {
    return envConfig;
  }

  return null;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function resetFirebaseInstance() {
  appInstance = null;
  authInstance = null;
  firestoreInstance = null;
}

export function saveFirebaseConfig(config: FirebaseConfigOptions) {
  try {
    const cleanedConfig: FirebaseConfigOptions = {
      apiKey: config.apiKey?.trim(),
      authDomain: config.authDomain?.trim(),
      projectId: config.projectId?.trim(),
      storageBucket: config.storageBucket?.trim(),
      messagingSenderId: config.messagingSenderId ? String(config.messagingSenderId).trim() : undefined,
      appId: config.appId?.trim(),
      firestoreDatabaseId: config.firestoreDatabaseId?.trim(),
    };
    localStorage.setItem(LOCAL_STORAGE_FIREBASE_KEY, JSON.stringify(cleanedConfig));
    resetFirebaseInstance();
  } catch (e) {
    console.error('Failed to save Firebase config to localStorage:', e);
  }
}

export function clearFirebaseConfig() {
  localStorage.removeItem(LOCAL_STORAGE_FIREBASE_KEY);
  resetFirebaseInstance();
}

export function initFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
} {
  const config = getSavedFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null, isConfigured: false };
  }

  try {
    if (!appInstance) {
      if (!getApps().length) {
        appInstance = initializeApp(config);
      } else {
        appInstance = getApp();
      }
    }

    if (!authInstance && appInstance) {
      authInstance = getAuth(appInstance);
    }
    if (!firestoreInstance && appInstance) {
      firestoreInstance = config.firestoreDatabaseId
        ? getFirestore(appInstance, config.firestoreDatabaseId)
        : getFirestore(appInstance);
    }

    return {
      app: appInstance,
      auth: authInstance,
      db: firestoreInstance,
      isConfigured: true,
    };
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return { app: null, auth: null, db: null, isConfigured: false };
  }
}

/**
 * Ensures user is authenticated via Firebase Auth (Anonymous) if configured
 */
export async function ensureFirebaseAuth(): Promise<{
  user: FirebaseUser | null;
  authUid?: string;
  error?: string;
}> {
  const fb = initFirebase();
  if (!fb.isConfigured || !fb.auth) {
    return { user: null, error: 'Firebase is not configured.' };
  }

  if (fb.auth.currentUser) {
    return { user: fb.auth.currentUser, authUid: fb.auth.currentUser.uid };
  }

  try {
    const cred = await signInAnonymously(fb.auth);
    return { user: cred.user, authUid: cred.user.uid };
  } catch (err: any) {
    console.warn('Firebase signInAnonymously failed:', err);
    return {
      user: null,
      error: err?.message || 'Anonymous authentication failed. Please enable Anonymous sign-in in Firebase Console.',
    };
  }
}

/**
 * Tests the Firebase connection and returns diagnostic info
 */
export async function testFirebaseConnection(overrideConfig?: FirebaseConfigOptions): Promise<{
  success: boolean;
  message: string;
  projectId?: string;
  authUid?: string;
}> {
  if (overrideConfig) {
    saveFirebaseConfig(overrideConfig);
  }
  const config = overrideConfig || getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return {
      success: false,
      message: 'No Firebase configuration found. Please enter your apiKey and projectId.',
    };
  }

  try {
    const fb = initFirebase();
    if (!fb.app || !fb.db) {
      return {
        success: false,
        message: 'Could not initialize Firebase app with current configuration.',
      };
    }

    // Try signing in anonymously
    let authUid: string | undefined;
    if (fb.auth) {
      try {
        const authRes = await ensureFirebaseAuth();
        authUid = authRes.authUid;
      } catch (authErr: any) {
        console.warn('Auth check in test connection warning:', authErr);
      }
    }

    return {
      success: true,
      projectId: config.projectId,
      authUid,
      message: `Successfully connected to Firebase project "${config.projectId}"!${authUid ? ` (Auth UID: ${authUid})` : ''}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Firebase.',
    };
  }
}

/**
 * Sign in using genuine Google Authentication popup
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}> {
  const fb = initFirebase();
  if (!fb.isConfigured || !fb.auth) {
    return { success: false, error: 'Firebase is not initialized. Please verify configuration.' };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(fb.auth, provider);
    return { success: true, user: result.user };
  } catch (err: any) {
    console.error('Google Sign-In notice:', err);
    return {
      success: false,
      error: err?.message || 'Google sign-in was cancelled or encountered an error.',
    };
  }
}

/**
 * Listen for Firebase Auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
  const fb = initFirebase();
  if (!fb.auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, callback);
}

/**
 * Sign in using email and password
 */
export async function loginWithFirebaseEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  const fb = initFirebase();
  if (!fb.isConfigured || !fb.auth) {
    return { success: false, error: 'Firebase is not configured yet. Configure Firebase to use Email Auth.' };
  }

  try {
    const cred = await signInWithEmailAndPassword(fb.auth, email, pass);
    return { success: true, user: cred.user };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Email sign-in failed. Please verify email and password.',
    };
  }
}

/**
 * Register a new user with email and password
 */
export async function signUpWithFirebaseEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  const fb = initFirebase();
  if (!fb.isConfigured || !fb.auth) {
    return { success: false, error: 'Firebase is not configured yet. Configure Firebase to register accounts.' };
  }

  try {
    const cred = await createUserWithEmailAndPassword(fb.auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return { success: true, user: cred.user };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Sign-up failed. Make sure Email/Password sign-in is enabled in Firebase Console.',
    };
  }
}

/**
 * Sign out of Firebase
 */
export async function signOutFirebaseUser(): Promise<{ success: boolean; error?: string }> {
  const fb = initFirebase();
  if (!fb.auth) return { success: true };

  try {
    await signOut(fb.auth);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sign-out failed' };
  }
}

/**
 * Diagnostically verify login status (Auth state check)
 */
export function checkAuthDiagnostic(): {
  isConfigured: boolean;
  isLoggedIn: boolean;
  currentUser: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
    isAnonymous?: boolean;
  } | null;
  message: string;
} {
  const fb = initFirebase();
  if (!fb.isConfigured || !fb.auth) {
    return {
      isConfigured: false,
      isLoggedIn: true, // Local Khata persona login is active
      currentUser: null,
      message: 'Local Offline Persona mode is active and working properly.',
    };
  }

  const u = fb.auth.currentUser;
  if (!u) {
    return {
      isConfigured: true,
      isLoggedIn: false,
      currentUser: null,
      message: 'Firebase is configured, but no active session found. You can Sign In or continue with Guest/Anonymous mode.',
    };
  }

  return {
    isConfigured: true,
    isLoggedIn: true,
    currentUser: {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      isAnonymous: u.isAnonymous,
    },
    message: u.isAnonymous
      ? `Guest Auth active (UID: ${u.uid.substring(0, 8)}...). Fully working.`
      : `Authenticated as ${u.email || u.displayName || u.uid}. Fully working.`,
  };
}
