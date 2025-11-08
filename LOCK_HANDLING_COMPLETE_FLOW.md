# Complete Account Lock Handling Flow

## Overview
This document describes the complete account lock handling system including **failed attempts locks** (Cloud Function) and **admin locks** (Firestore). Both lock types display different UI contexts in the modal.

---

## Lock Types

### 1. Failed Attempts Lock (Brute Force Protection)
- **Trigger**: 5 consecutive failed login attempts
- **Duration**: 30 minutes (auto-expires)
- **Handler**: Cloud Function `trackFailedLogin`
- **Fields**: `accountLocked: true`, `lockedUntil: timestamp`, `failedLoginAttempts: 5`
- **Modal Context**: Orange warning box with countdown timer
- **Reason**: `'failed_attempts'`

### 2. Admin Lock
- **Trigger**: Administrator manually locks account via User Management
- **Duration**: Permanent (until admin unlocks)
- **Handler**: Direct Firestore update by admin
- **Fields**: `accountLocked: true`, `lockedByAdmin: true`, `lockReason: string` (required)
- **Modal Context**: Red alert box with admin-provided reason, no expiration timer
- **Reason**: `'admin_lock'`
- **Admin Workflow**: Admin must provide a reason in a dialog before locking the account

### 3. Realtime Lock
- **Trigger**: Account locked while user is signed in
- **Duration**: Varies based on lock type
- **Handler**: Firestore realtime listener in App.tsx
- **Fields**: `accountLocked: true` (detected via snapshot listener)
- **Modal Context**: Amber info box, generic security message
- **Reason**: `'realtime_lock'`

---

## Authentication Flow

### Login Attempt Flow Diagram
```
User enters credentials
        ↓
Firebase Auth: signInWithEmailAndPassword()
        ↓
   ┌────────────────┐
   │  Auth Success? │
   └────────────────┘
          ↓
    YES ──┴── NO
     ↓         ↓
     │    Track Failed Attempt
     │         ↓
     │    Cloud Function: trackFailedLogin
     │         ↓
     │    ┌──────────────┐
     │    │ 5th attempt? │
     │    └──────────────┘
     │         ↓
     │    YES ──┴── NO
     │     ↓         ↓
     │   Lock      Increment
     │   30min     Counter
     │     ↓         ↓
     │   Set sessionStorage flags
     │   (failed_attempts)
     │     ↓
     │   Throw error with message
     │     ↓
     │   Show orange modal
     │
Fetch user record from Firestore
     ↓
Check user.status
     ↓
┌─────────────┐
│ approved?   │
└─────────────┘
     ↓
YES ──┴── NO (pending/rejected)
 ↓         ↓
 │    Sign out + show status error
 │
Check user.accountLocked && role !== 'admin'
 ↓
┌─────────────┐
│  Locked?    │
└─────────────┘
 ↓
YES ──┴── NO
 ↓         ↓
 │    Continue to success
 │
Check lock type:
 ↓
┌──────────────────┐
│ lockedByAdmin?   │
└──────────────────┘
 ↓
YES ──┴── NO
 ↓         ↓
 │    Check lockedUntil
 │         ↓
 │    ┌─────────────┐
 │    │ Has expiry? │
 │    └─────────────┘
 │         ↓
 │    YES ──┴── NO
 │     ↓         ↓
 │   Calculate   Generic
 │   remaining   lock msg
 │   time
 │     ↓
 │   Set sessionStorage
 │   (failed_attempts)
 │     ↓
 │   Throw error
 │     ↓
 │   Show orange modal
 │
Set sessionStorage (admin_lock)
 ↓
Throw error
 ↓
Show red modal
```

---

## Code Implementation

### 1. lib/firebaseService.ts - signIn Method

```typescript
async signIn(email: string, password: string): Promise<User | null> {
  try {
    // Step 1: Attempt Firebase Authentication
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;
    
    // Step 2: Fetch user record from Firestore
    const record = await ensureUserRecordFromAuth(firebaseUser);
    const user = toUser(firebaseUser.uid, record);

    // Step 3: Check account status (approved/pending/rejected)
    if (user.status !== 'approved') {
      await firebaseSignOut(auth);
      throw new AuthStatusError(user.status, 'Account not approved');
    }

    // Step 4: Check for admin lock (CRITICAL - prevents bypass)
    // Admin locks are NOT handled by trackFailedLogin Cloud Function
    if (user.accountLocked && user.role !== 'admin') {
      await firebaseSignOut(auth);
      
      let reason: 'failed_attempts' | 'admin_lock' = 'admin_lock';
      let msg = 'Your account has been disabled by an administrator.';

      if (user.lockedByAdmin) {
        // Permanent admin lock
        reason = 'admin_lock';
        msg = 'Your account has been disabled by an administrator. Please contact support for assistance.';
      } else if (user.lockedUntil) {
        // Time-bound lock (failed attempts)
        reason = 'failed_attempts';
        const lockedUntil = new Date(user.lockedUntil);
        const now = new Date();
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);

        if (minutesRemaining > 0) {
          msg = `Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
          sessionStorage.setItem('accountLockedUntil', lockedUntil.toISOString());
        } else {
          msg = 'Account lock has expired. Please try logging in again.';
        }
      }

      // Set sessionStorage flags for modal
      sessionStorage.setItem('accountLocked', 'true');
      sessionStorage.setItem('accountLockedMessage', msg);
      sessionStorage.setItem('accountLockReason', reason);

      throw new Error(msg);
    }

    // Step 5: Success! Reset failed login attempts
    const resetFailedLogins = httpsCallable(functions, 'resetFailedLogins');
    await resetFailedLogins();

    return user;

  } catch (error) {
    // Handle failed login attempts
    if (error?.code?.startsWith('auth/')) {
      // Call Cloud Function to track failed attempt
      const trackFailedLoginFn = httpsCallable(functions, 'trackFailedLogin');
      const result = await trackFailedLoginFn({ email });
      const data = result.data;

      // If locked, set sessionStorage and throw error
      if (data.locked && data.message) {
        sessionStorage.setItem('accountLocked', 'true');
        sessionStorage.setItem('accountLockedMessage', data.message);
        sessionStorage.setItem('accountLockReason', 'failed_attempts');
        if (data.lockedUntil) {
          sessionStorage.setItem('accountLockedUntil', data.lockedUntil);
        }
        throw new Error(data.message);
      }
    }

    throw new Error('Invalid credentials. Please check your email and password.');
  }
}
```

### 2. App.tsx - Realtime Listener

```typescript
useEffect(() => {
  if (!currentUser || !currentUser.id) return;

  const userRef = fsDoc(db, 'users', currentUser.id);
  const unsub = fsOnSnapshot(userRef, (snapshot) => {
    const data = snapshot.data();

    // Detect account lock while signed in
    if (data?.accountLocked && data?.role !== 'admin') {
      logger.log('🔒 Detected account lock for current user. Signing out.');
      
      authService.signOut().finally(() => {
        let reason: 'failed_attempts' | 'admin_lock' | 'realtime_lock' = 'realtime_lock';
        let msg = 'Your account has been locked for security reasons.';
        
        if (data?.lockedByAdmin) {
          reason = 'admin_lock';
          // Use the admin-provided lock reason if available
          msg = data?.lockReason || 'Your account has been disabled by an administrator.';
        } else if (data?.lockedUntil) {
          reason = 'failed_attempts';
          const lockedUntil = data.lockedUntil.toDate();
          const minutesRemaining = Math.ceil((lockedUntil - new Date()) / 60000);
          
          if (minutesRemaining > 0) {
            msg = `Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
          }
          
          sessionStorage.setItem('accountLockedUntil', lockedUntil.toISOString());
          setAccountLockedUntil(lockedUntil.toISOString());
        }
        
        sessionStorage.setItem('accountLocked', 'true');
        sessionStorage.setItem('accountLockedMessage', msg);
        sessionStorage.setItem('accountLockReason', reason);
        
        setAccountLockedMessage(msg);
        setAccountLockReason(reason);
        setShowAccountLockedDialog(true);
        
        setCurrentUser(null);
        realtimeService.cleanup();
      });
    }
  });

  return () => unsub();
}, [currentUser]);
```

### 3. AdminUserManagement.tsx - Lock Account Dialog

```tsx
// State for lock dialog
const [userToLock, setUserToLock] = useState<AppUser | null>(null);
const [lockReason, setLockReason] = useState('');

// Open lock dialog
const startLockAccount = (user: AppUser) => {
  setUserToLock(user);
  setLockReason('');
};

// Execute lock with reason
const doLockAccount = async () => {
  if (!userToLock || !onDisableUser) return;
  if (!lockReason.trim()) {
    toast.error('Please provide a reason for locking this account');
    return;
  }
  const userId = userToLock.id;
  setProcessingFor(userId, 'disable');
  try {
    await onDisableUser(userId, lockReason.trim());
    setUserToLock(null);
    setLockReason('');
  } catch (err: any) {
    console.error('Disable user error:', err);
  } finally {
    setProcessingFor(userId, null);
  }
};

// Lock button in table
<Button size="sm" variant="outline" onClick={() => startLockAccount(u)}>
  <Lock className="h-4 w-4 mr-2" /> Lock
</Button>

// Lock reason dialog
<Dialog open={!!userToLock} onOpenChange={(open) => { 
  if (!open) { setUserToLock(null); setLockReason(''); } 
}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Lock Account</DialogTitle>
    </DialogHeader>
    <div className="py-2 space-y-4">
      <p className="text-sm">
        You are about to lock the account for <strong>{userToLock?.name}</strong> ({userToLock?.email}).
      </p>
      <div className="space-y-2">
        <Label htmlFor="lockReason" className="text-sm font-medium">
          Reason for locking <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="lockReason"
          placeholder="e.g., Policy violation, Security concern, Requested by user, etc."
          value={lockReason}
          onChange={(e) => setLockReason(e.target.value)}
          className="rounded-md min-h-[100px]"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          This reason will be displayed to the user when they try to sign in. Be clear and professional.
        </p>
      </div>
      <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> This lock is permanent until you manually unlock the account. 
          The user will be immediately signed out if they are currently logged in.
        </p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="ghost" onClick={() => { setUserToLock(null); setLockReason(''); }}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={doLockAccount}>
        <Lock className="h-4 w-4 mr-2" /> Lock Account
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. lib/firebaseService.ts - Lock Account with Reason

```typescript
async lockAccountByAdmin(id: string, lockReason?: string): Promise<User> {
  const database = getDb();
  const userRef = doc(database, COLLECTIONS.USERS, id);

  // Check if user is an admin - NEVER lock admin accounts
  const checkSnapshot = await getDoc(userRef);
  if (!checkSnapshot.exists()) {
    throw new Error('User not found');
  }
  const userData = ensureUserData(checkSnapshot);
  if (userData.role === 'admin') {
    throw new Error('Cannot lock admin accounts');
  }

  await updateDoc(userRef, {
    accountLocked: true,
    lockedUntil: null,
    lockedByAdmin: true,
    lockReason: lockReason || 'Account locked by administrator',
    updatedAt: nowIso(),
  });

  // ... rest of function (revoke tokens, etc.)
}
```

### 5. App.tsx - Modal Component

```tsx
<AlertDialog open={showAccountLockedDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {accountLockReason === 'failed_attempts' && '🔒 Account Locked: Too Many Failed Login Attempts'}
        {accountLockReason === 'admin_lock' && '🔒 Account Locked by Administrator'}
        {accountLockReason === 'realtime_lock' && '🔒 Account Locked'}
      </AlertDialogTitle>
    </AlertDialogHeader>
    <AlertDialogDescription>
      {accountLockReason === 'failed_attempts' ? (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            Your account has been temporarily locked due to multiple failed login attempts.
          </p>
          {lockTimeRemaining && (
            <div className="text-sm font-medium text-orange-600 bg-orange-50 p-3 rounded-md border border-orange-200">
              <p className="font-semibold mb-1">⏱️ Time remaining: {lockTimeRemaining}</p>
            </div>
          )}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This is a security measure to protect your account.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Wait for the lockout period to expire</li>
              <li>Use "Forgot password?" if needed</li>
              <li>Contact administrator if you need immediate access</li>
            </ul>
          </div>
        </div>
      ) : accountLockReason === 'admin_lock' ? (
        <div className="space-y-3">
          {accountLockedMessage && (
            <div className="text-sm font-medium text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
              <p className="font-semibold mb-2">📋 Reason for lock:</p>
              <p className="text-foreground">{accountLockedMessage}</p>
            </div>
          )}
          {!accountLockedMessage && (
            <p className="font-medium text-foreground">
              Your account has been disabled by an administrator.
            </p>
          )}
          <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            <p>⚠️ This lock was manually applied and will not automatically expire.</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You will not be able to sign in until an administrator unlocks your account.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contact administrator for more information</li>
              <li>Request account unlock if this was done in error</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-medium text-foreground">
            Your account has been locked and you were signed out for security reasons.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This may be due to security policy changes or administrative action.</p>
            <p>Please contact your administrator for assistance.</p>
          </div>
        </div>
      )}
    </AlertDialogDescription>
  </AlertDialogContent>
</AlertDialog>
```

---

## Lock Context Visual Reference

### Failed Attempts Lock Modal (Orange)
```
┌─────────────────────────────────────────────┐
│ 🔒 Account Locked: Too Many Failed Login   │
│    Attempts                                 │
├─────────────────────────────────────────────┤
│ Your account has been temporarily locked    │
│ due to multiple failed login attempts.      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ⏱️ Time remaining: 29 minutes 45 seconds│ │ (ORANGE BOX)
│ │ Account locked due to too many failed   │ │
│ │ login attempts.                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ This is a security measure.                 │
│ What you can do:                            │
│ • Wait for the lockout period to expire     │
│ • Make sure you're using correct password   │
│ • Use "Forgot password?" if needed          │
│ • Contact administrator for immediate help  │
│                                             │
│        [Contact Admin]        [Dismiss]     │
└─────────────────────────────────────────────┘
```

### Admin Lock Modal (Red) - With Custom Reason
```
┌─────────────────────────────────────────────┐
│ 🔒 Account Locked by Administrator          │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Reason for lock:                     │ │ (RED BOX - PRIMARY)
│ │                                         │ │
│ │ Policy violation: Unauthorized access   │ │
│ │ attempt detected on January 15, 2025.   │ │
│ │ Please contact IT security department.  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠️ This lock was manually applied by an │ │ (RED BOX - SECONDARY)
│ │ administrator and will not automatically│ │
│ │ expire.                                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ You will not be able to sign in until an   │
│ administrator explicitly unlocks your       │
│ account.                                    │
│                                             │
│ What you should do:                         │
│ • Contact administrator for more info       │
│ • Request account unlock if error           │
│ • Follow administrator's instructions       │
│                                             │
│        [Contact Admin]        [Dismiss]     │
└─────────────────────────────────────────────┘
```

### Realtime Lock Modal (Amber)
```
┌─────────────────────────────────────────────┐
│ 🔒 Account Locked                           │
├─────────────────────────────────────────────┤
│ Your account has been locked and you were   │
│ signed out for security reasons.            │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Your account has been locked for        │ │ (AMBER BOX)
│ │ security reasons.                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ This may be due to:                         │
│ • Security policy changes                   │
│ • Suspicious activity detected              │
│ • Administrative action                     │
│                                             │
│ Please contact your administrator for       │
│ assistance and to regain access.            │
│                                             │
│        [Contact Admin]        [Dismiss]     │
└─────────────────────────────────────────────┘
```

---

## sessionStorage Flags

### Common Flags (All Lock Types)
- `accountLocked`: `'true'` - Indicates account is locked
- `accountLockedMessage`: String - Display message for user
- `accountLockReason`: `'failed_attempts' | 'admin_lock' | 'realtime_lock'`

### Failed Attempts Lock Only
- `accountLockedUntil`: ISO timestamp - For countdown timer

---

## Testing Checklist

### Failed Attempts Lock
- [ ] 5 consecutive failed login attempts triggers lock
- [ ] Modal shows orange warning box
- [ ] Countdown timer updates every second
- [ ] Lock expires after 30 minutes
- [ ] Successful login after expiration resets counter
- [ ] Error message shows from Cloud Function

### Admin Lock
- [ ] Admin can manually lock user account
- [ ] Lock dialog opens when clicking "Lock" button
- [ ] Lock reason textarea is required (validation)
- [ ] Lock reason is stored in Firestore `lockReason` field
- [ ] Modal shows red alert box with custom reason prominently displayed
- [ ] Lock reason displays in red box above warning
- [ ] No countdown timer displayed
- [ ] Lock persists until admin unlocks
- [ ] Correct password does NOT bypass lock
- [ ] Admin accounts cannot be locked
- [ ] Lock reason is visible in both login and realtime lock scenarios
- [ ] Maximum 500 characters for lock reason

### Realtime Lock
- [ ] User signed out immediately when locked
- [ ] Modal shows amber info box
- [ ] sessionStorage flags set correctly
- [ ] Works for both admin and failed attempts locks

### Edge Cases
- [ ] Expired lock (lockedUntil in past) shows "expired" message
- [ ] Network errors during Cloud Function call handled gracefully
- [ ] Admin role check prevents admin accounts from being locked
- [ ] Multiple rapid login attempts handled correctly
- [ ] Modal dismissal clears sessionStorage flags

---

## Security Notes

1. **Never lock admin accounts** - Always check `user.role !== 'admin'` before applying locks
2. **Two-phase check required** - Cloud Function for failed attempts, Firestore check for admin locks
3. **sessionStorage flags** - Used for cross-component state and modal display
4. **Sign out on lock detection** - Always sign out user when lock is detected
5. **Server-side enforcement** - Cloud Function prevents client-side bypass of failed attempts lock
6. **Firestore rules** - Prevent clients from setting `status: 'expired'` or creating notifications

---

## Related Files

- `lib/firebaseService.ts` - Auth logic and lock checks
- `App.tsx` - Modal component and realtime listener
- `plv-classroom-assignment-functions/src/index.ts` - Cloud Functions (trackFailedLogin, resetFailedLogins)
- `firestore.rules` - Security rules
- `BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md` - Failed attempts lock documentation

---

## Maintenance

When modifying lock handling:
1. Update all three lock type checks (failed_attempts, admin_lock, realtime_lock)
2. Ensure modal UI remains distinct for each context
3. Update sessionStorage flag handling
4. Test all three lock scenarios
5. Update this documentation
6. Verify Firestore rules still enforce server-side locks
