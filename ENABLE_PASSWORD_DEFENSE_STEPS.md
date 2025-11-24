# Enable Password Defense - Step-by-Step Guide

## Current Status
- ✅ Backend code implemented (verifyRecaptchaWithPassword function)
- ✅ Frontend sends passwords to backend
- ✅ reCAPTCHA Enterprise API enabled
- ✅ IAM permissions granted
- ❌ **Password Defense NOT enabled in reCAPTCHA key settings** ⬅️ THIS IS THE ISSUE

## Why You're Seeing Warnings

### "Backend" Orange Warning
The orange warning appears because:
- Your code is set up to use password defense
- But the feature is not enabled in the reCAPTCHA key configuration
- GCP Console detects this mismatch

### "No Assessments" Message
This appears because:
- Assessments ARE being created by your code
- But password defense assessments only count when the feature is enabled
- Once enabled, GCP will start tracking these assessments

## How to Fix (Manual Steps Required)

### Step 1: Navigate to reCAPTCHA Console
1. Go to: https://console.cloud.google.com/security/recaptcha?project=plv-classroom-assigment
2. You should see your key: **plv-ceit-classroom**
3. Click on the key name to open settings

### Step 2: Enable Password Defense
1. In the key settings page, find the **"Integration"** section
2. Click on the **"Backend"** tab (this is where you see the orange warning)
3. Click **"Set up"** or **"Configure"** next to "Account Defender Assessment"
4. Find the **"Password leak detection"** option
5. Toggle it to **ENABLED** (or check the box)
6. Click **"Save"** or **"Update"**

### Step 3: Verify Configuration
After saving:
1. The orange warning icon should turn to a green checkmark
2. The "Backend" status should show as "Configured"
3. "Password defense" should show as "Enabled"

### Step 4: Wait for Propagation
- Wait **10-15 minutes** for changes to propagate
- Your next login attempt will create a password defense assessment
- The "No assessments" warning will disappear after the first successful assessment

## Testing After Enabling

1. **Clear browser cache** or use incognito mode
2. Go to your login page
3. Enter credentials and submit
4. Check browser console (F12) - you should see:
   ```
   🛡️ Verifying reCAPTCHA token for login with password leak detection...
   ✅ reCAPTCHA verification successful
   ```
5. If password is leaked, you'll see a toast warning
6. Check GCP Console - "Backend" should now show green checkmark

## About the reCAPTCHA Badge

The small reCAPTCHA badge you see in the bottom-right corner is **CORRECT** behavior for reCAPTCHA Enterprise v3:

- ✅ **v3 = Invisible/Programmatic** - runs in background, no user interaction needed
- ✅ Small badge is required by Google for branding/privacy
- ❌ **v2 = Checkbox** - shows "I'm not a robot" checkbox (not what you want)

The badge appears when `grecaptcha.enterprise.execute()` is called, which happens:
- On login form submit
- On signup form submit

## Troubleshooting

### If badge doesn't appear at all:
1. Check browser console for errors
2. Verify `VITE_RECAPTCHA_SITE_KEY` is set in `.env`
3. Check that reCAPTCHA script loads successfully

### If assessments still don't appear:
1. Verify password defense is enabled (see Step 2 above)
2. Wait 15 minutes after enabling
3. Try logging in again
4. Check GCP Console > reCAPTCHA > Analytics

### If password leak detection doesn't work:
1. Ensure feature is enabled in GCP Console
2. Check Cloud Function logs for errors
3. Verify `verifyLoginRecaptcha` function deployed successfully

## Next Steps After Enabling

1. ✅ Enable password defense in GCP Console (steps above)
2. ⏱️ Wait 10-15 minutes
3. 🧪 Test login with a known compromised password (e.g., "password123")
4. 📊 Check GCP Console analytics for assessment data
5. 🚀 Deploy to production if everything works

## Summary

**The warning exists because the feature is implemented in code but not enabled in the UI.**

This is a **MANUAL configuration step** that cannot be automated via CLI/SDK. You must:
1. Go to GCP Console
2. Open reCAPTCHA key settings  
3. Enable "Password leak detection"
4. Save changes

After this, both warnings will disappear and password defense will be fully operational.
