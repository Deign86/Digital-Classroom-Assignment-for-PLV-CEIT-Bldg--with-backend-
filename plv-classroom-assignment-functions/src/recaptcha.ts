/**
 * reCAPTCHA Enterprise verification for Firebase Cloud Functions
 * 
 * Provides server-side verification of reCAPTCHA tokens from client applications.
 * Supports both direct env var secrets and Google Cloud Secret Manager.
 * Includes password leak detection via reCAPTCHA Enterprise.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

// Cached secret to avoid repeated Secret Manager calls
let cachedRecaptchaSecret: string | undefined;

/**
 * Validates if an email is from the PLV domain or is an allowed test account.
 * 
 * Server-side validation to prevent bypassing client-side checks.
 * Reads test emails from TEST_EMAILS environment variable.
 */
function validatePLVEmail(email: string): { isValid: boolean; error?: string } {
  const sanitizedEmail = email.trim().toLowerCase();
  
  // Check if email is from PLV domain
  if (sanitizedEmail.endsWith('@plv.edu.ph')) {
    return { isValid: true };
  }
  
  // Check if email is in the allowed test emails list
  const testEmails = process.env.TEST_EMAILS;
  if (testEmails) {
    const allowedTestEmails = testEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
    
    if (allowedTestEmails.includes(sanitizedEmail)) {
      logger.info('Test email allowed for signup', { email: sanitizedEmail });
      return { isValid: true };
    }
  }
  
  return { 
    isValid: false, 
    error: 'Email must be from @plv.edu.ph domain' 
  };
}

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

interface PasswordCheckResult {
  verified: boolean;
  score: number | null;
  isPasswordLeaked?: boolean;
  leakReason?: string[];
  reason?: string;
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
      'https://digital-classroom-reservation-for-plv.vercel.app',
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
 * Verify reCAPTCHA token with optional password leak detection using Enterprise API
 * This uses the full reCAPTCHA Enterprise SDK for advanced features
 */
export async function verifyRecaptchaWithPassword(
  token: string,
  expectedAction: string,
  userPassword?: string,
  minScore: number = 0.5
): Promise<PasswordCheckResult> {
  const client = new RecaptchaEnterpriseServiceClient();
  
  // Get project ID
  const projectId = 
    process.env.GCLOUD_PROJECT || 
    process.env.GCP_PROJECT ||
    (() => {
      try {
        const cfg = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
        return cfg.projectId;
      } catch (e) {
        return undefined;
      }
    })();

  if (!projectId) {
    logger.error('Project ID not found for reCAPTCHA Enterprise');
    throw new HttpsError('failed-precondition', 'Project ID not configured');
  }

  const projectPath = client.projectPath(projectId);
  const siteKey = process.env.RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    logger.error('RECAPTCHA_SITE_KEY not configured');
    throw new HttpsError('failed-precondition', 'reCAPTCHA site key not configured');
  }

  const request: any = {
    assessment: {
      event: {
        token: token,
        expectedAction: expectedAction,
        siteKey: siteKey,
      },
    },
    parent: projectPath,
  };

  // Add password leak check if password provided
  if (userPassword) {
    request.assessment.accountDefenderAssessment = {
      passwordLeakVerification: {
        hashedUserCredentials: {
          username: '', // Optional, leave empty
          password: userPassword, // SDK will hash this
        },
      },
    };
  }

  try {
    const [response] = await client.createAssessment(request);
    
    const score = response.riskAnalysis?.score || 0;
    const isValid = score >= minScore;
    
    let isLeaked = false;
    let leakReason: string[] = [];
    
    // Check password leak status (using any to bypass type checking for this feature)
    const accountDefender = response.accountDefenderAssessment as any;
    if (accountDefender?.passwordLeakVerification) {
      const leakVerification = accountDefender.passwordLeakVerification;
      
      // Check if password was leaked
      if (leakVerification.credentialLeakStatus === 'CREDENTIAL_LEAKED') {
        isLeaked = true;
        logger.warn('Password leak detected', {
          action: expectedAction,
          hasAnnotations: !!(leakVerification.credentialLeakAnnotations),
        });
      }
      
      // Get leak annotations if available
      if (leakVerification.credentialLeakAnnotations) {
        leakReason = leakVerification.credentialLeakAnnotations.map(
          (annotation: any) => annotation.toString()
        );
      }
    }

    logger.info('reCAPTCHA Enterprise verification complete', {
      score,
      isValid,
      action: expectedAction,
      passwordChecked: !!userPassword,
      isLeaked,
    });

    return {
      verified: isValid,
      score,
      isPasswordLeaked: isLeaked,
      leakReason: leakReason.length > 0 ? leakReason : undefined,
    };
  } catch (error: any) {
    logger.error('reCAPTCHA Enterprise verification failed:', error);
    throw new HttpsError('internal', `reCAPTCHA verification failed: ${error.message}`);
  }
}

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
 * Now includes password leak detection.
 * CORS enabled for localhost and production domains.
 */
export const createSignupRequest = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://plv-classroom-assigment.web.app',
      'https://plv-classroom-assigment.firebaseapp.com',
      'https://digital-classroom-reservation-for-plv.vercel.app',
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
    password?: string;
  }>) => {
    const callerUid = request.auth?.uid;
    const { uid, email, name, department, departments, recaptchaToken, password } = request.data || {};

    if (!uid || typeof uid !== 'string')
      throw new HttpsError('invalid-argument', 'uid is required');
    if (!email || typeof email !== 'string')
      throw new HttpsError('invalid-argument', 'email is required');
    if (!name || typeof name !== 'string')
      throw new HttpsError('invalid-argument', 'name is required');
    
    // Validate email domain (PLV or test account)
    const emailValidation = validatePLVEmail(email);
    if (!emailValidation.isValid) {
      logger.warn('Invalid email domain for signup', { email, error: emailValidation.error });
      throw new HttpsError('invalid-argument', emailValidation.error || 'Invalid email domain');
    }
    
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
      // Verify reCAPTCHA token with optional password leak detection
      const recaptchaResult = await verifyRecaptchaWithPassword(
        recaptchaToken || '',
        'SIGNUP',
        password, // Optional password for leak detection
        0.5
      );
      
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
        passwordChecked: !!password,
        isLeaked: recaptchaResult.isPasswordLeaked,
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

      return {
        success: true,
        request: record,
        isPasswordLeaked: recaptchaResult.isPasswordLeaked || false,
        leakReason: recaptchaResult.leakReason || [],
      };
    } catch (err: any) {
      logger.error('createSignupRequest error', err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', 'Failed to create signup request');
    }
  }
);
