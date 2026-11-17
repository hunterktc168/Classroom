import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Lazily initialize Firebase App & Auth on the client only to avoid SSR side effects
let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (cachedAuth) {
    return cachedAuth;
  }
  const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

function createClassroomProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
  provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
  provider.addScope('https://www.googleapis.com/auth/classroom.profile.emails');
  provider.addScope('https://www.googleapis.com/auth/classroom.profile.photos');
  return provider;
}

// In-memory access token cache (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Subscribes to Firebase Auth state changes on the client.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthNeeded?: (user: User | null) => void
) => {
  const auth = getFirebaseAuth();
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (!user) {
        cachedAccessToken = null;
      }
      onAuthNeeded?.(user);
    }
  });
};

/**
 * Triggers interactive Google Sign-In popup with Google Classroom scopes.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Authentication can only be initiated in the browser.');
  }

  try {
    isSigningIn = true;
    const provider = createClassroomProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain an access token with Google Classroom permissions.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached OAuth access token from memory.
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Clears the cached OAuth access token (e.g., when a 401 token-expired response is received).
 */
export const clearAccessToken = () => {
  cachedAccessToken = null;
};

/**
 * Signs the user out of Firebase Auth and clears the in-memory access token.
 */
export const logout = async () => {
  cachedAccessToken = null;
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
};
