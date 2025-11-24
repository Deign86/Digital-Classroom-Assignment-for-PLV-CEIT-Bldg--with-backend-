# reCAPTCHA Quick Reference Card

## 🚀 Quick Start

### Environment Setup
```bash
# Frontend (.env)
VITE_RECAPTCHA_SITE_KEY=6LeSZQEsAAAAAES7TrP74TbiEQciXqGWfIdjm0Cb

# Backend (functions environment)
RECAPTCHA_SECRET_KEY=<your-secret>
RECAPTCHA_SITE_KEY=6LeSZQEsAAAAAES7TrP74TbiEQciXqGWfIdjm0Cb
```

### Deploy
```bash
# Functions
cd plv-classroom-assignment-functions
npm run build
firebase deploy --only functions

# Frontend
npm run build
firebase deploy --only hosting
```

## 📋 Key Files

| File | Purpose |
|------|---------|
| `components/LoginForm.tsx` | Frontend reCAPTCHA token generation |
| `lib/firebaseService.ts` | authService.signIn() - verification integration |
| `plv-classroom-assignment-functions/src/recaptcha.ts` | Backend verification module |
| `plv-classroom-assignment-functions/src/index.ts` | verifyLoginRecaptcha callable |

## 🔐 How It Works

### Login Flow
```
User Click "Sign In"
  → Frontend generates reCAPTCHA token (action: 'LOGIN')
  → authService.signIn() calls verifyLoginRecaptcha({ email, token })
  → Backend verifies with Google API (threshold: 0.5)
  → If valid (score ≥ 0.5) → Firebase Auth
  → If invalid (score < 0.5) → Block login
```

### Signup Flow
```
User Click "Sign Up"
  → Frontend generates reCAPTCHA token (action: 'SIGNUP')
  → createSignupRequest({ ...userData, recaptchaToken })
  → Backend verifies with Google API (threshold: 0.7)
  → If valid → Create signup request
  → If invalid → Reject with error
```

## 🎯 Score Thresholds

| Action | Threshold | Meaning |
|--------|-----------|---------|
| LOGIN  | 0.5 | Balanced - blocks bots, allows humans |
| SIGNUP | 0.7 | Strict - prevents automated signups |

**Adjust in:** `plv-classroom-assignment-functions/src/recaptcha.ts`

## 🛠️ Debugging

### Frontend Console Logs
```
✅ "🛡️ Verifying reCAPTCHA token for login..."
✅ "✅ reCAPTCHA verification successful"
❌ "❌ reCAPTCHA verification failed"
⚠️ "⚠️ No reCAPTCHA token found - login attempt without verification"
```

### Backend Logs (Firebase Console → Functions)
```
✅ "reCAPTCHA verification successful for login: user@example.com"
❌ "reCAPTCHA verification failed for login attempt: user@example.com"
```

### Test reCAPTCHA in Browser Console
```javascript
// Generate token
const token = await window.grecaptcha.enterprise.execute('SITE_KEY', { action: 'TEST' });
console.log('Token:', token);

// Call verification function
const functions = getFunctions(app, 'us-central1');
const verifyRecaptcha = httpsCallable(functions, 'verifyRecaptcha');
const result = await verifyRecaptcha({ token, action: 'TEST' });
console.log('Result:', result.data);
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "reCAPTCHA script not loading" | Check CSP headers, allow www.google.com |
| "No reCAPTCHA token found" | Check recaptchaReady state, verify script loaded |
| "Invalid site key" | Verify VITE_RECAPTCHA_SITE_KEY, rebuild frontend |
| "All users failing verification" | Lower threshold (0.5 → 0.3), check metrics |
| "Secret key mismatch" | Run `firebase functions:config:get` |

## 📊 Monitoring

### Check Function Status
```bash
firebase functions:log --only verifyLoginRecaptcha --limit 50
```

### Google Cloud Console
1. Navigate to **Security** → **reCAPTCHA Enterprise**
2. Click on your site key
3. View **Metrics** tab for score distribution

## 🔄 Quick Fixes

### Temporarily Disable Enforcement
In `lib/firebaseService.ts`:
```typescript
// Comment out this section to disable enforcement
/*
if (!recaptchaToken) {
  throw new Error('reCAPTCHA verification required');
}
*/
```

### Lower Threshold
In `plv-classroom-assignment-functions/src/index.ts`:
```typescript
// Change 0.5 → 0.3 for more lenient verification
const isValid = await verifyRecaptchaToken(recaptchaToken, 'LOGIN', 0.3);
```

## 📚 Full Documentation

- **Architecture & Setup:** `RECAPTCHA_IMPLEMENTATION.md`
- **Deployment Guide:** `RECAPTCHA_DEPLOYMENT_CHECKLIST.md`
- **Overview:** `RECAPTCHA_IMPLEMENTATION_SUMMARY.md`

## ✅ Verification Checklist

- [ ] reCAPTCHA Enterprise enabled in Google Cloud
- [ ] Environment variables set (frontend + backend)
- [ ] Functions deployed successfully
- [ ] Frontend deployed successfully
- [ ] Login shows "🛡️ Verifying reCAPTCHA token..."
- [ ] Backend logs show "reCAPTCHA verification successful"
- [ ] Users can login successfully
- [ ] Invalid tokens are rejected

## 🆘 Emergency Rollback

```bash
git checkout <previous-commit>
npm run build
cd plv-classroom-assignment-functions
npm run build
firebase deploy --only functions,hosting
```

---

**Quick Help:** Check Firebase Console → Functions → Logs → Filter: "recaptcha"
