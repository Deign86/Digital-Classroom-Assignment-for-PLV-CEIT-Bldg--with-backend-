# reCAPTCHA Enterprise Setup - Fix "Your key isn't requesting assessments"

## Issue

The Google Cloud Console shows a warning:
- ❌ **Backend: "Your key isn't requesting assessments"** (orange warning)
- This means the key is configured but not using the Enterprise API properly

## Root Cause

Your reCAPTCHA key `plv-ceit-classroom` exists, but:
1. The code is still using the old v3 API (`https://www.google.com/recaptcha/api/siteverify`)
2. It needs to use the Enterprise API (`RecaptchaEnterpriseServiceClient`)
3. The backend configuration needs to be updated

## Status

✅ **Already Deployed:**
- `@google-cloud/recaptcha-enterprise` SDK installed
- `verifyRecaptchaWithPassword()` function using Enterprise API
- `createSignupRequest` deployed with Enterprise API
- `verifyRecaptcha` deployed with Enterprise API

⚠️ **Needs Manual Configuration:**
- `verifyLoginRecaptcha` failed to deploy due to CPU quota (but code is ready)
- Need to enable Password Defense in GCP Console
- Frontend needs to send password parameter

## Quick Fix Steps

### Step 1: Enable reCAPTCHA Enterprise API

```bash
gcloud services enable recaptchaenterprise.googleapis.com --project=plv-classroom-assigment
```

### Step 2: Verify Key Configuration

Go to: https://console.cloud.google.com/security/recaptcha?project=plv-classroom-assigment

Your key should show:
- **Key ID**: `plv-ceit-classroom`
- **Type**: Website key
- **Platform**: reCAPTCHA Enterprise

### Step 3: Enable Password Leak Detection

1. Click on your key `plv-ceit-classroom`
2. Go to **Integration** tab
3. Under **Account Defender Assessment**, enable:
   - ✅ **Password leak detection**
4. Click **Save**

This will make the warning go away and turn the indicator green!

### Step 4: Test the Integration

The functions are now live and will:
1. Accept reCAPTCHA tokens from frontend
2. Create assessments using Enterprise API
3. Check passwords against leak database (if password provided)
4. Return leak status to frontend

## What Happens Now

When users login/signup:
- Frontend sends reCAPTCHA token + password to Cloud Function
- Backend calls `verifyRecaptchaWithPassword(token, action, password)`
- Enterprise API creates an assessment
- If password provided, checks against leaked password database
- Returns `{ verified: true, score: 0.9, isPasswordLeaked: false }`

## Monitoring

After setup, check in GCP Console:
https://console.cloud.google.com/security/recaptcha?project=plv-classroom-assigment

You should see:
- ✅ **Frontend**: Green checkmark (setup complete)
- ✅ **Backend**: Green checkmark (assessments being created)
- 📊 **Metrics**: Assessment count, risk scores, password leak detections

## Troubleshooting

### If backend stays orange after 24 hours:

Check if assessments are being created:
```bash
# View function logs
firebase functions:log --only verifyRecaptcha,createSignupRequest --project plv-classroom-assigment
```

Look for log entries like:
```
reCAPTCHA Enterprise verification complete { score: 0.9, isValid: true, action: 'LOGIN' }
```

### If you get permission errors:

Ensure the Cloud Functions service account has reCAPTCHA permissions:
```bash
gcloud projects add-iam-policy-binding plv-classroom-assigment \
  --member=serviceAccount:plv-classroom-assigment@appspot.gserviceaccount.com \
  --role=roles/recaptchaenterprise.agent
```

## Next Steps

1. Run the gcloud command to enable the API
2. Enable password leak detection in Console
3. Wait 10-15 minutes for the indicators to update
4. The backend indicator should turn green!

## Cost

- First 10,000 assessments/month: FREE
- Additional assessments: $1/1000
- Password leak verification: Included (no extra cost)

For PLV CEIT usage, this will stay within the free tier.
