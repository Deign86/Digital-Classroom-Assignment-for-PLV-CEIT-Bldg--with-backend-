# reCAPTCHA Implementation Guide

## Overview

This document describes the comprehensive reCAPTCHA Enterprise implementation for the Digital Classroom Assignment system. The implementation provides robust protection against automated attacks, bots, and brute force login attempts.

## Architecture

### Multi-Layer Security

The reCAPTCHA implementation uses a **defense-in-depth** approach with three security layers:

1. **Frontend reCAPTCHA Token Generation** - Invisible reCAPTCHA executes on every login and signup
2. **Backend Token Verification** - Cloud Functions verify tokens against Google's reCAPTCHA API
3. **Brute Force Protection** - Account lockout after failed attempts (enhanced by reCAPTCHA)

## Components

### 1. Frontend Components

#### LoginForm.tsx
**Purpose:** Generates reCAPTCHA tokens for login and signup actions

**Key Features:**
- Loads reCAPTCHA script on component mount (not lazy-loaded)
- Generates token with action `'LOGIN'` for login attempts
- Generates token with action `'SIGNUP'` for signup requests
- Stores token in `(window as any).__recaptchaToken` for backend verification
- Graceful degradation if reCAPTCHA fails to load

**Code Flow:**
```typescript
// 1. Load reCAPTCHA on mount
useEffect(() => {
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  
  script.onload = () => setRecaptchaReady(true);
}, []);

// 2. Generate token on login
const recaptchaToken = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { 
  action: 'LOGIN' 
});
(window as any).__recaptchaToken = recaptchaToken;

// 3. Call backend (which will verify the token)
const success = await onLogin(email, password);
```

### 2. Backend Functions

#### recaptcha.ts
**Purpose:** Core reCAPTCHA verification logic

**Exported Functions:**

1. **`verifyRecaptcha`** (Callable Function)
   - Public endpoint for testing reCAPTCHA verification
   - Takes `{ token, action }` and returns verification result
   - Used for debugging and health checks

2. **`createSignupRequest`** (Callable Function)
   - Creates signup requests with integrated reCAPTCHA verification
   - Verifies token with action `'SIGNUP'` before creating request
   - Prevents automated bot signups

3. **`verifyRecaptchaToken`** (Helper Function)
   - Internal helper for token verification
   - Configurable action and score threshold
   - Returns boolean: `true` if valid, `false` otherwise

**Verification Flow:**
```typescript
// 1. Get reCAPTCHA secret (from env or Secret Manager)
const secret = await getRecaptchaSecret();

// 2. Verify token with Google API
const response = await fetch('https://recaptchaenterprise.googleapis.com/v1/...', {
  method: 'POST',
  body: JSON.stringify({
    event: {
      token: token,
      expectedAction: action,
      siteKey: RECAPTCHA_SITE_KEY,
    }
  })
});

// 3. Check score threshold
const isValid = body.tokenProperties?.valid && 
                body.riskAnalysis?.score >= scoreThreshold;
```

#### index.ts - verifyLoginRecaptcha
**Purpose:** Dedicated Cloud Function for login verification

**Key Features:**
- Called before Firebase Authentication attempt
- Verifies token with action `'LOGIN'` and threshold `0.5`
- Throws `HttpsError` if verification fails
- Logs all verification attempts for audit

**Integration:**
```typescript
// In firebaseService.ts signIn()
const recaptchaToken = (window as any).__recaptchaToken;
const verifyLoginRecaptcha = httpsCallable(functions, 'verifyLoginRecaptcha');
await verifyLoginRecaptcha({ email, recaptchaToken });
```

### 3. Service Layer

#### lib/firebaseService.ts - authService.signIn()
**Purpose:** Orchestrates login flow with reCAPTCHA verification

**Updated Flow:**
```
1. Retrieve reCAPTCHA token from window.__recaptchaToken
2. Call verifyLoginRecaptcha Cloud Function
3. If verification fails → throw error (prevent login)
4. If verification succeeds → proceed with Firebase signInWithEmailAndPassword
5. Check account status (approved/pending/rejected)
6. Check account locks (admin lock / failed attempts)
7. Reset failed login counter on successful auth
8. Return authenticated user
```

**Error Handling:**
- reCAPTCHA failure: User-friendly message + prevents login
- Invalid credentials: Track failed attempt + increment counter
- Account locked: Show lock reason + duration
- Network errors: Retry with exponential backoff

## Configuration

### Environment Variables

**Frontend (.env):**
```bash
VITE_RECAPTCHA_SITE_KEY=6LeSZQEsAAAAAES7TrP74TbiEQciXqGWfIdjm0Cb
```

**Backend (plv-classroom-assignment-functions/.env):**
```bash
RECAPTCHA_SECRET_KEY=<your-secret-key>
RECAPTCHA_SITE_KEY=6LeSZQEsAAAAAES7TrP74TbiEQciXqGWfIdjm0Cb
```

### Firebase Console Setup

1. **Enable reCAPTCHA Enterprise:**
   - Go to Google Cloud Console
   - Navigate to "Security" → "reCAPTCHA Enterprise"
   - Create a new key (type: Website)
   - Domain: your-app-domain.com, localhost

2. **Configure Site Key:**
   - Copy the site key to `VITE_RECAPTCHA_SITE_KEY`
   - Copy the secret key to `RECAPTCHA_SECRET_KEY`

3. **Secret Manager (Optional but Recommended):**
   - Store secret in Secret Manager: `recaptcha-secret`
   - Grant Cloud Functions service account access
   - Remove `RECAPTCHA_SECRET_KEY` from .env

## Score Thresholds

reCAPTCHA Enterprise returns a risk score from `0.0` (very likely a bot) to `1.0` (very likely a human).

**Current Thresholds:**
- **Login:** 0.5 (balanced - blocks obvious bots, allows humans)
- **Signup:** 0.7 (strict - prevents automated account creation)

**Adjusting Thresholds:**
```typescript
// In recaptcha.ts createSignupRequest()
const isValid = await verifyRecaptchaToken(recaptchaToken, 'SIGNUP', 0.7); // ← Adjust here

// In index.ts verifyLoginRecaptcha()
const isValid = await verifyRecaptchaToken(recaptchaToken, 'LOGIN', 0.5); // ← Adjust here
```

**Recommended Values:**
- **0.3-0.4:** Very permissive (might allow some bots)
- **0.5-0.6:** Balanced (default for login)
- **0.7-0.8:** Strict (default for signup, account changes)
- **0.9+:** Very strict (might block some humans)

## Security Features

### 1. Token Reuse Prevention
- Tokens are deleted from `window.__recaptchaToken` after use
- Each login attempt requires a fresh token
- Prevents replay attacks

### 2. Action Validation
- Each token is tied to a specific action (`LOGIN`, `SIGNUP`)
- Backend verifies the action matches the expected value
- Prevents token misuse across different flows

### 3. Rate Limiting Enhancement
- reCAPTCHA verification happens **before** Firebase Auth
- Reduces load on Firebase Authentication service
- Prevents brute force at application layer (not just auth layer)

### 4. Graceful Degradation
- If reCAPTCHA script fails to load: log warning, allow login
- If token generation fails: log error, continue with login
- If backend verification fails: block login with clear error

**Production Recommendation:** Enforce reCAPTCHA by throwing error if token is missing:
```typescript
if (!recaptchaToken) {
  throw new Error('Security verification required. Please refresh and try again.');
}
```

## Deployment

### 1. Deploy Cloud Functions
```bash
cd plv-classroom-assignment-functions
npm run build
firebase deploy --only functions
```

**Deployed Functions:**
- `verifyLoginRecaptcha` - Login verification
- `verifyRecaptcha` - Testing endpoint
- `createSignupRequest` - Signup with reCAPTCHA

### 2. Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
# OR
vercel deploy --prod
```

### 3. Verify Deployment
1. Open browser DevTools console
2. Attempt login
3. Check for logs:
   - `🛡️ Verifying reCAPTCHA token for login...`
   - `✅ reCAPTCHA verification successful`
4. Check Firebase Functions logs:
   - `reCAPTCHA verification successful for login: user@example.com`

## Testing

### 1. Manual Testing

**Test Login with reCAPTCHA:**
```
1. Open app in browser
2. Open DevTools → Console
3. Enter valid credentials
4. Click "Sign In"
5. Verify console shows: "✅ reCAPTCHA verification successful"
6. Verify successful login
```

**Test Failed Verification:**
```
1. Open DevTools → Console
2. Run: delete (window as any).__recaptchaToken;
3. Try to login
4. Verify error: "No reCAPTCHA token found"
```

### 2. Cloud Function Testing

**Test verifyRecaptcha callable:**
```typescript
const functions = getFunctions(app, 'us-central1');
const verifyRecaptcha = httpsCallable(functions, 'verifyRecaptcha');

// Generate token in browser console
const token = await window.grecaptcha.enterprise.execute('SITE_KEY', { action: 'TEST' });

// Call function
const result = await verifyRecaptcha({ token, action: 'TEST' });
console.log(result.data); // { success: true, score: 0.9, ... }
```

### 3. Monitoring

**Firebase Console:**
- Functions → Logs → Filter by `verifyLoginRecaptcha`
- Look for verification success/failure logs
- Monitor error rates

**Google Cloud Console:**
- reCAPTCHA Enterprise → Metrics
- View score distribution
- Identify suspicious patterns

## Troubleshooting

### Issue: "reCAPTCHA verification failed"

**Possible Causes:**
1. Invalid site key in environment variables
2. Domain not whitelisted in reCAPTCHA console
3. Secret key mismatch
4. Score below threshold

**Solutions:**
- Verify `VITE_RECAPTCHA_SITE_KEY` matches Google Console
- Add domain to reCAPTCHA allowed domains
- Check `RECAPTCHA_SECRET_KEY` in functions environment
- Lower threshold temporarily for testing

### Issue: "No reCAPTCHA token found"

**Possible Causes:**
1. Script failed to load (network error, CSP)
2. Token not generated (grecaptcha not ready)
3. Token deleted prematurely

**Solutions:**
- Check browser console for script errors
- Verify `recaptchaReady` state is `true`
- Check network tab for reCAPTCHA script load
- Disable ad blockers/privacy extensions

### Issue: "Account locked" even with valid credentials

**Not a reCAPTCHA Issue:**
- This is the brute force protection system
- Check Firestore `users` collection → `failedLoginAttempts`
- Admin can unlock via Admin Dashboard
- Auto-unlock after 30 minutes (if not admin-locked)

### Issue: High false positive rate (humans blocked)

**Solutions:**
- Lower score threshold (0.5 → 0.4 for login)
- Check for mobile/tablet users (lower scores)
- Review reCAPTCHA Enterprise metrics
- Consider challenge-based reCAPTCHA for borderline scores

## Best Practices

### 1. **Always Verify Backend**
- Never trust frontend-only reCAPTCHA
- Always call Cloud Function to verify token
- Log all verification attempts

### 2. **Use Appropriate Thresholds**
- Login: 0.5 (balance security and UX)
- Signup: 0.7 (stricter for new accounts)
- Admin actions: 0.8 (highest security)

### 3. **Monitor Metrics**
- Check score distribution weekly
- Adjust thresholds based on false positive rates
- Track bot attack patterns

### 4. **Secure Secrets**
- Use Secret Manager in production
- Rotate secrets periodically
- Never commit secrets to git

### 5. **Graceful Degradation**
- Log reCAPTCHA failures, don't crash app
- Provide clear user error messages
- Have fallback security measures (rate limiting)

## Future Enhancements

### 1. Challenge-Based reCAPTCHA
For borderline scores (0.4-0.6), show CAPTCHA challenge:
```typescript
if (score >= 0.4 && score < 0.6) {
  // Show checkbox or image challenge
  const challengeToken = await window.grecaptcha.enterprise.execute(SITE_KEY, {
    action: 'LOGIN',
    challenge: true
  });
}
```

### 2. Adaptive Thresholds
Adjust thresholds based on user behavior:
```typescript
// First-time users: strict (0.7)
// Returning users: relaxed (0.4)
// Trusted devices: very relaxed (0.3)
```

### 3. Analytics Integration
Track reCAPTCHA scores in analytics:
```typescript
analytics.logEvent('recaptcha_verification', {
  action: 'LOGIN',
  score: score,
  success: isValid
});
```

## References

- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Security Best Practices](https://firebase.google.com/docs/rules/rules-and-auth)

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review Google Cloud Console reCAPTCHA metrics
3. Consult this documentation
4. Contact project maintainer

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
**Status:** ✅ Production Ready
