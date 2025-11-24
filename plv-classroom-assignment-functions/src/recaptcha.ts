/**
 * reCAPTCHA Enterprise verification for Firebase Cloud Functions
 * 
 * Provides server-side verification of reCAPTCHA tokens from client applications.
 * Supports both direct env var secrets and Google Cloud Secret Manager.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Cached secret to avoid repeated Secret Manager calls
let cachedRecaptchaSecret: string | undefined;

/**
 * Retrieves the reCAPTCHA secret from environment or Secret Manager
 */
async function getRecaptchaSecret(): Promise<string> {
  if (cachedRecaptchaSecret) return cachedRecaptchaSecret;

  // Prefer local env var (useful for local development/.env files)
  // Firebase functions config sets env vars in UPPERCASE with underscores
  // e.g., functions:config:set recaptcha.secret=XXX becomes RECAPTCHA_SECRET env var
  if (process.env.RECAPTCHA_SECRET) {
    cachedRecaptchaSecret = process.env.RECAPTCHA_SECRET;
    logger.info('Using reCAPTCHA secret from RECAPTCHA_SECRET env var');
    return cachedRecaptchaSecret;
  }

  // If a Secret Manager resource name is provided, use it.
  // Example: projects/my-project/secrets/recaptcha-secret/versions/latest
  const secretName = process.env.RECAPTCHA_SECRET_NAME;
  
  if (!secretName) {
    // As a last resort attempt a conventional secret name using project id
    const projectId = 
      process.env.GCLOUD_PROJECT || 
      process.env.GCP_PROJECT || 
      (process.env.FIREBASE_CONFIG && (() => {
        try {
          const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
          return cfg.projectId;
        } catch (e) {
          return undefined;
        }
      })());

    if (projectId) {
      // default to a secret named 'recaptcha-secret'
      // caller may override via RECAPTCHA_SECRET_NAME for clarity
      process.env.RECAPTCHA_SECRET_NAME = `projects/${projectId}/secrets/recaptcha-secret/versions/latest`;
    }
  }

  const finalName = process.env.RECAPTCHA_SECRET_NAME;
  if (!finalName) {
    logger.error('reCAPTCHA secret not configured. Set RECAPTCHA_SECRET env var or RECAPTCHA_SECRET_NAME for Secret Manager.');
    throw new HttpsError(
      'failed-precondition',
      'reCAPTCHA secret not configured (set RECAPTCHA_SECRET or RECAPTCHA_SECRET_NAME)'
    );
  }

  try {
    // Dynamically require to avoid hard dependency at compile time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const smModule = require('@google-cloud/secret-manager');
    const client = new smModule.SecretManagerServiceClient();
    const [accessResponse] = await client.accessSecretVersion({ name: finalName });
    const payload = accessResponse.payload?.data?.toString('utf8');
    
    if (!payload) throw new Error('Empty secret payload');
    
    cachedRecaptchaSecret = payload.trim();
    logger.info('Using reCAPTCHA secret from Secret Manager');
    return cachedRecaptchaSecret as string;
  } catch (err) {
    logger.error('Failed to fetch reCAPTCHA secret from Secret Manager', err);
    throw new HttpsError('internal', 'Failed to retrieve reCAPTCHA secret');
  }
}

interface RecaptchaVerificationResult {
  success: boolean;
  score: number | null;
  action: string | null;
  raw: any;
}

/**
 * Internal function to verify a reCAPTCHA token with Google's API
 */
async function verifyRecaptchaTokenInternal(token: string): Promise<RecaptchaVerificationResult> {
  const secret = await getRecaptchaSecret();
  
  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const body: any = await res.json();
  
  logger.debug('reCAPTCHA verification (internal)', {
    success: !!body.success,
    score: body.score,
    action: body.action,
  });

  return {
    success: !!body.success,
    score: typeof body.score === 'number' ? body.score : null,
    action: body.action || null,
    raw: body,
  };
}

/**
 * Public callable for diagnostics/testing. Verifies token and returns score/action.
 * Can be called from client to test reCAPTCHA integration.
 * CORS enabled for localhost and production domains.
 */
export const verifyRecaptcha = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://plv-classroom-assigment.web.app',
      'https://plv-classroom-assigment.firebaseapp.com',
      /\.vercel\.app$/
    ]
  },
  async (request: CallableRequest<{ token?: string }>) => {
  const token = request.data?.token;
  
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing reCAPTCHA token');
  }

  try {
    const result = await verifyRecaptchaTokenInternal(token);
    
    if (!result.success) {
      throw new HttpsError('permission-denied', 'reCAPTCHA verification failed');
    }

    return {
      success: true,
      score: result.score ?? null,
      action: result.action ?? null,
    };
  } catch (err: any) {
    logger.error('verifyRecaptcha callable error', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Failed to verify reCAPTCHA token');
  }
  }
);

/**
 * Helper function to verify reCAPTCHA token with score threshold
 * Returns true if token is valid and score is above threshold
 */
export async function verifyRecaptchaToken(
  token: string | undefined,
  action: string,
  minScore: number = 0.5
): Promise<{ verified: boolean; score: number | null; reason?: string }> {
  if (!token) {
    return { verified: false, score: null, reason: 'No reCAPTCHA token provided' };
  }

  try {
    const result = await verifyRecaptchaTokenInternal(token);
    
    if (!result.success) {
      return { verified: false, score: result.score, reason: 'reCAPTCHA verification failed' };
    }

    // Check if action matches (case-insensitive)
    if (result.action && result.action.toUpperCase() !== action.toUpperCase()) {
      logger.warn('reCAPTCHA action mismatch', {
        expected: action,
        actual: result.action,
      });
      return {
        verified: false,
        score: result.score,
        reason: `Action mismatch: expected ${action}, got ${result.action}`,
      };
    }

    // Check score threshold
    if (result.score !== null && result.score < minScore) {
      logger.warn('reCAPTCHA score below threshold', {
        score: result.score,
        threshold: minScore,
        action,
      });
      return {
        verified: false,
        score: result.score,
        reason: `Score ${result.score} below threshold ${minScore}`,
      };
    }

    return { verified: true, score: result.score };
  } catch (err: any) {
    logger.error('Error verifying reCAPTCHA token', err);
    return {
      verified: false,
      score: null,
      reason: err.message || 'Verification error',
    };
  }
}

/**
 * Server-side callable to create a signup request using the Admin SDK.
 * Expects the client to have created the Auth user (uid) first and to pass
 * the same uid. Only the authenticated owner or an admin may call this.
 * 
 * This function validates the reCAPTCHA token before creating the signup request.
 * CORS enabled for localhost and production domains.
 */
export const createSignupRequest = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://plv-classroom-assigment.web.app',
      'https://plv-classroom-assigment.firebaseapp.com',
      /\.vercel\.app$/
    ]
  },
  async (request: CallableRequest<{
    uid?: string;
    email?: string;
    name?: string;
    department?: string;
    departments?: string[];
    recaptchaToken?: string;
  }>) => {
    const callerUid = request.auth?.uid;
    const { uid, email, name, department, departments, recaptchaToken } = request.data || {};

    if (!uid || typeof uid !== 'string')
      throw new HttpsError('invalid-argument', 'uid is required');
    if (!email || typeof email !== 'string')
      throw new HttpsError('invalid-argument', 'email is required');
    if (!name || typeof name !== 'string')
      throw new HttpsError('invalid-argument', 'name is required');
    
    // Support both single department (legacy) and multiple departments (new)
    const depts = departments && Array.isArray(departments) && departments.length > 0
      ? departments
      : (department && typeof department === 'string' ? [department] : []);
    
    if (depts.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one department is required');
    }

    // Allow if caller is the same user, or has admin claim
    const isOwner = !!callerUid && callerUid === uid;
    const isAdmin = !!request.auth && request.auth.token?.admin === true;

    if (!isOwner && !isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only the account owner or an admin may create a signup request'
      );
    }

    try {
      // Verify reCAPTCHA token
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'SIGNUP', 0.5);
      
      if (!recaptchaResult.verified) {
        logger.warn('reCAPTCHA verification failed for signup request', {
          uid,
          email,
          reason: recaptchaResult.reason,
          score: recaptchaResult.score,
        });
        throw new HttpsError(
          'permission-denied',
          `Security verification failed: ${recaptchaResult.reason || 'Invalid token'}`
        );
      }

      logger.info('reCAPTCHA verified for signup', {
        uid,
        email,
        score: recaptchaResult.score,
      });

      const db = admin.firestore();
      const now = new Date().toISOString();

      const record = {
        uid,
        email,
        emailLower: String(email).toLowerCase(),
        name,
        department: depts[0], // Primary department for backwards compatibility
        departments: depts, // Full list of departments
        status: 'pending' as const,
        requestDate: now,
        createdAt: now,
        updatedAt: now,
        recaptchaVerified: recaptchaResult.verified,
        recaptchaScore: recaptchaResult.score,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      };

      await db.collection('signupRequests').doc(uid).set(record);

      return { success: true, request: record };
    } catch (err: any) {
      logger.error('createSignupRequest error', err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', 'Failed to create signup request');
    }
  }
);
