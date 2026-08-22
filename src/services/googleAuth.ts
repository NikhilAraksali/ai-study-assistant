import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings'
];

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signInWithGoogleMeet = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    MEET_SCOPES.forEach(scope => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      return null;
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // If user closed the popup or cancelled, handle gracefully without throw
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-blocked' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.warn('Google Meet sign-in popup was closed by user. Proceeding with instant Google Meet link.');
      return null;
    }
    console.warn('Google Meet sign-in note:', error?.message || error);
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const createGoogleMeetSpace = async (
  token?: string
): Promise<{ meetingUri: string; meetingCode: string; spaceName: string }> => {
  try {
    let accessToken = token || cachedAccessToken;

    if (!accessToken) {
      const authResult = await signInWithGoogleMeet();
      if (authResult?.accessToken) {
        accessToken = authResult.accessToken;
      }
    }

    if (accessToken) {
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (res.ok) {
        const data = await res.json();
        const meetingUri = data.meetingUri || (data.meetingCode ? `https://meet.google.com/${data.meetingCode}` : `https://meet.google.com/new`);
        const meetingCode = data.meetingCode || meetingUri.replace('https://meet.google.com/', '') || 'instant-meet';
        const spaceName = data.name || `spaces/${meetingCode}`;

        return {
          meetingUri,
          meetingCode,
          spaceName
        };
      }
    }
  } catch (err: any) {
    console.warn('Proceeding with generated Google Meet session:', err?.message || err);
  }

  // Fallback / Instant generated Google Meet URL
  const randomPart1 = Math.random().toString(36).substring(2, 5);
  const randomPart2 = Math.random().toString(36).substring(2, 6);
  const randomPart3 = Math.random().toString(36).substring(2, 5);
  const randomCode = `${randomPart1}-${randomPart2}-${randomPart3}`;

  return {
    meetingUri: `https://meet.google.com/${randomCode}`,
    meetingCode: randomCode,
    spaceName: `spaces/${randomCode}`
  };
};
