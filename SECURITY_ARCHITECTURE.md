# Security Architecture - Digital Classroom Assignment System

## Overview
This document outlines the security measures implemented in the PLV CEIT Digital Classroom Assignment System to protect against common web application vulnerabilities and ensure data integrity.

## Authentication & Authorization

### 1. Firebase Authentication
- **Provider:** Firebase Authentication with Email/Password
- **Session Management:** 30-minute idle timeout with 5-minute warning
- **Persistence:** Browser local storage (survives page refreshes)
- **Token Refresh:** Automatic token refresh every hour via Firebase SDK

### 2. Brute Force Protection
**Implementation:** Server-side tracking via Cloud Functions

```typescript
// Tracks failed login attempts per email address
// Lock mechanism:
- Maximum 5 failed attempts allowed
- Account locks for 30 minutes after 5th failed attempt
- Admins can manually lock/unlock accounts (lockedByAdmin flag)
- Auto-unlock disabled for admin-locked accounts
```

**Cloud Functions:**
- `trackFailedLogin` - Increments counter on auth failure
- `resetFailedLogins` - Resets counter on successful login

**Data Stored:**
- `failedLoginAttempts`: number
- `accountLocked`: boolean
- `lockedUntil`: ISO timestamp
- `lockedByAdmin`: boolean (prevents auto-unlock)

### 3. Role-Based Access Control (RBAC)
**Roles:** Admin, Faculty

**Implementation:**
- Custom claims stored in Firebase Auth tokens
- Firestore security rules validate `request.auth.token.admin`
- Client-side UI conditionally renders based on role
- Server-side Cloud Functions verify admin status

**Custom Claims Migration:**
- Admin users have `{ admin: true }` custom claim
- Claims checked on every authenticated request
- Token refresh required after claim changes

### 4. Session Timeout
**Configuration:**
- Idle timeout: 30 minutes (configurable)
- Warning: 5 minutes before timeout
- Activity detection: mouse, keyboard, scroll events

**Implementation:**
```typescript
// useIdleTimeout hook monitors user activity
// Shows SessionTimeoutWarning component at 25 minutes
// Auto-logs out at 30 minutes
// Sets sessionStorage flag to show timeout message
```

## Data Protection

### 1. Input Sanitization

**Password Sanitization:**
```typescript
// Removes from pasted passwords:
- Line breaks (\r, \n, \t)
- Zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
- Leading/trailing whitespace
```

**Text Input Sanitization:**
```typescript
// All user inputs:
- Trimmed of whitespace
- Length limited (email: 320, name: 100, purpose: 500)
- Validated against regex patterns
- Checked for suspicious content (<script>, javascript:, etc.)
```

**Email Validation:**
```typescript
// Case-insensitive matching
email.trim().toLowerCase()
// Stored as both 'email' and 'emailLower' in Firestore
```

### 2. XSS Protection
**Measures:**
- React's automatic HTML escaping
- No use of `dangerouslySetInnerHTML` except in chart.tsx (controlled)
- No `eval()` or dynamic code execution
- Content Security Policy headers (recommended)

### 3. Firestore Security Rules

**Key Principles:**
1. All operations require authentication (`request.auth != null`)
2. Role-based access via custom claims
3. Field-level validation
4. Prevent client-side status manipulation

**Example Rules:**

```javascript
// Users Collection
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId 
               && request.resource.data.role == resource.data.role; // Can't change own role
}

// Booking Requests
match /bookingRequests/{requestId} {
  allow create, read: if request.auth != null;
  allow update: if request.auth != null
                && !(request.resource.data.status == 'expired')  // Only server can expire
                && request.resource.data.updatedBy == request.auth.uid;
}

// Notifications
match /notifications/{notificationId} {
  allow create: if false;  // Only via Cloud Functions
  allow read: if resource.data.userId == request.auth.uid 
              || request.auth.token.admin == true;
  allow update: if resource.data.userId == request.auth.uid;  // Can only ack own
}
```

### 4. Push Token Security
**Implementation:**
- Tokens managed exclusively via Cloud Functions
- Client cannot create/update/delete tokens directly
- Stored in `pushTokens` collection with userId reference
- Tokens auto-cleaned on user deletion

## Network Security

### 1. HTTPS Enforcement
- All communication encrypted via HTTPS
- Firebase enforces TLS 1.2+
- No mixed content allowed

### 2. CORS Configuration
- Managed by Firebase Hosting
- Restricted to authorized domains only

### 3. Rate Limiting
**Implemented via:**
- Firebase Auth rate limiting (built-in)
- Cloud Functions timeout: 60s max execution
- Firestore quota limits

**Recommended Additions:**
- Password reset cooldown (60s client-side)
- Signup request throttling (via Firestore rules)

## Cloud Functions Security

### 1. Authentication Required
All callable functions verify authentication:
```typescript
if (!request.auth) {
  throw new HttpsError("unauthenticated", "User must be authenticated");
}
```

### 2. Admin Verification
Admin-only functions check custom claims:
```typescript
const callerDoc = await admin.firestore()
  .collection("users")
  .doc(request.auth.uid)
  .get();

if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
  throw new HttpsError("permission-denied", "Only admin users can perform this action");
}
```

### 3. Input Validation
All functions validate input parameters:
```typescript
if (!userId || typeof userId !== "string") {
  throw new HttpsError("invalid-argument", "userId is required and must be a string");
}
```

### 4. Error Handling
- Sensitive errors not exposed to client
- Detailed logging server-side only
- User-friendly error messages returned

## Data Integrity

### 1. Conflict Detection
**Booking Conflicts:**
- Client-side check before submission
- Server-side verification in Cloud Function
- Real-time listener updates prevent race conditions

**Implementation:**
```typescript
// Check for overlapping bookings:
const conflicts = await db.collection('bookingRequests')
  .where('classroomId', '==', classroomId)
  .where('date', '==', date)
  .where('status', 'in', ['pending', 'approved'])
  .get();

// Time overlap detection algorithm validates start/end times
```

### 2. Timestamp Validation
- All timestamps server-generated: `admin.firestore.FieldValue.serverTimestamp()`
- Client cannot spoof timestamps
- Used for audit trails and expiration logic

### 3. Status Transitions
**Booking Request States:**
- pending → approved/rejected/expired
- Client cannot set 'expired' status (server-only)
- Admin feedback required for rejection

**Schedule States:**
- confirmed → cancelled
- Cancellation requires admin approval
- Reason required for cancellation

## Monitoring & Logging

### 1. Production Logging
**Strategy:**
- Development: Full logging enabled
- Production: Errors and warnings only
- Sensitive data redacted automatically

**Implementation:**
```typescript
// logger.ts utility
- Sanitizes tokens, passwords, API keys before logging
- Only logs in dev mode unless force-enabled
- Maintains structured log format
```

### 2. Audit Trails
**Tracked:**
- User account changes (creation, deletion, role changes)
- Booking request lifecycle (created, approved, rejected, cancelled)
- Signup request processing
- Password resets
- Failed login attempts

**Stored Fields:**
- `createdAt`, `updatedAt` timestamps
- `updatedBy` actor ID (for notification filtering)
- `processedBy` admin ID (for signup approvals)
- `resolvedAt` timestamp (for completed actions)

## Compliance & Best Practices

### 1. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### 2. Data Retention
- Signup history retained for audit purposes
- Booking requests retained indefinitely
- Notifications deleted after acknowledgment (optional)

### 3. Environment Variables
**Required:**
- `VITE_FIREBASE_*` keys for client-side SDK
- `VITE_FIREBASE_VAPID_KEY` for push notifications
- Never committed to version control
- Different configs for dev/staging/production

### 4. Dependency Management
- Regular `npm audit` checks
- Dependencies updated quarterly
- Security patches applied immediately

## Known Limitations

1. **Client-Side Validation Only:**
   - Some validation only on client (should mirror server-side)
   - Recommendation: Add server-side validation in Cloud Functions

2. **No Rate Limiting on Signup:**
   - Firestore rule allows unrestricted signup request creation
   - Recommendation: Add honeypot field or reCAPTCHA

3. **Console Logging in Production:**
   - Some debug logs may leak info in browser console
   - Recommendation: Use logger utility throughout

4. **No CSP Headers:**
   - Content Security Policy not configured
   - Recommendation: Add via Vercel/Firebase hosting config

## Incident Response

### If Breach Detected:
1. **Immediate Actions:**
   - Disable affected user accounts
   - Rotate Firebase API keys
   - Review Firestore audit logs
   - Alert affected users

2. **Investigation:**
   - Check Firebase Auth logs
   - Review Cloud Function execution logs
   - Analyze Firestore access patterns

3. **Recovery:**
   - Patch vulnerability
   - Reset affected user passwords
   - Update security rules if needed
   - Document incident for future reference

## Security Checklist for Deployment

- [ ] All environment variables set correctly
- [ ] Firestore security rules deployed and tested
- [ ] Cloud Functions deployed with admin verification
- [ ] Custom claims set for all admin users
- [ ] Brute force protection enabled
- [ ] Session timeout configured
- [ ] Push notifications configured (optional)
- [ ] Debug logging disabled in production
- [ ] Error boundaries in place
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Regular backups scheduled (Firestore export)

---

**Last Updated:** [Date]  
**Reviewed By:** [Your Name]  
**Version:** 1.0
