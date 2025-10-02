import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type FirebaseEnvKey = typeof REQUIRED_ENV_VARS[number];

type FirebaseConfigShape = Record<FirebaseEnvKey, string>;

const readFirebaseConfig = (): FirebaseConfigShape => {
  const missingKeys: FirebaseEnvKey[] = [];
  const config = REQUIRED_ENV_VARS.reduce((acc, key) => {
    const value = import.meta.env[key];
    if (!value) {
      missingKeys.push(key);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Partial<FirebaseConfigShape>);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missingKeys.join(
        ', '
      )}. Please create a .env file based on .env.example and restart the dev server.`
    );
  }

  return config as FirebaseConfigShape;
};

const createFirebaseApp = (): FirebaseApp => {
  const config = readFirebaseConfig();

  const firebaseConfig = {
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: config.VITE_FIREBASE_APP_ID,
  } as const;

  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }

  return getApp();
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!appInstance) {
    appInstance = createFirebaseApp();
  }
  return appInstance;
};

export const getFirebaseDb = (): Firestore => {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
};
