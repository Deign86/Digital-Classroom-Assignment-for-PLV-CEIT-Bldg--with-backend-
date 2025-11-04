# System Defense Q&A - Quick Reference

## Common Defense Questions & Answers

### 🔐 Security Questions

**Q: How do you prevent SQL injection attacks?**  
**A:** We use Firebase Firestore (NoSQL), which is not vulnerable to SQL injection. All queries use the Firebase SDK with parameterized queries. No raw SQL is executed. Additionally:
- Input sanitization removes special characters
- Firestore security rules validate data types
- All queries go through the Firebase SDK, not raw strings

**Q: What measures prevent Cross-Site Scripting (XSS)?**  
**A:** Multiple layers of XSS protection:
1. React automatically escapes all user input rendered to the DOM
2. Input sanitization removes dangerous patterns (`<script>`, `javascript:`, etc.)
3. No use of `dangerouslySetInnerHTML` except in one controlled chart component with static data
4. Content Security Policy headers can be added for extra protection
5. All text inputs validated and limited to safe character sets

**Q: How do you handle authentication and authorization?**  
**A:** Firebase Authentication with role-based access control:
- **Authentication:** Email/password via Firebase Auth with encrypted transmission
- **Authorization:** Custom claims (`admin: true`) stored in JWT tokens
- **Session Management:** 30-minute idle timeout with 5-minute warning
- **Brute Force Protection:** Account locks after 5 failed login attempts for 30 minutes
- **Role Enforcement:** Firestore security rules check `request.auth.token.admin` server-side

**Q: What if someone tries to brute force login?**  
**A:** Implemented comprehensive brute force protection:
1. **Tracking:** Cloud Function `trackFailedLogin` counts failed attempts per email
2. **Lock Mechanism:** After 5 failed attempts, account locks for 30 minutes
3. **Server-Side Storage:** Lock status stored in Firestore (`accountLocked`, `lockedUntil`)
4. **Admin Override:** Admins can manually lock/unlock accounts
5. **Auto-Unlock Prevention:** Admin-locked accounts require manual unlock (won't auto-expire)

**Q: How do you protect sensitive data?**  
**A:** Multi-layered data protection:
1. **Environment Variables:** API keys and secrets stored in `.env`, never committed
2. **Encryption in Transit:** All communication via HTTPS/TLS 1.2+
3. **Firebase Encryption:** Firestore encrypts data at rest automatically
4. **Password Hashing:** Firebase Auth uses bcrypt/scrypt (not stored plainly)
5. **Token Security:** FCM push tokens managed server-side only, clients can't create/modify
6. **Sanitized Logging:** Production logs redact tokens, passwords, API keys
7. **No Client Secrets:** All sensitive operations via Cloud Functions with Admin SDK

**Q: How do you prevent CSRF (Cross-Site Request Forgery)?**  
**A:** Firebase provides built-in CSRF protection:
- Every authenticated request includes Firebase Auth token in headers
- Tokens are HttpOnly and validated server-side
- Tokens expire after 1 hour and auto-refresh
- Cloud Functions verify `request.auth.uid` on every call
- No cookies used for authentication (token-based only)

**Q: What about password security?**  
**A:** Strong password requirements enforced:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Password sanitization removes hidden characters when pasting
- Firebase Auth handles hashing (bcrypt with salt)
- Password reset requires email verification (1-hour expiration)

---

### 🗄️ Database & Data Questions

**Q: Explain your database schema.**  
**A:** Firebase Firestore with 7 main collections:

1. **users** - User profiles and auth metadata
   - Fields: email, name, role, status, accountLocked, pushEnabled
   - Indexed on: emailLower, role, status

2. **classrooms** - Classroom inventory
   - Fields: name, capacity, equipment[], building, floor, isAvailable
   - Indexed on: name, isAvailable

3. **bookingRequests** - Room reservation requests
   - Fields: facultyId, classroomId, date, startTime, endTime, status, purpose
   - Indexed on: facultyId, date, status
   - States: pending → approved/rejected/expired

4. **schedules** - Confirmed bookings/classes
   - Fields: classroomId, facultyId, date, startTime, endTime, status
   - Indexed on: classroomId, date, status

5. **signupRequests** - New user registration requests
   - Fields: uid, email, name, department, status, requestDate
   - States: pending → approved/rejected

6. **signupHistory** - Audit trail for signup decisions
   - Fields: uid, email, status, adminFeedback, processedBy, resolvedAt
   - Immutable for audit compliance

7. **notifications** - Real-time user notifications
   - Fields: userId, type, message, acknowledgedBy, acknowledgedAt
   - Created server-side only via Cloud Functions

**Q: How do you prevent data conflicts (double booking)?**  
**A:** Multi-level conflict detection:
1. **Client-Side:** Real-time check before form submission
   - Query: `bookingRequests.where('classroomId', '==', X).where('date', '==', Y)`
   - Time overlap validation algorithm
2. **Server-Side:** Cloud Function verifies before approval
   - Same query with transaction to prevent race conditions
3. **Real-Time Listeners:** Updates from other users trigger re-validation
4. **Firestore Timestamps:** Server-generated timestamps prevent client spoofing
5. **Status Validation:** Security rules prevent direct status manipulation

**Q: How are Firestore security rules structured?**  
**A:** Role-based rules with custom claims verification:

```javascript
// Pattern: All require authentication + role checks
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;  // Users update own data only
}

match /bookingRequests/{requestId} {
  allow create, read: if request.auth != null;
  allow update: if request.auth != null 
                && request.resource.data.status != 'expired';  // Prevent client expiry
}

match /notifications/{notificationId} {
  allow create: if false;  // Only Cloud Functions can create
  allow read: if resource.data.userId == request.auth.uid 
              || request.auth.token.admin == true;
}
```

**Q: How do you handle data integrity?**  
**A:** Multiple safeguards:
1. **Server Timestamps:** All timestamps use `serverTimestamp()` (can't be spoofed)
2. **Validation Rules:** Firestore rules validate data types and required fields
3. **Audit Trails:** Track `createdAt`, `updatedAt`, `updatedBy`, `processedBy`
4. **Immutable History:** `signupHistory` collection never updated/deleted
5. **Status Transitions:** Valid state machine (pending → approved/rejected only)
6. **Type Safety:** TypeScript interfaces enforce schema on client

---

### 🏗️ Architecture Questions

**Q: Explain your system architecture.**  
**A:** Three-tier cloud architecture:

**1. Frontend (React + TypeScript)**
- SPA hosted on Vercel/Firebase Hosting
- Component-based UI with Radix UI primitives
- Real-time updates via Firestore listeners
- Client-side routing (no page reloads)

**2. Backend (Firebase)**
- **Authentication:** Firebase Auth (email/password)
- **Database:** Firestore (NoSQL, real-time)
- **Cloud Functions:** Server-side business logic
  - `trackFailedLogin`, `resetFailedLogins`
  - `deleteUserAccount`, `bulkCleanupRejectedAccounts`
  - `createNotification`, `acknowledgeNotification`
  - `registerPushToken`, `sendTestPush`
  - `expirePastPendingBookings` (scheduled hourly)
- **Cloud Messaging:** FCM for push notifications

**3. Deployment**
- Frontend: Vercel (automatic deployments from GitHub)
- Functions: Firebase Cloud Functions (Node.js runtime)
- Database: Firestore (multi-region)
- CDN: Firebase Hosting CDN for static assets

**Data Flow:**
```
User → React UI → Firebase SDK → Firestore/Auth
                      ↓
                Cloud Functions (validation, notifications)
                      ↓
                Firestore (persistence)
                      ↓
                Real-time listeners → UI updates
```

**Q: Why Firebase instead of traditional backend?**  
**A:** Firebase advantages for this project:
1. **Real-Time Updates:** Built-in listeners for instant UI updates
2. **Scalability:** Auto-scales with usage (no server management)
3. **Security:** Row-level security via Firestore rules
4. **Authentication:** Built-in auth with session management
5. **Hosting:** CDN-backed hosting included
6. **Cost:** Free tier sufficient for PLV CEIT scale
7. **Development Speed:** Faster than building REST API + database

**Q: How do you handle real-time updates?**  
**A:** Firestore real-time listeners:
```typescript
// Subscribe to changes
const unsubscribe = onSnapshot(
  query(collection(db, 'bookingRequests'), where('facultyId', '==', userId)),
  (snapshot) => {
    const requests = snapshot.docs.map(doc => doc.data());
    setBookingRequests(requests);  // Triggers React re-render
  }
);

// Role-based filtering
// Admin: receives all collections
// Faculty: receives filtered by facultyId
```

Benefits:
- No polling required (efficient)
- Instant updates across all connected clients
- Automatic reconnection on network loss
- Optimistic UI updates possible

**Q: What happens if the database goes down?**  
**A:** Firestore provides:
1. **99.95% SLA:** Multi-region redundancy
2. **Offline Support:** Local cache continues to work
3. **Automatic Retry:** SDK retries failed operations with exponential backoff
4. **Error Boundaries:** React catches and displays user-friendly errors
5. **Graceful Degradation:** UI shows cached data + "reconnecting" indicator

We also implemented:
- `withRetry` utility wraps network calls (3 attempts with backoff)
- Error boundary components catch fatal errors
- User notifications for connectivity issues

---

### 🎨 Frontend Questions

**Q: Why React instead of Vue/Angular?**  
**A:** React chosen for:
1. **Ecosystem:** Largest component library (Radix UI, Shadcn)
2. **Performance:** Virtual DOM optimizes re-renders
3. **TypeScript Support:** Excellent type safety
4. **Firebase Integration:** Official React hooks library
5. **Team Familiarity:** Industry standard, easier to find developers

**Q: How do you optimize performance?**  
**A:** Multiple strategies:
1. **Code Splitting:** Lazy load dashboards (`React.lazy()`)
   ```typescript
   const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
   ```
2. **Memoization:** `useMemo`, `useCallback` prevent unnecessary re-renders
3. **Debouncing:** Search inputs debounced (300ms delay)
4. **Virtual Scrolling:** Large lists use windowing (future enhancement)
5. **Image Optimization:** WebP/AVIF formats, lazy loading
6. **Bundle Optimization:** Vite tree-shaking, dynamic imports
7. **CDN Caching:** Static assets cached globally

**Q: How do you ensure accessibility?**  
**A:** WCAG 2.1 Level AA compliance:
1. **Semantic HTML:** Proper heading hierarchy, `<label>` for inputs
2. **ARIA Labels:** `aria-label` for icon buttons
3. **Keyboard Navigation:** All interactive elements focusable, tab order logical
4. **Screen Reader Support:** Announcer component for live regions
5. **Color Contrast:** 4.5:1 minimum ratio (tested with tools)
6. **Focus Indicators:** Visible focus rings on all interactive elements
7. **Error Messages:** Associated with form fields via `aria-describedby`

**Q: How do you handle errors?**  
**A:** Comprehensive error handling:
1. **Error Boundaries:** Catch React component errors
   ```tsx
   <ErrorBoundary fallback={<ErrorPage />}>
     <App />
   </ErrorBoundary>
   ```
2. **Try-Catch:** Wrap async operations
3. **User Notifications:** Toast messages for user-facing errors (Sonner library)
4. **Logging:** Console errors in dev, structured logs in production
5. **Graceful Degradation:** Show cached data if network fails
6. **Retry Logic:** Automatic retry for transient failures

---

### 🧪 Testing & Quality

**Q: What testing strategies do you use?**  
**A:** Multiple testing layers (if implemented):
1. **Unit Tests:** Jest for utility functions
2. **Component Tests:** React Testing Library
3. **E2E Tests:** Playwright for critical user flows
4. **Manual Testing:** QA checklist for each feature
5. **Security Testing:** `npm audit`, Firestore rules testing

**Q: How do you ensure code quality?**  
**A:** Development standards:
1. **TypeScript:** Strict mode enabled, all types explicit
2. **ESLint:** Catch common errors and enforce style
3. **Prettier:** Auto-format code consistently
4. **Git Hooks:** Pre-commit linting (if configured)
5. **Code Reviews:** Pull requests require review
6. **Documentation:** JSDoc comments on public APIs

---

### 🚀 Deployment Questions

**Q: How is the app deployed?**  
**A:** Automated CI/CD pipeline:

**Frontend:**
1. Push to GitHub → Vercel auto-deploys
2. Build: `npm run build` (Vite bundler)
3. Deploy: Vercel CDN (global)
4. Rollback: Instant via Vercel dashboard

**Backend:**
1. Functions: `firebase deploy --only functions`
2. Rules: `firebase deploy --only firestore:rules`
3. Indexes: `firebase deploy --only firestore:indexes`

**Environment Variables:**
- Dev: `.env` file (gitignored)
- Production: Vercel environment variables
- Functions: Firebase environment config

**Q: What's your deployment checklist?**  
**A:** Pre-deployment verification:
- [ ] All environment variables set
- [ ] Firestore rules deployed and tested
- [ ] Cloud Functions deployed
- [ ] Build completes without errors
- [ ] TypeScript type check passes
- [ ] Security rules tested with Firestore emulator
- [ ] Admin users have custom claims set
- [ ] Production logs sanitized (no sensitive data)
- [ ] Error boundaries tested
- [ ] Backup of current Firestore data

---

### 💡 Feature-Specific Questions

**Q: How does the booking system work?**  
**A:** End-to-end booking flow:

1. **Request Creation (Faculty):**
   - Select classroom, date, time, purpose
   - Client validates: past date, time overlap, business hours
   - Conflict check against existing bookings
   - Submit → creates `bookingRequest` with status: `pending`

2. **Admin Review:**
   - View all pending requests in dashboard
   - Check classroom availability
   - Approve → creates `schedule` entry OR Reject → adds feedback

3. **Notification:**
   - Cloud Function creates notification for faculty
   - Push notification sent if enabled (FCM)
   - Real-time listener updates faculty dashboard

4. **Expiration:**
   - Scheduled Cloud Function runs hourly
   - Marks past pending requests as `expired`
   - Prevents approval of outdated bookings

**Q: How does user registration work?**  
**A:** Multi-step approval process:

1. **Signup Request:**
   - User fills form: email, name, department, password
   - Client validates: email format, password strength
   - Creates Firebase Auth account (status: pending)
   - Creates `signupRequest` document

2. **Admin Approval:**
   - Admin views pending requests in dashboard
   - Verify email, department, legitimacy
   - Approve: updates user status to `approved` + creates history record
   - Reject: marks rejected + adds feedback + creates history record

3. **User Access:**
   - Approved users can log in immediately (already have auth account)
   - Rejected users see rejection message on login attempt
   - Rejected accounts can be bulk-cleaned by admin

**Q: What's your notification system?**  
**A:** Multi-channel notification architecture:

**1. In-App Notifications:**
- Stored in `notifications` collection
- Real-time listeners update notification bell badge
- User can acknowledge (mark as read)
- Types: booking approved/rejected, account status, etc.

**2. Push Notifications (Optional):**
- Uses Firebase Cloud Messaging (FCM)
- Service Worker handles background notifications
- User must opt-in via Profile Settings
- Tokens stored server-side only
- Supports iOS (Safari 16.4+) and Android

**3. Email Notifications (Future):**
- Password reset emails (Firebase built-in)
- Could add: booking confirmations, reminders

**Actor ID System:**
- `updatedBy` field tracks who made changes
- Prevents self-notifications (e.g., admin approving own request)
- Cloud Functions skip notification if `actorId == userId`

---

### 🔄 Edge Cases & Error Scenarios

**Q: What if two users book the same room at the same time?**  
**A:** Race condition prevented by:
1. Client-side conflict check before submission (99% of cases)
2. Server-side verification in Cloud Function approval
3. Firestore transactions for atomic operations
4. Real-time listeners notify of conflicts immediately
5. Last-check before final approval (double-check pattern)

**Q: What if a user's session expires mid-action?**  
**A:** Session timeout handling:
1. Warning shown at 25 minutes (5 min before timeout)
2. User can extend session by clicking "Stay Signed In"
3. If expired: auto-logout + redirect to login with message
4. Unsaved form data: browser may cache (not guaranteed)
5. Recommendation: Save drafts periodically (future enhancement)

**Q: What if Firebase goes down?**  
**A:** Resilience measures:
1. **Offline Support:** Firestore caches data locally, reads work offline
2. **Write Queue:** Writes queued and retried when connection restored
3. **Error Boundaries:** Graceful error display instead of crash
4. **Retry Logic:** Exponential backoff for failed operations
5. **Status Indicators:** Show "reconnecting" message to user
6. **Firebase SLA:** 99.95% uptime guarantee

**Q: What if someone deletes a classroom while it has bookings?**  
**A:** Cascade handling:
1. **Soft Delete:** Classrooms marked `isAvailable: false` instead of deletion
2. **Reference Integrity:** Bookings store `classroomName` (denormalized)
3. **Admin Warning:** Popup confirms deletion if classroom has future bookings
4. **History Preservation:** Past bookings retain classroom info even if deleted

---

## 🎯 Key Takeaways for Defense

**When Explaining Your System:**
1. ✅ Emphasize **layered security** (client + server validation)
2. ✅ Highlight **Firebase advantages** (real-time, scalability, security)
3. ✅ Demonstrate **error handling** (try-catch, boundaries, retries)
4. ✅ Show **audit trails** (who did what, when)
5. ✅ Explain **role-based access** (custom claims, security rules)

**Common Gotchas to Avoid:**
1. ❌ Don't say "React prevents XSS automatically" - explain HOW
2. ❌ Don't claim "100% secure" - acknowledge limitations
3. ❌ Don't just say "Firebase handles it" - explain implementation
4. ❌ Don't ignore error cases - explain recovery strategies

**Strong Closing Statements:**
- "Our system implements defense-in-depth with validation at every layer"
- "We follow OWASP security guidelines and Firebase best practices"
- "Every user action is audited for accountability and debugging"
- "The architecture scales to handle PLV CEIT's growth without infrastructure changes"

---

**Preparation Tips:**
1. 📝 Practice explaining security rules out loud
2. 🖥️ Demo the app live (prepare test data)
3. 📊 Prepare architecture diagram (draw on whiteboard)
4. 🔍 Review error scenarios you've handled
5. 📚 Read Firebase security documentation the night before

**Good Luck! 🎓**
