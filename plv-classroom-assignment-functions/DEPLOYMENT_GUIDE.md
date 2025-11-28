# Cloud Functions Deployment Guide

## Overview
This directory contains Firebase Cloud Functions that provide backend functionality for the PLV Classroom Reservation System, including:

1. **Brute Force Protection** - Tracks failed login attempts and locks accounts
2. **User Account Management** - Admin-level user deletion capabilities

## Prerequisites

1. **Node.js 22** - Required by the Cloud Functions runtime
2. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase Blaze Plan** - Cloud Functions require a paid plan

## Setup Instructions

### 1. Login to Firebase
```bash
firebase login
```

### 2. Navigate to Functions Directory
```bash
cd "plv-classroom-assignment-functions"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build TypeScript
```bash
npm run build
```

### 5. Deploy Cloud Functions
```bash
npm run deploy
```

Or deploy from the root directory:
```bash
firebase deploy --only functions
```

## Available Cloud Functions

### Callable Functions (Triggered by Client)

#### 1. `trackFailedLogin`
**Purpose**: Tracks failed login attempts and locks accounts after 5 failed attempts

**Triggered**: Called by client after failed login
**Parameters**:
- `email` (string): Email address of the user attempting to login

**Returns**:
```typescript
{
  success: boolean;
  locked: boolean;
  attemptsRemaining: number;
  message?: string;
  lockedUntil?: string; // ISO timestamp
}
```

**Configuration**:
- Max Failed Attempts: 5
- Lockout Duration: 30 minutes

#### 2. `resetFailedLogins`
**Purpose**: Resets failed login attempts after successful authentication

**Triggered**: Called by client after successful login
**Authentication**: Required (user must be signed in)

**Returns**:
```typescript
{
  success: boolean;
  message: string;
}
```

#### 3. `deleteUserAccount`
**Purpose**: Admin function to completely delete user accounts

**Triggered**: Called by admin users
**Authentication**: Required (admin role only)
**Parameters**:
- `userId` (string): Firebase Auth UID of user to delete

#### 4. `acknowledgeNotification` / `acknowledgeNotifications`
**Purpose**: Mark notifications as read with server-side timestamps

**Authentication**: Required
**Parameters**:
- `notificationId` (string) or `notificationIds` (string[])

#### 5. `createNotification`
**Purpose**: Create notifications server-side (admin only)

**Authentication**: Required (admin role only)

### Scheduled Functions (Automated)

#### 1. `expirePastPendingBookings`
**Purpose**: Automatically expire pending booking requests past their start time

**Schedule**: Runs hourly (`0 * * * *`)
**Timezone**: UTC
**Action**: Updates `status` to `expired` for pending bookings whose date/time has passed

#### 2. `autoReEnableDisabledClassrooms`
**Purpose**: Automatically re-enable classrooms after scheduled disable duration

**Schedule**: Runs hourly (`0 * * * *`)
**Timezone**: UTC
**Action**: Re-enables classrooms where `disabledUntil` timestamp has passed

#### 3. `cleanupAcknowledgedNotifications`
**Purpose**: Auto-delete acknowledged notifications older than 72 hours to reduce database clutter

**Schedule**: Runs daily at 2 AM UTC (`0 2 * * *`)
**Timezone**: UTC
**Action**: Deletes notifications where `acknowledgedAt` is older than 72 hours
**Backwards Compatible**: Works with all existing acknowledged notifications

## Testing

### Test Locally (Emulators)
```bash
firebase emulators:start --only functions
```

### View Logs
```bash
npm run logs
# or
firebase functions:log
```

### Test Specific Function
```bash
firebase functions:shell
```

Then in the shell:
```javascript
trackFailedLogin({email: "test@plv.edu.ph"})
resetFailedLogins()
```

## Security Rules

The Cloud Functions run with admin privileges, bypassing Firestore security rules. This allows them to:
- Track failed attempts before user authentication
- Update user records without authentication
- Perform admin-level operations

## Monitoring

Monitor function execution in:
1. **Firebase Console** → Functions → Dashboard
2. **Firebase Console** → Functions → Logs
3. **Google Cloud Console** → Logging

## Cost Optimization

Functions are configured with:
- `maxInstances: 10` - Prevents runaway costs
- Node.js 22 - Latest efficient runtime
- Minimal cold start optimization

## Troubleshooting

### Function Not Deploying
```bash
# Check Firebase project
firebase use

# Re-authenticate
firebase login --reauth

# Clear and rebuild
rm -rf lib/
npm run build
npm run deploy
```

### Function Errors in Production
```bash
# View recent logs
npm run logs

# View specific function logs
firebase functions:log --only trackFailedLogin
```

### CORS Errors
Cloud Functions should automatically handle CORS. If issues persist:
1. Check Firebase Console → Functions → Configuration
2. Ensure client is using `httpsCallable` from Firebase SDK
3. Verify function is deployed to correct region

## Updating Functions

1. Edit code in `src/index.ts`
2. Build: `npm run build`
3. Deploy: `npm run deploy`
4. Monitor logs for any errors

## Best Practices

1. **Always test locally first** using emulators
2. **Monitor costs** in Firebase Console
3. **Check logs** after deployment
4. **Use semantic versioning** for major changes
5. **Keep dependencies updated** (security patches)

## Support

For issues:
1. Check Firebase Functions documentation
2. Review function logs
3. Verify security rules
4. Check Firebase Console quota limits
