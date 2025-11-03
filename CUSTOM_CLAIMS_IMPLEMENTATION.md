# Custom Claims Implementation Guide

## Overview

This implementation adds Firebase Custom Claims support to properly manage admin permissions throughout the application. Custom claims are cryptographically signed claims stored in JWT tokens that allow efficient role-based access control.

## Why Custom Claims?

### Previous Issue
- **Problem**: Firestore security rules checked `request.auth.token.admin` but custom claims were never set
- **Impact**: Admin users couldn't access admin-only features like viewing all notifications or deleting notifications
- **Root Cause**: Admin role was only stored in Firestore (`users/{id}.role`), not in JWT tokens

### Solution Benefits
1. **🔒 More Secure**: Claims are cryptographically signed and can't be tampered with
2. **🚀 Better Performance**: No extra Firestore reads in security rules
3. **✅ Best Practice**: Follows Firebase's recommended approach for role-based access
4. **📈 Scalable**: Efficient for apps with complex permission systems

## Architecture

### Components Added

#### 1. Cloud Functions (`plv-classroom-assignment-functions/src/index.ts`)

##### `setUserCustomClaims`
- **Purpose**: Manually set custom claims for a user
- **Callable by**: Admin users only
- **Usage**: Force update claims if they get out of sync

```typescript
const result = await setUserCustomClaims({ userId: 'user123' });
```

##### `syncUserRoleClaims` (Firestore Trigger)
- **Purpose**: Automatically update custom claims when user role changes
- **Trigger**: On any write to `users/{userId}` document
- **Behavior**: 
  - Sets `admin: true` claim for admin users
  - Sets `role: 'admin'` or `role: 'faculty'` claim
  - Removes claims if user is deleted

##### `changeUserRole` (Callable)
- **Purpose**: Admin function to change a user's role
- **Callable by**: Admin users only
- **Features**:
  - Updates Firestore role field
  - Automatically triggers `syncUserRoleClaims`
  - Prevents self-demotion
  - Returns message about token refresh requirement

```typescript
const result = await changeUserRole({ 
  userId: 'user123', 
  newRole: 'admin' 
});
```

##### `refreshMyCustomClaims` (Callable)
- **Purpose**: Allow users to manually refresh their own claims
- **Callable by**: Any authenticated user
- **Usage**: After role changes, users can refresh without signing out

```typescript
const result = await refreshMyCustomClaims();
```

#### 2. Frontend Service (`lib/customClaimsService.ts`)

Provides convenient methods to interact with custom claims:

```typescript
// Force refresh current user's token
await customClaimsService.forceTokenRefresh();

// Get current user's claims
const claims = await customClaimsService.getCurrentUserClaims();
// { admin: true, role: 'admin' }

// Check if user is admin
const isAdmin = await customClaimsService.isCurrentUserAdmin();

// Admin: Change another user's role
await customClaimsService.changeUserRole('user123', 'admin');

// Check if claims are in sync with Firestore
const status = await customClaimsService.checkClaimsSyncStatus('admin');
// { inSync: true/false, tokenRole: '...', tokenAdmin: true/false }
```

#### 3. Token Refresh Component (`components/TokenRefreshNotification.tsx`)

React component that:
- Monitors if custom claims are out of sync with Firestore role
- Shows a warning banner when refresh is needed
- Provides "Sign Out & Sign In" button
- Provides "Try Refresh" button (attempts refresh without full sign out)

Usage in App.tsx:
```tsx
<TokenRefreshNotification 
  userRole={user.role} 
  onRoleChanged={() => {/* handle refresh */}}
/>
```

## Token Refresh Flow

### Why Token Refresh is Needed

Firebase JWT tokens are issued when users sign in and contain custom claims. When you update custom claims via `setCustomUserClaims()`, **existing tokens are not immediately updated**. Users need to get a new token for changes to take effect.

### Methods to Refresh

#### Option 1: Sign Out and Sign In (Recommended)
- **Most reliable**: Guarantees fresh token
- **User experience**: Requires re-authentication
- **When to use**: For critical permission changes (promoting to admin)

#### Option 2: Force Token Refresh
```typescript
await auth.currentUser.getIdToken(true); // true = force refresh
```
- **Faster**: No re-authentication needed
- **Limitation**: May take up to 1 hour for changes to propagate in some cases
- **When to use**: For non-critical updates or when user is already aware

#### Option 3: Backend-Triggered Refresh
```typescript
await customClaimsService.refreshMyCustomClaims();
```
- **Convenience**: One-click refresh from UI
- **Combines**: Backend claims update + force token refresh
- **When to use**: After role changes detected by frontend

## Security Rules

The Firestore security rules now correctly use custom claims:

```javascript
match /notifications/{notificationId} {
  // Read own notifications OR if user has admin custom claim
  allow read: if request.auth != null && (
    resource.data.userId == request.auth.uid || 
    request.auth.token.admin == true
  );

  // Only admins can delete
  allow delete: if request.auth != null && 
    request.auth.token.admin == true;
}
```

## Migration & Deployment

### Initial Setup

1. **Deploy Cloud Functions**:
```bash
cd plv-classroom-assignment-functions
npm install
npm run build
firebase deploy --only functions
```

2. **Set Claims for Existing Admins**:
```javascript
// Run this once for each existing admin user
const functions = getFunctions(app);
const setUserCustomClaims = httpsCallable(functions, 'setUserCustomClaims');

for (const adminUserId of existingAdminUserIds) {
  await setUserCustomClaims({ userId: adminUserId });
}
```

3. **Inform Users**: Admin users need to sign out and sign in again after initial deployment

### Testing

1. **Test Admin Access**:
   - Sign in as admin
   - Navigate to notifications
   - Should see all notifications (not just own)
   - Should be able to delete notifications

2. **Test Role Change**:
   - Admin promotes a faculty user to admin
   - Target user sees token refresh notification
   - After sign out/sign in, user has admin privileges

3. **Test Custom Claims Sync**:
```javascript
// In browser console
const auth = getAuth();
const tokenResult = await auth.currentUser.getIdTokenResult();
console.log('Custom claims:', tokenResult.claims);
// Should show: { admin: true, role: 'admin' } for admin users
```

## Troubleshooting

### Issue: "Missing or insufficient permissions" error persists

**Cause**: User's token hasn't been refreshed after claims update

**Solution**:
1. Check current claims: `await customClaimsService.getCurrentUserClaims()`
2. Force refresh: `await customClaimsService.forceTokenRefresh()`
3. If still fails: Sign out and sign in again

### Issue: Custom claims not updating automatically

**Cause**: Firestore trigger may not be deployed

**Solution**:
```bash
firebase deploy --only functions:syncUserRoleClaims
```

### Issue: Admin can't change other users' roles

**Cause**: Caller doesn't have admin custom claims

**Solution**:
1. Verify caller's role in Firestore: `users/{callerId}.role === 'admin'`
2. Sync claims: Call `setUserCustomClaims({ userId: callerId })`
3. Refresh caller's token

### Issue: Token refresh notification shows incorrectly

**Cause**: Race condition between Firestore update and claim sync

**Solution**:
- Wait 2-3 seconds after role change before checking sync status
- Component auto-rechecks every 30 seconds

## Best Practices

1. **Always use `changeUserRole` callable** instead of directly updating Firestore
   - Ensures claims stay in sync
   - Includes proper error handling
   - Prevents self-demotion

2. **Show token refresh UI** after role changes
   - Use `TokenRefreshNotification` component
   - Inform users why they need to refresh

3. **Don't rely on immediate claim updates**
   - Plan for 1-60 second delay
   - Show loading states during refresh

4. **Use claims for security rules only**
   - Still store role in Firestore for app logic
   - Claims are for permission checks
   - Firestore fields are for queries and display

5. **Monitor claim sync status**
   - Log when claims are set
   - Track token refresh events
   - Alert on sync failures

## References

- [Firebase Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [JWT Token Best Practices](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
