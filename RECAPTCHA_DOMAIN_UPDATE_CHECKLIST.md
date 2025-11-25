# reCAPTCHA Domain Update Checklist

## Domain Change
**Old Domain:** `https://digital-classroom-assignment-for-plv.vercel.app`  
**New Domain:** `https://digital-classroom-reservation-for-plv.vercel.app`

## ✅ Code Changes Completed

The following files have been updated to support your new domain:

### Cloud Functions (TypeScript Source)
- ✅ `plv-classroom-assignment-functions/src/recaptcha.ts`
  - Updated `verifyRecaptcha` CORS
  - Updated `createSignupRequest` CORS
  
- ✅ `plv-classroom-assignment-functions/src/index.ts`
  - Updated `verifyLoginRecaptcha` CORS

### Cloud Functions (Compiled JavaScript)
- ✅ `plv-classroom-assignment-functions/lib/recaptcha.js`
- ✅ `plv-classroom-assignment-functions/lib/index.js`

### Configuration Files
- ✅ `speed-insights.config.js` - Updated default URL
- ✅ `.github/workflows/vercel-speed-insights.yml` - Updated TARGET_URL

## 🔧 Required Google Cloud Console Changes

### 1. Update reCAPTCHA Enterprise Site Key Configuration

**IMPORTANT:** You MUST update your reCAPTCHA Enterprise configuration to include the new domain.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Security** → **reCAPTCHA Enterprise**
3. Select your project
4. Click on your site key (the one matching `VITE_RECAPTCHA_SITE_KEY` in your `.env` file)
5. Click **EDIT**
6. Under **Domains**, add your new domain:
   ```
   digital-classroom-reservation-for-plv.vercel.app
   ```
7. Keep these existing domains:
   - `localhost` (for development)
   - `plv-classroom-assigment.web.app` (Firebase hosting)
   - `plv-classroom-assigment.firebaseapp.com` (Firebase hosting)
   - Any other Vercel preview domains if needed
8. Click **SAVE**

### 2. Verify Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Ensure `digital-classroom-reservation-for-plv.vercel.app` is in the list
5. If not, click **Add domain** and add it

## 📋 Deployment Steps

### 1. Rebuild Cloud Functions
```powershell
cd "plv-classroom-assignment-functions"
npm run build
```

### 2. Deploy Cloud Functions
```powershell
firebase deploy --only functions
```

### 3. Deploy to Vercel
The code changes are ready. Your next Vercel deployment will include the updated configurations.

## 🧪 Testing After Deployment

1. **Test reCAPTCHA on Signup:**
   - Navigate to `https://digital-classroom-reservation-for-plv.vercel.app`
   - Try to sign up with a PLV email
   - Check browser console for any CORS or reCAPTCHA errors

2. **Test reCAPTCHA on Login:**
   - Try to log in
   - Verify no CORS errors in console
   - reCAPTCHA badge should appear

3. **Check Cloud Function Logs:**
   ```powershell
   firebase functions:log
   ```
   Look for:
   - ✅ "reCAPTCHA verification successful"
   - ❌ Any CORS errors
   - ❌ Any "domain not authorized" errors

## ⚠️ Common Issues & Solutions

### Issue: "reCAPTCHA verification failed" or CORS errors
**Solution:** Make sure you updated the domain in Google Cloud Console reCAPTCHA Enterprise settings.

### Issue: "This site key is not enabled for the invisible captcha"
**Solution:** 
1. Check that you're using the correct site key in `.env`
2. Verify the site key type is "Score-based (v3)" or "Checkbox" in Google Cloud Console

### Issue: Domain not recognized
**Solution:** 
1. Clear browser cache
2. Verify domain spelling is exact
3. Check for trailing slashes in configuration

## 📝 Notes

- The regex `/\.vercel\.app$/` in CORS config allows all Vercel subdomains
- This means preview deployments will also work
- The specific domain is added for clarity and explicit whitelisting
- Source TypeScript files are the source of truth; JS files in `lib/` are compiled from them

## ✨ Next Steps

After completing the Google Cloud Console changes and deploying:

1. Test on your new domain
2. Monitor Cloud Function logs for any errors
3. Remove old domain from reCAPTCHA config if no longer needed
4. Update any documentation or bookmarks with the new URL
