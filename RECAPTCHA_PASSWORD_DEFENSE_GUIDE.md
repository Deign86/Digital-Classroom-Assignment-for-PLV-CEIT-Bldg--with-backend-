# reCAPTCHA Password Defense Configuration Guide

## Issue in Google Cloud Console

The Google Cloud Console shows a warning:
> **Events in login, signup likely use compromised passwords**
> 
> Improve trust with your end users and protect your 10 account events in the past week from account takeovers and credential stuffing.

## What is Password Defense?

Password defense is a reCAPTCHA Enterprise feature that checks user passwords against Google's database of leaked credentials from data breaches. When enabled, it helps prevent:
- **Account takeovers** (ATO) using compromised passwords
- **Credential stuffing** attacks
- Users unknowingly using leaked passwords

## Current Implementation Status

✅ **Already Implemented:**
- reCAPTCHA Enterprise v3 for login and signup
- Score-based verification (threshold: 0.5)
- Action-specific token validation
- CORS-enabled Cloud Functions

❌ **Not Yet Implemented:**
- Password defense check
- Password leak detection warnings

## How to Enable Password Defense

### Step 1: Update Cloud Function to Check Passwords

Modify `plv-classroom-assignment-functions/src/recaptcha.ts` to include password checking:

```typescript
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

interface PasswordCheckResult {
  isValid: boolean;
  score: number;
  isLeaked?: boolean;
  leakReason?: string[];
}

export async function verifyRecaptchaWithPassword(
  token: string,
  expectedAction: string,
  userPassword?: string
): Promise<PasswordCheckResult> {
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(process.env.GCLOUD_PROJECT || '');

  const request: any = {
    assessment: {
      event: {
        token: token,
        expectedAction: expectedAction,
        siteKey: process.env.RECAPTCHA_SITE_KEY,
      },
    },
    parent: projectPath,
  };

  // Add password leak check if password provided
  if (userPassword) {
    request.assessment.accountDefenderAssessment = {
      passwordLeakVerification: {
        plainTextPassword: userPassword,
      },
    };
  }

  try {
    const [response] = await client.createAssessment(request);
    
    const score = response.riskAnalysis?.score || 0;
    const isValid = score >= 0.5;
    
    let isLeaked = false;
    let leakReason: string[] = [];
    
    // Check password leak status
    if (response.accountDefenderAssessment?.passwordLeakVerification) {
      const leakVerification = response.accountDefenderAssessment.passwordLeakVerification;
      isLeaked = leakVerification.passwordLeakStatus === 'PASSWORD_LEAKED';
      leakReason = leakVerification.credentialLeakAnnotations || [];
    }

    return {
      isValid,
      score,
      isLeaked,
      leakReason,
    };
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    throw new Error('reCAPTCHA verification failed');
  }
}
```

### Step 2: Update Cloud Functions to Use Password Check

**For Login (`verifyLoginRecaptcha`):**

```typescript
export const verifyLoginRecaptcha = onCall(
  { cors: allowedOrigins },
  async (request) => {
    const { email, token, password } = request.data;

    if (!email || !token || !password) {
      throw new Error('Missing required fields');
    }

    const result = await verifyRecaptchaWithPassword(
      token,
      'LOGIN',
      password
    );

    if (!result.isValid) {
      throw new Error('reCAPTCHA verification failed');
    }

    // Return leak status to frontend
    return {
      success: true,
      score: result.score,
      isPasswordLeaked: result.isLeaked || false,
      leakReason: result.leakReason || [],
    };
  }
);
```

**For Signup (`createSignupRequest`):**

```typescript
export const createSignupRequest = onCall(
  { cors: allowedOrigins },
  async (request) => {
    const { email, fullName, department, token, password } = request.data;

    // Validate inputs
    if (!email || !fullName || !department || !token || !password) {
      throw new Error('All fields are required');
    }

    // Verify reCAPTCHA with password check
    const result = await verifyRecaptchaWithPassword(
      token,
      'SIGNUP',
      password
    );

    if (!result.isValid) {
      throw new Error('reCAPTCHA verification failed');
    }

    // Warn user if password is leaked (but still allow signup)
    const warningData = result.isLeaked
      ? {
          passwordWarning: true,
          leakReason: result.leakReason,
        }
      : {};

    // Create signup request in Firestore
    const signupRef = await admin.firestore().collection('signupRequests').add({
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      department: department.trim(),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      score: result.score,
      requestId: signupRef.id,
      ...warningData,
    };
  }
);
```

### Step 3: Update Frontend to Handle Password Leak Warnings

**In `components/LoginForm.tsx`:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const recaptchaToken = await window.grecaptcha?.enterprise?.execute(
      import.meta.env.VITE_RECAPTCHA_SITE_KEY,
      { action: 'LOGIN' }
    );

    if (!recaptchaToken) {
      throw new Error('reCAPTCHA verification failed');
    }

    // Sign in with password leak check
    const result = await authService.signIn(
      credentials.email,
      credentials.password,
      recaptchaToken
    );

    // Check if password is leaked
    if (result.isPasswordLeaked) {
      setError(
        '⚠️ Warning: This password has been found in a data breach. ' +
        'Please change your password immediately for better security.'
      );
      // Still allow login but show warning
    }

    onLoginSuccess();
  } catch (err: any) {
    setError(err.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Enable Password Defense in GCP Console

1. Go to [Google Cloud Console > Security > reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha)
2. Select your key: `plv-ceit-classroom`
3. Click on **"Integration"** tab
4. Under **"Account Defender Assessment"**, enable:
   - ✅ **Password leak detection**
5. Click **"Save"**

### Step 5: Deploy Updated Functions

```bash
cd plv-classroom-assignment-functions
npm run build
firebase deploy --only functions:verifyLoginRecaptcha,functions:createSignupRequest
```

## Security Considerations

### ✅ Safe Implementation
- Password is sent over HTTPS only
- Password is hashed by Google (never stored)
- Leak check happens server-side
- Results are returned to user privately

### ⚠️ Important Notes
1. **Never log passwords** - Remove any console.log statements that might contain passwords
2. **Hash before storage** - Firebase Auth already handles this
3. **Warn, don't block** - Let users proceed but show warning for leaked passwords
4. **Privacy** - Google doesn't store the password, only checks hash against database

## Testing

### Test with Known Leaked Password
Use a common leaked password (e.g., "password123") to test the feature:

1. Try to sign up with email `test@plv.edu.ph` and password `password123`
2. Should see warning: "This password has been found in a data breach"
3. User can still proceed but is warned

### Test with Strong Password
Use a strong unique password:

1. Try to sign up with a password like `!Xk9#mP2$vL5@nQ8`
2. Should proceed without warning
3. Account created successfully

## Monitoring

After enabling password defense, you can monitor in GCP Console:

1. Go to **Security > reCAPTCHA Enterprise > Analytics**
2. View metrics:
   - Number of leaked password detections
   - Account defender assessments
   - Risk score distribution

## Cost Implications

Password leak verification is included in reCAPTCHA Enterprise pricing:
- **First 10,000 assessments/month**: Free
- **Additional assessments**: $1.00 per 1,000 assessments

For a small-to-medium deployment (PLV CEIT), this should stay within free tier.

## References

- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [Password Leak Detection](https://cloud.google.com/recaptcha-enterprise/docs/account-defender)
- [Best Practices Guide](https://cloud.google.com/recaptcha-enterprise/docs/best-practices)
