import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { logger } from './logger';

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

  try {
    if (getApps().length === 0) {
      logger.log('Initializing Firebase app with projectId:', firebaseConfig.projectId);
      return initializeApp(firebaseConfig);
    }
    return getApp();
  } catch (error) {
    logger.error('Failed to initialize Firebase app:', error);
    throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!appInstance) {
    appInstance = createFirebaseApp();
  }
  return appInstance;
};

export const getFirebaseDb = (): Firestore => {
  if (!firestoreInstance) {
    try {
      const app = getFirebaseApp();
      firestoreInstance = getFirestore(app);
      logger.log('Firestore instance initialized for project:', app.options.projectId);
    } catch (error) {
      logger.error('Failed to initialize Firestore:', error);
      throw new Error(`Firestore initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return firestoreInstance;
};

export const getFirebaseAuth = async (): Promise<Auth> => {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
    
    // Set auth persistence to LOCAL (survives browser restarts)
    try {
      await setPersistence(authInstance, browserLocalPersistence);
    } catch (error) {
      logger.warn('Failed to set auth persistence:', error);
    }
  }
  return authInstance;
};
