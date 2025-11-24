# reCAPTCHA Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
- [ ] **Frontend:** `VITE_RECAPTCHA_SITE_KEY` set in `.env`
- [ ] **Backend:** `RECAPTCHA_SECRET_KEY` set in Cloud Functions environment
- [ ] **Backend:** `RECAPTCHA_SITE_KEY` set in Cloud Functions environment

### 2. Google Cloud Console
- [ ] reCAPTCHA Enterprise API enabled
- [ ] Site key created (type: Website)
- [ ] Production domain whitelisted in reCAPTCHA console
- [ ] `localhost` whitelisted for development
- [ ] (Optional) Secret stored in Secret Manager as `recaptcha-secret`

### 3. Firebase Project
- [ ] Cloud Functions billing enabled (Blaze plan)
- [ ] Functions service account has reCAPTCHA API permissions
- [ ] Secret Manager API enabled (if using Secret Manager)

## Build & Test Locally

### 1. Build Cloud Functions
```bash
cd plv-classroom-assignment-functions
npm run build
```
Expected output: `✓ Compiled successfully`

### 2. Build Frontend
```bash
npm run build
```
Expected output: `✓ built in ~12s`

### 3. Test Locally (Optional)
```bash
# Start Firebase emulators
cd plv-classroom-assignment-functions
firebase emulators:start

# In another terminal, start frontend dev server
npm run dev
```

## Deployment Steps

### 1. Deploy Cloud Functions
```bash
cd plv-classroom-assignment-functions
firebase use plv-classroom-assigment  # or your project ID
firebase deploy --only functions
```

**Deployed Functions to Verify:**
- ✅ `verifyLoginRecaptcha(us-central1)`
- ✅ `verifyRecaptcha(us-central1)`
- ✅ `createSignupRequest(us-central1)` (updated with reCAPTCHA)

### 2. Deploy Frontend
Choose one:

**Option A: Firebase Hosting**
```bash
npm run build
firebase deploy --only hosting
```

**Option B: Vercel**
```bash
npm run build
vercel deploy --prod
```

### 3. Set Function Environment Variables (if not already set)
```bash
firebase functions:config:set \
  recaptcha.secret_key="YOUR_SECRET_KEY" \
  recaptcha.site_key="YOUR_SITE_KEY"

firebase deploy --only functions
```

## Post-Deployment Verification

### 1. Function Deployment Check
- [ ] Open Firebase Console → Functions
- [ ] Verify `verifyLoginRecaptcha` is deployed
- [ ] Check function status is "Healthy"
- [ ] No errors in function logs

### 2. Frontend Check
- [ ] Open production URL
- [ ] Open browser DevTools → Console
- [ ] Verify reCAPTCHA script loads (check Network tab)
- [ ] See `grecaptcha` object in console

### 3. Login Flow Test
- [ ] Navigate to login page
- [ ] Open DevTools Console
- [ ] Enter valid credentials
- [ ] Click "Sign In"
- [ ] Verify console logs:
  - `🛡️ Verifying reCAPTCHA token for login...`
  - `✅ reCAPTCHA verification successful`
- [ ] Successful login to dashboard

### 4. Signup Flow Test
- [ ] Navigate to signup tab
- [ ] Fill signup form
- [ ] Submit request
- [ ] Verify reCAPTCHA token generated
- [ ] Check Firebase Console → Functions → Logs
- [ ] Verify `createSignupRequest` called `verifyRecaptchaToken`
- [ ] Confirm signup request created in Firestore

### 5. Backend Verification Check
- [ ] Firebase Console → Functions → Logs
- [ ] Filter by `verifyLoginRecaptcha`
- [ ] Verify logs show:
  - `reCAPTCHA verification successful for login: user@example.com`
- [ ] No error logs

### 6. Error Handling Test
- [ ] Try login without reCAPTCHA token (delete `window.__recaptchaToken` in console)
- [ ] Verify error: "reCAPTCHA verification failed"
- [ ] Verify login blocked

## Monitoring Setup

### 1. Firebase Functions Logs
- [ ] Set up log alerts for reCAPTCHA failures
- [ ] Monitor error rates in Cloud Functions dashboard

### 2. Google Cloud Monitoring
- [ ] Navigate to reCAPTCHA Enterprise → Metrics
- [ ] Add monitoring dashboard
- [ ] Set up alerts for:
  - High bot traffic (score < 0.3)
  - Low verification rate
  - API quota exceeded

### 3. Analytics (Optional)
- [ ] Add custom events for reCAPTCHA scores
- [ ] Track verification success/failure rates
- [ ] Monitor user friction (abandoned logins)

## Rollback Plan

If issues arise after deployment:

### 1. Quick Fix: Disable reCAPTCHA Enforcement
In `lib/firebaseService.ts`, comment out the reCAPTCHA check:
```typescript
// Temporarily disable reCAPTCHA enforcement
// if (!recaptchaToken) {
//   throw new Error('reCAPTCHA verification required');
// }
```

### 2. Full Rollback
```bash
# Redeploy previous version
git checkout <previous-commit>
npm run build
firebase deploy --only functions,hosting
```

### 3. Emergency: Disable Cloud Function
```bash
# Disable the function in Firebase Console
# OR modify function to always return success
```

## Common Issues

### Issue: "reCAPTCHA script not loading"
**Solution:**
- Check Content Security Policy (CSP) headers
- Verify `www.google.com` and `www.gstatic.com` are allowed
- Check browser console for CSP violations

### Issue: "Invalid site key"
**Solution:**
- Verify `VITE_RECAPTCHA_SITE_KEY` matches Google Console
- Rebuild frontend after changing env vars
- Clear browser cache

### Issue: "Secret key mismatch"
**Solution:**
- Check Cloud Functions environment config
- Run: `firebase functions:config:get`
- Verify secret matches Google Console

### Issue: "All users failing verification"
**Solution:**
- Lower score threshold temporarily (0.5 → 0.3)
- Check reCAPTCHA Enterprise metrics for attack patterns
- Verify domain is whitelisted

## Success Criteria

- [x] ✅ Cloud Functions deployed without errors
- [x] ✅ Frontend builds and deploys successfully
- [x] ✅ reCAPTCHA script loads on login page
- [x] ✅ Login flow verifies reCAPTCHA tokens
- [x] ✅ Signup flow verifies reCAPTCHA tokens
- [x] ✅ Backend logs show successful verifications
- [x] ✅ Invalid tokens are rejected
- [x] ✅ No errors in production logs
- [x] ✅ Users can successfully login and signup

## Documentation

- [ ] Update project README with reCAPTCHA setup instructions
- [ ] Add reCAPTCHA section to onboarding docs
- [ ] Document environment variable requirements
- [ ] Create troubleshooting guide for common issues

## Handoff Notes

**For Team Members:**
- reCAPTCHA verification happens on **every login and signup**
- Tokens are verified **server-side** before authentication
- Score threshold: **0.5 for login, 0.7 for signup**
- Graceful degradation: If reCAPTCHA fails to load, users can still login (logged as warning)
- Production recommendation: Enforce reCAPTCHA (throw error if missing token)

**For Admins:**
- Monitor Google Cloud Console → reCAPTCHA Enterprise for metrics
- Review Firebase Functions logs for verification failures
- Adjust thresholds in `plv-classroom-assignment-functions/src/recaptcha.ts` if needed
- Check Secret Manager for secret rotation schedule

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Sign-off:** _____________
