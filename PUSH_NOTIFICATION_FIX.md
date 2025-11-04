# Push Notification Fix - November 4, 2025

## Issue Identified
Push notifications were being enabled in the UI but no actual push notifications were being sent to users.

## Root Causes Found

### 1. Missing `pushEnabled` Check in Cloud Functions (FIXED)
The `persistAndSendNotification` Cloud Function was not checking if users had `pushEnabled: true` before sending FCM messages.

**Fix Applied:** Added check in `plv-classroom-assignment-functions/src/index.ts`:
```typescript
// Check if user has push notifications enabled before attempting to send
const userDoc = await db.collection('users').doc(userId).get();
const userData = userDoc.data() as any;
const pushEnabled = userData && userData.pushEnabled === true;

if (!pushEnabled) {
  logger.info(`persistAndSendNotification: skipping FCM send for user ${userId} - push notifications disabled`);
  return { success: true, id: ref.id } as any;
}
```

### 2. Client Not Calling `setPushEnabled` Cloud Function (FIXED)
The `ProfileSettings` component was directly updating Firestore via `userService.update()` instead of calling the `setPushEnabled` Cloud Function. This could fail due to security rules.

**Fix Applied:** Updated `components/ProfileSettings.tsx` to use the proper Cloud Function:
```typescript
// Call the Cloud Function to set pushEnabled flag server-side
const setPushRes = await pushService.setPushEnabledOnServer(enabled);
if (setPushRes.success) {
  setPushEnabled(enabled);
  // ... success handling
} else {
  throw new Error(setPushRes.message || 'Failed to update push preference');
}
```

## Why It Was "Working" in feature/push-notification-button-fix Branch
The push-notification-button-fix branch did NOT have the `pushEnabled` check in the Cloud Functions, so it was sending notifications to ALL users with registered tokens, regardless of their preference. This was actually a bug that made it appear to work.

## Deployment Status
✅ **ALL 25 Cloud Functions successfully deployed!**

The CPU quota errors during the initial deployment were transient. All functions, including those that initially showed errors, successfully deployed:

**Critical Push Notification Functions:**
- ✅ `createNotification` (contains pushEnabled check fix)
- ✅ `registerPushToken`
- ✅ `unregisterPushToken`
- ✅ `setPushEnabled` 
- ✅ `sendTestPush`

**Security & Auth Functions:**
- ✅ `trackFailedLogin`
- ✅ `resetFailedLogins`
- ✅ `checkLoginRateLimit`
- ✅ `checkBookingRateLimit`
- ✅ `checkAdminActionRateLimit`

**Notification & Admin Functions:**
- ✅ `acknowledgeNotification`
- ✅ `acknowledgeNotifications`
- ✅ `notifyAdminsOfNewRequest`
- ✅ `notifyAdminsOfNewSignup`
- ✅ `bookingRequestOnUpdateNotifyAdmins`

**User Management Functions:**
- ✅ `deleteUserAccount`
- ✅ `syncUserRoleClaims`
- ✅ `setUserCustomClaims`
- ✅ `changeUserRole`
- ✅ `refreshMyCustomClaims`
- ✅ `revokeUserTokens`

**Booking Functions:**
- ✅ `cancelBookingRequest`
- ✅ `cancelApprovedBooking`
- ✅ `deleteClassroomCascade`

**Scheduled Functions:**
- ✅ `expirePastPendingBookings` (runs hourly)

All functions are live and operational in Firebase Cloud Functions (us-central1).

## Expected Behavior Now
- ✅ **When pushEnabled = true**: Users receive browser push notifications via FCM
- ✅ **When pushEnabled = false**: Users only see in-app notifications (no push)
- ✅ **Notifications always created**: In-app notification documents are always created in Firestore
- ✅ **Security**: `pushEnabled` flag can only be set via Cloud Function, preventing client-side tampering

## Testing Instructions
1. Clear browser cache and reload the application
2. Log in as a user (faculty or admin)
3. Go to Settings tab
4. Toggle "Browser & Device Push" **ON**
5. Verify the success toast appears
6. Perform an action that triggers a notification:
   - **Faculty**: Create a booking request
   - **Admin**: Approve/reject a booking request
7. You should receive a browser push notification!

## Files Modified
1. `plv-classroom-assignment-functions/src/index.ts` - Added pushEnabled check in `persistAndSendNotification()` (line ~988)
2. `components/ProfileSettings.tsx` - Changed to use `setPushEnabledOnServer()` Cloud Function instead of direct Firestore update (line ~247)
3. `.github/copilot-instructions.md` - Updated documentation

## Architecture Notes

### Push Notification Flow
```
User toggles switch in ProfileSettings
    ↓
ProfileSettings.handleTogglePush()
    ↓
pushService.enablePush()
    ├─→ Gets FCM token from Firebase
    └─→ Calls registerPushToken Cloud Function
            └─→ Stores token in pushTokens collection
    ↓
pushService.setPushEnabledOnServer(true)
    └─→ Calls setPushEnabled Cloud Function
            └─→ Updates user.pushEnabled = true
    ↓
User document updated server-side
    ↓
When notification is created:
    ↓
persistAndSendNotification()
    ├─→ Creates notification document
    ├─→ Checks user.pushEnabled === true
    └─→ If true: queries pushTokens & sends FCM
```

### Security Considerations
- Client cannot directly write `pushEnabled` to user documents (prevented by Firestore rules)
- Only `setPushEnabled` Cloud Function can modify this field
- Ensures users can't spoof their push preference
- Tokens are stored separately in `pushTokens` collection

## Related Documentation
- See `BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md` for security context
- See `guidelines/FIREBASE_QUICK_REFERENCE.md` for notification service patterns
- See `plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md` for deployment instructions

## Troubleshooting

### If push notifications still don't work:
1. Check browser console for errors
2. Verify service worker is registered: `navigator.serviceWorker.controller`
3. Check Firestore:
   - User document has `pushEnabled: true`
   - `pushTokens` collection has token for the user
4. Check Cloud Function logs in Firebase Console
5. Verify VAPID key is set in environment: `VITE_FIREBASE_VAPID_KEY`

### Common Issues:
- **"Permission denied"**: User needs to grant notification permission in browser
- **"Service worker not ready"**: Refresh page and wait a few seconds
- **No token registered**: Check if `registerPushToken` Cloud Function succeeded
- **pushEnabled = false**: Check if `setPushEnabled` Cloud Function was called
