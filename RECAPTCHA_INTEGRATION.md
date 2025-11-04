# reCAPTCHA Enterprise Integration Guide

## Overview
reCAPTCHA Enterprise v3 has been integrated into the signup flow to protect against bot signups and abuse.

## What's Been Done

### Frontend Integration ✅
1. **index.html** - Added reCAPTCHA Enterprise script tag
2. **types/recaptcha.d.ts** - TypeScript definitions for reCAPTCHA API
3. **LoginForm.tsx** - Executes reCAPTCHA before signup submission
4. **App.tsx** - Passes reCAPTCHA token through signup flow
5. **lib/firebaseService.ts** - Stores token in Firestore signupRequests document

### How It Works
- When a user submits the signup form, reCAPTCHA automatically executes in the background
- No user interaction required (invisible reCAPTCHA v3)
- A token is generated and sent with the signup request
- The token is stored in the `signupRequests` document for backend verification

## Configuration Required

### 1. Get reCAPTCHA Enterprise Site Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: `plv-classroom-assigment`
3. Navigate to **Security > reCAPTCHA Enterprise**
4. Click **CREATE KEY**
5. Configure:
   - **Display name**: PLV CEIT Signup Protection
   - **Platform type**: Website
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - `plv-classroom-assigment.web.app` (Firebase Hosting)
     - `plv-classroom-assigment.firebaseapp.com`
     - Your custom domain if you have one
   - **reCAPTCHA type**: Score-based (v3)
   - **Challenge page**: Enable
6. Copy the **SITE KEY**

### 2. Add Environment Variable
Add to your `.env` file (or `.env.local` for local development):

```env
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
```

**Important**: Also add this to your deployment platform (Vercel, Firebase Hosting, etc.)

### 3. Backend Verification (Optional but Recommended)
For maximum security, verify the reCAPTCHA token on the backend:

#### Create Cloud Function
Create `plv-classroom-assignment-functions/src/verifyRecaptcha.ts`:

```typescript
import * as logger from "firebase-functions/logger";
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

const recaptchaClient = new RecaptchaEnterpriseServiceClient();

export async function verifyRecaptchaToken(
  token: string,
  action: string,
  minScore: number = 0.5
): Promise<{ valid: boolean; score?: number; reasons?: string[] }> {
  try {
    const projectPath = recaptchaClient.projectPath(process.env.GCLOUD_PROJECT || '');
    
    const [response] = await recaptchaClient.createAssessment({
      assessment: {
        event: {
          token: token,
          siteKey: process.env.RECAPTCHA_SITE_KEY,
          expectedAction: action,
        },
      },
      parent: projectPath,
    });

    if (!response.tokenProperties?.valid) {
      logger.warn('Invalid reCAPTCHA token', {
        reasons: response.tokenProperties?.invalidReason,
      });
      return { 
        valid: false, 
        reasons: [response.tokenProperties?.invalidReason || 'Unknown'] 
      };
    }

    const score = response.riskAnalysis?.score || 0;
    logger.info('reCAPTCHA assessment', { score, action });

    return {
      valid: score >= minScore,
      score,
      reasons: score < minScore ? ['Score too low'] : [],
    };
  } catch (error) {
    logger.error('reCAPTCHA verification failed', error);
    return { valid: false, reasons: ['Verification error'] };
  }
}
```

#### Update Signup Function
In your existing signup Cloud Function (or create one), add verification:

```typescript
import { verifyRecaptchaToken } from './verifyRecaptcha';

// In your signup handler:
export const verifySignupRequest = onCall(async (request) => {
  const { recaptchaToken, requestId } = request.data;
  
  if (!recaptchaToken) {
    throw new HttpsError('invalid-argument', 'reCAPTCHA token required');
  }

  // Verify the token
  const verification = await verifyRecaptchaToken(recaptchaToken, 'SIGNUP', 0.5);
  
  if (!verification.valid) {
    logger.warn('Signup blocked - low reCAPTCHA score', {
      requestId,
      score: verification.score,
      reasons: verification.reasons,
    });
    
    // Optionally: Delete the signup request or mark it as suspicious
    await admin.firestore()
      .collection('signupRequests')
      .doc(requestId)
      .update({
        recaptchaVerified: false,
        recaptchaScore: verification.score,
        status: 'rejected',
        adminFeedback: 'Signup blocked due to suspicious activity.',
      });
    
    throw new HttpsError('permission-denied', 'Signup blocked by security check');
  }

  // Token is valid, continue with signup approval
  logger.info('reCAPTCHA verification passed', {
    requestId,
    score: verification.score,
  });

  return { success: true, score: verification.score };
});
```

#### Install Dependencies
```bash
cd plv-classroom-assignment-functions
npm install @google-cloud/recaptcha-enterprise
```

### 4. Testing

#### Development Testing
- reCAPTCHA Enterprise works on localhost automatically
- Check browser console for "reCAPTCHA token obtained for signup" log
- Token will be undefined if `VITE_RECAPTCHA_SITE_KEY` is not set (graceful degradation)

#### Production Testing
1. Deploy with the site key configured
2. Complete a signup
3. Check Firestore `signupRequests` collection - should see `recaptchaToken` field
4. Go to [reCAPTCHA Enterprise Console](https://console.cloud.google.com/security/recaptcha) to view metrics

### 5. Monitoring
- View bot detection metrics in Google Cloud Console
- Adjust score threshold based on false positive/negative rates
- Recommended starting score: 0.5 (can be adjusted 0.0-1.0)

## Security Notes
- **Site Key**: Can be public (it's in frontend code)
- **API Key**: Keep secret (used for backend verification)
- **Score**: 1.0 = very likely human, 0.0 = very likely bot
- **Graceful Degradation**: If reCAPTCHA fails to load, signup still works (logs warning)

## Firestore Schema Update
The `signupRequests` collection now includes:
```typescript
{
  // ... existing fields
  recaptchaToken?: string; // Token from reCAPTCHA Enterprise (frontend)
  recaptchaVerified?: boolean; // Verification result (backend)
  recaptchaScore?: number; // Bot score 0.0-1.0 (backend)
}
```

## Next Steps
1. ✅ Get reCAPTCHA Enterprise site key from Google Cloud Console
2. ✅ Add `VITE_RECAPTCHA_SITE_KEY` to environment variables
3. ⏳ (Optional) Implement backend verification Cloud Function
4. ⏳ (Optional) Set up monitoring and alerting
5. ⏳ Test thoroughly before system defense

## Resources
- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [reCAPTCHA Enterprise Console](https://console.cloud.google.com/security/recaptcha)
- [Score Interpretation Guide](https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment)
