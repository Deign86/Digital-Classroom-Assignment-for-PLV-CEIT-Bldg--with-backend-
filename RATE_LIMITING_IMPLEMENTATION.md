# Rate Limiting Implementation

## Overview
Implemented comprehensive rate limiting to protect against abuse and ensure fair resource usage across login attempts, booking requests, and admin actions.

## Deployed Functions

### ✅ 1. checkLoginRateLimit
**Status:** Successfully Deployed  
**Region:** us-central1  
**Purpose:** Prevent brute force login attempts

**Limits:**
- **10 attempts per IP per 15 minutes**
- Tracks by IP address
- Stores data in Firestore: `rateLimits/login_{ip}`

**Response Format:**
```typescript
{
  allowed: boolean,
  remaining: number,
  resetAt: number (timestamp),
  error?: string
}
```

**Usage:**
```typescript
// Call before login attempt
const rateLimitCheck = await checkLoginRateLimit();
if (!rateLimitCheck.allowed) {
  // Show error: "Too many login attempts. Please try again later."
  // Display resetAt time to user
}
```

---

### ✅ 2. checkBookingRateLimit
**Status:** Successfully Deployed  
**Region:** us-central1  
**Purpose:** Prevent spam booking requests

**Limits:**
- **5 booking requests per user per hour**
- Tracks by userId (authenticated users only)
- Stores data in Firestore: `rateLimits/booking_{userId}`

**Response Format:**
```typescript
{
  allowed: boolean,
  remaining: number,
  resetAt: number (timestamp),
  error?: string
}
```

**Usage:**
```typescript
// Call before creating booking request
const rateLimitCheck = await checkBookingRateLimit();
if (!rateLimitCheck.allowed) {
  // Show error: "Too many booking requests. Please try again later."
  // Display remaining attempts and resetAt time
}
```

**Error Handling:**
- Returns `unauthenticated` error if user not logged in
- Returns `internal` error for Firestore failures

---

### ⚠️ 3. checkAdminActionRateLimit
**Status:** Deployment Failed (CPU Quota Exceeded)  
**Region:** us-central1  
**Purpose:** Throttle admin actions to prevent accidental spam

**Limits:**
- **30 admin actions per user per minute**
- Tracks by userId (admin users only)
- Stores data in Firestore: `rateLimits/admin_{userId}`

**Response Format:**
```typescript
{
  allowed: boolean,
  remaining: number,
  resetAt: number (timestamp),
  error?: string
}
```

**Usage (when deployed):**
```typescript
// Call before bulk admin operations (approve/reject multiple requests)
const rateLimitCheck = await checkAdminActionRateLimit();
if (!rateLimitCheck.allowed) {
  // Show error: "Too many admin actions. Please slow down."
  // Wait until resetAt before continuing
}
```

**Error Handling:**
- Returns `unauthenticated` error if user not logged in
- Returns `permission-denied` error if user is not an admin
- Returns `internal` error for Firestore failures

**Deployment Issue:**
```
Could not create or update Cloud Run service checkadminactionratelimit
Quota exceeded for total allowable CPU per project per region.
```

**Resolution Required:**
1. Contact Firebase support to increase CPU quota
2. Delete unused/old function revisions to free up resources
3. Consider upgrading to Blaze plan with higher limits

---

## Technical Implementation

### Architecture
All rate limiting functions follow the same pattern:

1. **Window-Based Rate Limiting**
   - Uses fixed time windows (15 min, 1 hour, 1 min)
   - Resets automatically when window expires
   - Stores attempt count and reset time in Firestore

2. **Firestore Data Structure**
```typescript
rateLimits/{type}_{identifier} {
  attempts: number,
  resetTime: Timestamp,
  ip?: string,          // For login rate limits
  userId?: string,      // For user-specific limits
  type: string,         // 'login' | 'booking' | 'admin'
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

3. **Atomic Operations**
   - Uses `FieldValue.increment(1)` for atomic counter updates
   - Prevents race conditions with concurrent requests
   - Transaction-safe for high-traffic scenarios

### Security Considerations

1. **IP Tracking (Login)**
   - Reads IP from `request.rawRequest.ip`
   - Falls back to 'unknown' if IP not available
   - Uses type assertion `(request as any).rawRequest?.ip` due to CallableRequest type limitations

2. **Role Verification (Admin)**
   - Verifies admin role from Firestore `users` collection
   - Does NOT rely on custom claims (avoids token verification complexity)
   - Prevents privilege escalation attempts

3. **Authentication (Booking & Admin)**
   - Requires authenticated user via `request.auth`
   - Returns explicit error codes for troubleshooting
   - Validates user existence before rate limiting

### Error Handling

All functions use Firebase HttpsError with standard codes:
- `unauthenticated` - User must be logged in
- `permission-denied` - Insufficient permissions
- `internal` - Server-side errors (Firestore, etc.)

Error responses include descriptive messages for debugging.

---

## Firestore Security Rules

Add these rules to protect rate limiting data:

```javascript
// Rate limiting collection
match /rateLimits/{docId} {
  // Only Cloud Functions can write
  allow read: if request.auth != null;
  allow write: if false; // Cloud Functions use admin SDK
}
```

---

## Integration Guide

### Step 1: Frontend Integration (lib/firebaseService.ts)

Add callable function wrappers:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);

// Login rate limit
export const checkLoginRateLimit = httpsCallable(functions, 'checkLoginRateLimit');

// Booking rate limit
export const checkBookingRateLimit = httpsCallable(functions, 'checkBookingRateLimit');

// Admin rate limit (when deployed)
export const checkAdminActionRateLimit = httpsCallable(functions, 'checkAdminActionRateLimit');
```

### Step 2: Login Form Integration (LoginForm.tsx)

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    // Check rate limit BEFORE login attempt
    const rateLimitResult = await checkLoginRateLimit();
    const rateLimitData = rateLimitResult.data as {
      allowed: boolean;
      remaining: number;
      resetAt: number;
      error?: string;
    };

    if (!rateLimitData.allowed) {
      const resetTime = new Date(rateLimitData.resetAt).toLocaleTimeString();
      setError(`Too many login attempts. Please try again after ${resetTime}.`);
      return;
    }

    // Proceed with login...
    await signInWithEmailAndPassword(auth, email, password);
    
    // Success handling...
  } catch (error) {
    logger.error('Login error:', error);
    setError('Login failed. Please try again.');
  }
};
```

### Step 3: Booking Form Integration (RoomBooking.tsx)

```typescript
const handleBookingSubmit = async (formData: BookingFormData) => {
  try {
    // Check rate limit BEFORE creating booking
    const rateLimitResult = await checkBookingRateLimit();
    const rateLimitData = rateLimitResult.data as {
      allowed: boolean;
      remaining: number;
      resetAt: number;
      error?: string;
    };

    if (!rateLimitData.allowed) {
      const resetTime = new Date(rateLimitData.resetAt).toLocaleTimeString();
      toast.error(`Too many booking requests. Please try again after ${resetTime}.`);
      return;
    }

    // Show remaining attempts
    if (rateLimitData.remaining <= 2) {
      toast.warning(`${rateLimitData.remaining} booking requests remaining this hour.`);
    }

    // Proceed with booking creation...
    await bookingRequestService.create(formData);
    
    // Success handling...
  } catch (error) {
    logger.error('Booking error:', error);
    toast.error('Failed to create booking request.');
  }
};
```

### Step 4: Admin Actions Integration (RequestApproval.tsx)

```typescript
const handleBulkApproval = async (bookingIds: string[]) => {
  try {
    // Check rate limit BEFORE bulk operations
    const rateLimitResult = await checkAdminActionRateLimit();
    const rateLimitData = rateLimitResult.data as {
      allowed: boolean;
      remaining: number;
      resetAt: number;
      error?: string;
    };

    if (!rateLimitData.allowed) {
      const resetTime = new Date(rateLimitData.resetAt).toLocaleTimeString();
      toast.error(`Too many admin actions. Please wait until ${resetTime}.`);
      return;
    }

    // Process each booking with rate limit awareness
    for (const bookingId of bookingIds) {
      await bookingRequestService.approve(bookingId);
      
      // Optional: Delay between actions to stay under limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast.success(`Approved ${bookingIds.length} booking requests.`);
  } catch (error) {
    logger.error('Bulk approval error:', error);
    toast.error('Failed to approve booking requests.');
  }
};
```

---

## Testing Procedures

### Test 1: Login Rate Limit
1. Open login page in incognito window
2. Enter wrong password 10 times rapidly
3. **Expected:** 11th attempt should be blocked with error message
4. Wait 15 minutes
5. **Expected:** Should be able to attempt login again

### Test 2: Booking Rate Limit
1. Login as faculty user
2. Create 5 booking requests rapidly (any classroom, any time)
3. **Expected:** 6th booking should be blocked with error message
4. Check remaining attempts indicator
5. Wait 1 hour
6. **Expected:** Should be able to create booking again

### Test 3: Admin Rate Limit (When Deployed)
1. Login as admin user
2. Perform 30 rapid admin actions (approve/reject/delete)
3. **Expected:** 31st action should be blocked
4. Wait 1 minute
5. **Expected:** Should be able to perform admin actions again

### Test 4: Error Handling
1. Test unauthenticated access to booking/admin rate limits
2. **Expected:** Clear error message about authentication
3. Test non-admin user calling admin rate limit
4. **Expected:** Permission denied error

---

## Monitoring & Analytics

### Firestore Queries for Rate Limit Analysis

**Check active login rate limits:**
```javascript
db.collection('rateLimits')
  .where('type', '==', 'login')
  .where('resetTime', '>', new Date())
  .orderBy('resetTime', 'desc')
  .get();
```

**Check users hitting booking limits:**
```javascript
db.collection('rateLimits')
  .where('type', '==', 'booking')
  .where('attempts', '>=', 5)
  .get();
```

**Check admin rate limit hits:**
```javascript
db.collection('rateLimits')
  .where('type', '==', 'admin')
  .where('attempts', '>=', 25)
  .get();
```

### Cloud Functions Logs

Monitor rate limit hits in Firebase Console:
1. Go to Functions → Logs
2. Filter by function name: `checkLoginRateLimit`, `checkBookingRateLimit`, `checkAdminActionRateLimit`
3. Look for warning logs: "Rate limit exceeded"
4. Check IP addresses for patterns of abuse

---

## Deployment Summary

| Function | Status | Deployed At | Error |
|----------|--------|-------------|-------|
| checkLoginRateLimit | ✅ Success | 2025-01-XX | None |
| checkBookingRateLimit | ✅ Success | 2025-01-XX | None |
| checkAdminActionRateLimit | ❌ Failed | N/A | CPU quota exceeded |

**Total Functions Deployed:** 2 / 3 (66%)

**Firebase Project:** plv-classroom-assigment  
**Region:** us-central1  
**Node.js Version:** 20 (2nd Gen)

---

## Next Steps

1. **Immediate:** Test `checkLoginRateLimit` and `checkBookingRateLimit` in production
2. **Short-term:** Contact Firebase support to resolve CPU quota issue for `checkAdminActionRateLimit`
3. **Integration:** Add frontend calls to rate limit functions in components
4. **Monitoring:** Set up alerts for rate limit hits in Firebase Console
5. **Documentation:** Update `TESTING_GUIDE.md` with rate limiting test procedures
6. **Security:** Update `SECURITY_FIXES_COMPLETED.md` to reflect 12/13 completion (92%)

---

## Troubleshooting

### Issue: "CPU quota exceeded" during deployment
**Cause:** Cloud Run has regional CPU limits  
**Solution:**
- Delete old function revisions: Firebase Console → Functions → Select function → Versions → Delete old versions
- Request quota increase: Google Cloud Console → IAM & Admin → Quotas
- Upgrade to Blaze plan for higher limits

### Issue: Rate limit not triggering
**Cause:** Firestore data might not be persisting  
**Solution:**
- Check Firestore security rules allow reads
- Verify Cloud Functions have admin privileges
- Check function logs for errors

### Issue: Rate limit too strict/lenient
**Cause:** Hardcoded limits in Cloud Functions  
**Solution:**
- Modify limits in `plv-classroom-assignment-functions/src/index.ts`
- Redeploy functions with `firebase deploy --only functions`
- Consider making limits configurable via Firestore

---

## Code References

**Cloud Functions:** `plv-classroom-assignment-functions/src/index.ts` (lines 1691-1934)  
**Frontend Service:** `lib/firebaseService.ts` (to be integrated)  
**Login Component:** `components/LoginForm.tsx` (to be integrated)  
**Booking Component:** `components/RoomBooking.tsx` (to be integrated)  
**Admin Component:** `components/RequestApproval.tsx` (to be integrated)

---

## Related Documentation

- [BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md](./BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md) - Account locking after failed logins
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive testing procedures
- [SECURITY_FIXES_COMPLETED.md](./SECURITY_FIXES_COMPLETED.md) - Security audit completion status
- [FIREBASE_DEPLOYMENT_GUIDE.md](./FIREBASE_DEPLOYMENT_GUIDE.md) - General deployment instructions

---

**Last Updated:** January 2025  
**Author:** GitHub Copilot + Deign86  
**Status:** 2/3 functions deployed, 1 pending CPU quota resolution
