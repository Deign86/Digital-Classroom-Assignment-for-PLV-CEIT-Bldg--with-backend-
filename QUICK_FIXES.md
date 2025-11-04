# ⚡ Quick Fixes Guide - 1 Hour to Defense-Ready

This is your step-by-step guide to fix the **3 critical issues** before your defense.

---

## 🔴 CRITICAL FIX #1: Replace Console Logging (30 min)

### Option A: Use Logger Utility (Recommended)

**Step 1:** The logger utility is already created at `lib/logger.ts`

**Step 2:** Import it in files that need logging:

```typescript
// At top of file
import { logger } from '../lib/logger';  // Adjust path as needed
```

**Step 3:** Replace console calls:

```typescript
// ❌ BEFORE:
console.log('User logged in:', user);
console.debug('Token:', token);
console.info('Service initialized');

// ✅ AFTER:
logger.log('User logged in:', user);      // Only in dev, user sanitized
logger.debug('Token:', token);            // Only in dev, token redacted
logger.info('Service initialized');       // Only in dev

// Keep these as-is (errors/warnings always shown):
logger.error('Critical error:', error);   // Always shown
logger.warn('Deprecated feature used');   // Always shown
```

### Option B: Wrap in DEV Checks (Faster)

```typescript
// ❌ BEFORE:
console.log('[pushService] Obtained FCM token:', token);

// ✅ AFTER:
if (import.meta.env.DEV) {
  console.log('[pushService] Obtained FCM token:', token);
}
```

### Files to Update (Priority Order):

1. **lib/pushService.ts** (Lines 21, 26, 36, 43, 48, 73, 85, 93, 100, 107, 118, 121)
   - 12 console.log/warn calls
   - Most expose sensitive token data
   - **Action:** Replace with `logger` or wrap in DEV check

2. **lib/firebaseService.ts** (Lines 210, 215, 232, 252, etc.)
   - ~20 console calls
   - Some expose user data
   - **Action:** Replace with `logger`

3. **App.tsx** (Lines 283, 364, 383, 395, etc.)
   - Debug logging with `DEBUG[lock]` prefix
   - Stores data in `window.__loginLockDebug`
   - **Action:** See Fix #2 below

4. **plv-classroom-assignment-functions/src/index.ts**
   - Server-side logs (less critical, but clean for consistency)
   - **Action:** Optional - use Firebase Functions logger

### Quick Find & Replace in VS Code:

1. Open Find & Replace: `Ctrl+Shift+H`
2. Enable regex: Click `.*` button
3. Find: `console\.(log|debug)\(`
4. Replace case-by-case with: `logger.$1(`
5. Review each replacement carefully!

---

## 🔴 CRITICAL FIX #2: Guard Debug Code (5 min)

### Location: `App.tsx` lines 361-401

**Current Code:**
```typescript
// Dev-only debug helpers: log to console and show a short toast so
// developers notice the account-lock dialog and can debug more easily
try {
  console.debug('DEBUG: accountLocked scheduled dialog for', email, 'message:', msg);
  toast(`${msg} (debug: lock dialog scheduled)`, { duration: 5000 });
} catch (e) {
  console.warn('Could not show debug toast for account lock:', e);
}

// ... more debug code with window.__loginLockDebug
```

**Fixed Code:**
```typescript
// Dev-only debug helpers (WRAPPED IN DEV CHECK)
if (import.meta.env.DEV) {
  try {
    console.debug('DEBUG: accountLocked scheduled dialog for', email, 'message:', msg);
    toast(`${msg} (debug: lock dialog scheduled)`, { duration: 5000 });
  } catch (e) {
    console.warn('Could not show debug toast for account lock:', e);
  }

  // Record a lightweight debug event and log timestamps (dev only)
  try {
    const ts = Date.now();
    console.debug(`DEBUG[lock] set sessionStorage at ${new Date(ts).toISOString()} for`, email, { msg });
  } catch (_) {}
  try {
    (window as any).__loginLockDebug = (window as any).__loginLockDebug || [];
    (window as any).__loginLockDebug.push({ event: 'sessionSet', ts: Date.now(), email, msg });
  } catch (_) {}
}
```

### Other Debug Code to Wrap:

**App.tsx lines 34-48:** (Window service exposure)
```typescript
// ✅ ALREADY GUARDED (no changes needed):
if (import.meta.env.DEV) {
  (window as any).authService = authService;
  (window as any).pushService = pushService;
}
```

**App.tsx lines 1403-1417:** (Expose services after init)
```typescript
// ✅ ALREADY GUARDED (no changes needed):
if (import.meta.env.DEV) {
  (window as any).classroomService = classroomService;
  // ... etc
}
```

---

## 🔴 CRITICAL FIX #3: Tighten Firestore Signup Rule (2 min)

### Location: `firestore.rules` line 70

**Current Code:**
```javascript
// Signup Requests collection
match /signupRequests/{requestId} {
  // Anyone can create a signup request.
  allow create: if true;  // ⚠️ TOO PERMISSIVE
  allow read, update, delete: if request.auth != null;
}
```

**Fixed Code:**
```javascript
// Signup Requests collection
match /signupRequests/{requestId} {
  // Anyone can create a signup request, but must provide valid email and name
  allow create: if request.resource.data.keys().hasAll(['email', 'name', 'department', 'uid'])
                && request.resource.data.email.matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')
                && request.resource.data.name.size() > 0
                && request.resource.data.name.size() <= 100
                && request.resource.data.department in ['Civil Engineering', 'Information Technology'];
  
  allow read, update, delete: if request.auth != null;
}
```

### Deploy Updated Rules:

```powershell
# In your project directory
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔ Deploy complete!
firestore: rules uploaded successfully
```

---

## 🟡 HIGH PRIORITY FIX #4: Password Reset Rate Limit (10 min)

### Location: `components/PasswordResetDialog.tsx`

**Add cooldown state and check:**

```typescript
// Add these state variables at top of component:
const [lastResetTime, setLastResetTime] = React.useState<number>(0);
const RESET_COOLDOWN_MS = 60000; // 1 minute

// Update handleReset function:
const handleReset = async () => {
  // Check cooldown
  const now = Date.now();
  const timeSinceLastReset = now - lastResetTime;
  
  if (timeSinceLastReset < RESET_COOLDOWN_MS) {
    const secondsRemaining = Math.ceil((RESET_COOLDOWN_MS - timeSinceLastReset) / 1000);
    toast.error(`Please wait ${secondsRemaining}s before requesting another reset`, {
      description: 'This prevents email spam abuse'
    });
    return;
  }

  // ... existing validation code ...

  try {
    // ... existing reset logic ...
    setLastResetTime(now);  // ✅ Record successful reset time
  } catch (error) {
    // ... existing error handling ...
  }
};
```

---

## 🟡 HIGH PRIORITY FIX #5: Restrict User Document Writes (10 min)

### Location: `firestore.rules` users section

**Current Code:**
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && (
    isOwner(userId) || 
    request.auth != null  // ⚠️ Redundant and overly permissive
  );
}
```

**Fixed Code:**
```javascript
match /users/{userId} {
  // Any authenticated user can read profiles (needed for app functionality)
  allow read: if request.auth != null;
  
  // Users can only update their own specific fields (can't change role/status)
  allow update: if request.auth.uid == userId 
               && request.resource.data.keys().hasOnly([
                 'name', 'department', 'photoURL', 'pushEnabled', 
                 'updatedAt', 'email', 'emailLower', 'role', 'status',
                 'createdAt', 'failedLoginAttempts', 'accountLocked', 
                 'lockedUntil', 'lockedByAdmin', 'lastSignInAt'
               ])
               && request.resource.data.role == resource.data.role  // Can't change own role
               && request.resource.data.status == resource.data.status  // Can't change own status
               && (!request.resource.data.keys().hasAny(['accountLocked', 'lockedByAdmin']) 
                   || request.resource.data.accountLocked == resource.data.accountLocked)  // Can't unlock self
               && request.resource.data.email == resource.data.email;  // Can't change email directly
  
  // Admins can update any user (via callable functions that use Admin SDK)
  // Regular create/delete operations go through Cloud Functions with Admin SDK (bypass rules)
}
```

**Deploy:**
```powershell
firebase deploy --only firestore:rules
```

---

## ✅ Verification Checklist

After making fixes, verify each one:

### Fix #1: Console Logging
- [ ] Run `npm run build` - no errors
- [ ] Check build output - no warnings about console
- [ ] Test in production mode: `npm run preview`
- [ ] Open browser console - no sensitive data visible

### Fix #2: Debug Code
- [ ] Search project for `__loginLockDebug` - should be wrapped in `if (import.meta.env.DEV)`
- [ ] Search for `console.debug('DEBUG` - should be wrapped
- [ ] Build and test - no debug toasts in production

### Fix #3: Firestore Rules
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Test signup: should still work with valid email
- [ ] Try to create signup with invalid email: should fail

### Fix #4: Password Reset
- [ ] Test reset flow: request reset
- [ ] Immediately request again: should show cooldown message
- [ ] Wait 60 seconds: should allow new request

### Fix #5: User Write Rules
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Log in as regular user
- [ ] Try to update profile: should work
- [ ] Open browser console, try: `userService.updateUser(userId, { role: 'admin' })` - should fail

---

## 🚀 Final Build & Deploy

### 1. Build for Production
```powershell
npm run build
```

**Check for:**
- ✅ No TypeScript errors
- ✅ No console.log warnings (if using Vite plugin)
- ✅ Build completes successfully

### 2. Test Production Build Locally
```powershell
npm run preview
```

**Navigate to:** `http://localhost:4173`

**Test:**
- Login flow
- Booking creation
- Admin approval
- Notifications
- **Check browser console** - should be clean (no sensitive data)

### 3. Deploy to Production
```powershell
# Deploy frontend (if using Vercel)
git add .
git commit -m "fix: production security improvements"
git push origin main

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions (if changed)
cd plv-classroom-assignment-functions
firebase deploy --only functions
```

---

## 🎯 Time Breakdown

| Fix | Time | Priority |
|-----|------|----------|
| #1: Console Logging | 30 min | Critical |
| #2: Debug Code | 5 min | Critical |
| #3: Firestore Signup Rule | 2 min | Critical |
| #4: Password Reset Rate Limit | 10 min | High |
| #5: User Write Rules | 10 min | High |
| **Build & Test** | 10 min | - |
| **TOTAL** | **67 min** | **~1 hour** |

---

## 🆘 Troubleshooting

### "Logger not found" error
**Solution:** Check import path - should be `'../lib/logger'` or `'./lib/logger'` depending on file location

### Firestore rules won't deploy
**Solution:** 
1. Check syntax: `firebase emulators:start --only firestore` to test locally
2. Ensure logged in: `firebase login`
3. Check project: `firebase use <project-id>`

### Build fails with TypeScript errors
**Solution:** 
1. Run `npm install` to ensure all deps installed
2. Check `tsconfig.json` - should have `"strict": true`
3. Fix type errors one by one

### Tests fail after changes
**Solution:**
1. Update test mocks to use logger instead of console
2. Mock `import.meta.env.DEV` in tests
3. Re-run tests: `npm test`

---

## 📞 Need Help?

1. **Check:** `AUDIT_SUMMARY.md` for overview
2. **Read:** `SECURITY_ARCHITECTURE.md` for detailed explanations
3. **Review:** `DEFENSE_QA.md` for Q&A prep

**You've got this! 🚀**

---

**Last Updated:** November 4, 2025  
**Estimated Completion:** 1 hour  
**Priority Level:** CRITICAL before defense
