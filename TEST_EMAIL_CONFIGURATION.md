# Test Email Configuration Guide

## Overview
The Digital Classroom Assignment System now supports whitelisting specific test email accounts that bypass the standard @plv.edu.ph domain requirement. This allows for testing and documentation without compromising security.

## Configuration

### Frontend (.env)
Add the following to your `.env` file:
```env
VITE_TEST_EMAILS=testfaculty21@gmail.com,other@test.com
```

Multiple emails can be added as a comma-separated list.

### Cloud Functions (plv-classroom-assignment-functions/.env)
Add the following to `plv-classroom-assignment-functions/.env`:
```env
TEST_EMAILS=testfaculty21@gmail.com,other@test.com
```

## Test Account
**Email:** testfaculty21@gmail.com  
**Password:** Testfaculty@123

This account is configured for:
- Testing signup/login flows
- Creating documentation screenshots
- Demonstrating system features

## Security Features

### Client-Side Validation
The `validatePLVEmail()` function in `utils/inputValidation.ts`:
- Checks if email ends with @plv.edu.ph
- Checks if email is in the VITE_TEST_EMAILS whitelist
- Returns validation error if neither condition is met

### Server-Side Validation
The `validatePLVEmail()` function in Cloud Functions (`recaptcha.ts`):
- Independently validates email domain
- Prevents bypassing client-side checks
- Uses TEST_EMAILS environment variable
- Logs test email usage for auditing

## How It Works

1. **User enters email during signup**
2. **Client-side validation** checks:
   - Is it @plv.edu.ph? → Allow
   - Is it in VITE_TEST_EMAILS? → Allow
   - Otherwise → Reject with error message
3. **Server-side validation** (Cloud Function) performs same checks
4. **Double validation** ensures security even if client is bypassed

## Deployment

After updating environment variables, deploy Cloud Functions:
```bash
cd plv-classroom-assignment-functions
firebase deploy --only functions:createSignupRequest
```

## Benefits

- ✅ Maintains strict @plv.edu.ph requirement for production
- ✅ Allows specific test accounts for documentation
- ✅ Server-side validation prevents bypass attempts
- ✅ Easy to add/remove test emails via environment variables
- ✅ No database modifications required
- ✅ Fully auditable (logs test email usage)

## Adding More Test Emails

Simply update both .env files:
```env
VITE_TEST_EMAILS=testfaculty21@gmail.com,demo@example.com,qa@test.org
```

Then redeploy Cloud Functions to apply changes server-side.
