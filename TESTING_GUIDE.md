# Testing Guide - Security Fixes Implementation

**Date:** November 4, 2025  
**Branch:** `feature/recaptcha-and-security-polish`  
**Status:** Ready for Testing

---

## 📋 Overview

This document outlines all new security features implemented and provides step-by-step testing procedures to verify nothing broke and everything works as expected.

---

## ✅ **IMPLEMENTED FEATURES**

### 🔴 CRITICAL FIXES

#### 1. ✅ Production Console Logging Removed
**What Changed:**
- Replaced 60+ `console.log/error/warn/debug` calls with production-safe logger
- Created `lib/logger.ts` utility that only outputs in development mode
- Automatic data sanitization to prevent sensitive info leakage

**Files Modified:**
- `lib/logger.ts` (NEW)
- `App.tsx`
- `lib/firebaseService.ts`
- `lib/pushService.ts`
- `lib/notificationService.ts`
- `lib/firebaseConfig.ts`
- `lib/errorLogger.ts`
- All component files

#### 2. ✅ reCAPTCHA Bot Protection for Signup
**What Changed:**
- Integrated Google reCAPTCHA Enterprise v3 (invisible, score-based)
- Added reCAPTCHA script to `index.html`
- Modified signup flow to execute reCAPTCHA before account creation
- Token stored in Firestore for optional server-side verification
- **reCAPTCHA badge auto-hides after successful login**

**Files Modified:**
- `index.html` - reCAPTCHA script
- `types/recaptcha.d.ts` (NEW) - TypeScript definitions
- `components/LoginForm.tsx` - reCAPTCHA execution
- `lib/firebaseService.ts` - Token acceptance
- `App.tsx` - Token parameter passing
- `styles/globals.css` - Badge hide CSS (already existed)
- `.env` - Site key configuration

---

### 🟡 HIGH PRIORITY FIXES

#### 3. ✅ Chart Component XSS Protection
**What Changed:**
- Added `sanitizeColor()` function to prevent XSS via color values
- Removes dangerous characters: `<>"'` ` 
- Validates CSS color format with regex

**Files Modified:**
- `components/ui/chart.tsx`

#### 4. ✅ Error Boundaries for Lazy Components
**What Changed:**
- Wrapped lazy-loaded dashboards in `<ErrorBoundary>`
- Prevents blank screen if components fail to load

**Files Modified:**
- `App.tsx`

---

### 🟠 MEDIUM PRIORITY FIXES

#### 5. ✅ Environment Variable Documentation
**What Changed:**
- Cleaned up `.env.example` file
- Removed duplicate entries
- Added clear sections and instructions

**Files Modified:**
- `.env.example`

#### 6. ✅ Input Validation Utilities
**What Changed:**
- Verified `utils/inputValidation.ts` exists and is comprehensive
- Contains validation for email, password, names, text length, etc.

**Files Modified:**
- `utils/inputValidation.ts` (already existed, verified)

---

### 🟡 HIGH PRIORITY FIXES (CONTINUED)

#### 7. ✅ Rate Limiting Cloud Functions
**What Changed:**
- Implemented 3 Cloud Functions for comprehensive rate limiting
- **ALL 3 FUNCTIONS SUCCESSFULLY DEPLOYED (100%)**

**Functions Deployed:**
1. **checkLoginRateLimit** - 10 attempts per IP per 15 minutes
2. **checkBookingRateLimit** - 5 requests per user per hour
3. **checkAdminActionRateLimit** - 30 actions per user per minute

**Features:**
- Window-based rate limiting with automatic reset
- Atomic Firestore operations to prevent race conditions
- Stores data in `rateLimits` collection
- Returns clear error messages with reset times
- IP-based tracking for login attempts
- User-based tracking for booking/admin actions

**Files Modified:**
- `plv-classroom-assignment-functions/src/index.ts` (+240 lines)

**Deployment Status:**
- ✅ All 3/3 functions deployed to production (`us-central1`)
- ✅ All functions operational and ready for testing

---

## 🧪 **TESTING PROCEDURES**

### **PRE-TEST SETUP**

1. **Build the project:**
   ```bash
   npm run build
   ```
   ✅ Expected: Build succeeds in ~13-15 seconds

2. **Start development server:**
   ```bash
   npm run dev
   ```
   ✅ Expected: Server starts on http://localhost:3001 (or 3000)

3. **Open browser DevTools:**
   - Press F12
   - Go to Console tab
   - Keep it open during all tests

---

### **TEST 1: Production Console Logging**

**Objective:** Verify no sensitive data appears in console in production

#### Steps:
1. Open browser DevTools → Console tab
2. Navigate through the application
3. Perform various actions (login, signup, booking, etc.)

#### ✅ Expected Results:
- **Development Mode:** 
  - Console shows logs with `[DEV]` prefix
  - Logs include context and data
  - Example: `[DEV] 🔄 Setting up real-time data listeners...`

- **Production Mode:** 
  - Console is mostly silent
  - No sensitive data (emails, passwords, tokens)
  - Only critical errors (if any) appear

#### ❌ Failure Indicators:
- User emails visible in console
- Password information visible
- Firebase tokens or API keys visible
- Database query details exposed

#### How to Test Production Mode:
```bash
npm run build
npm run preview
```
Then check console - should be mostly empty.

---

### **TEST 2: reCAPTCHA Bot Protection**

**Objective:** Verify reCAPTCHA protects signup and badge disappears after login

#### Part A: Signup with reCAPTCHA

**Steps:**
1. Open application homepage
2. Click "Faculty Request" tab
3. Look at bottom-right corner → reCAPTCHA badge should be visible
4. Fill out signup form:
   - First Name: Test
   - Last Name: User
   - Email: testuser@plv.edu.ph
   - Department: Information Technology
   - Password: Test@1234
   - Confirm Password: Test@1234
5. Click "Request Faculty Account"
6. Open DevTools Console → Look for "reCAPTCHA token obtained for signup"

#### ✅ Expected Results:
- reCAPTCHA badge appears at bottom-right (small, grey badge)
- Console shows: `reCAPTCHA token obtained for signup`
- Signup completes successfully
- Success toast: "Signup request submitted!"
- No permission denied errors

#### ❌ Failure Indicators:
- Error: "Security verification failed"
- Error: "Permission denied"
- reCAPTCHA badge doesn't appear
- Signup fails without clear error message

#### Part B: reCAPTCHA Badge Auto-Hide After Login

**Steps:**
1. Complete signup as admin (or use existing admin account)
2. **Before login:** Note that reCAPTCHA badge is visible at bottom-right
3. Login with admin credentials
4. **After login:** Check bottom-right corner

#### ✅ Expected Results:
- **Before login:** reCAPTCHA badge visible
- **After successful login:** Badge smoothly fades out and disappears
- Badge remains hidden while browsing dashboard
- Badge stays hidden even after page refresh (while logged in)

#### ❌ Failure Indicators:
- Badge still visible after login
- Badge reappears after navigating
- Badge doesn't fade smoothly
- Badge blocking UI elements

#### Technical Verification:
1. Open DevTools → Elements tab
2. Inspect `<body>` element
3. After login, verify `<body>` has class `authenticated`
4. Check `.grecaptcha-badge` element has CSS:
   ```css
   opacity: 0;
   visibility: hidden;
   pointer-events: none;
   ```

---

### **TEST 3: Signup Flow End-to-End**

**Objective:** Verify entire signup workflow still works with reCAPTCHA

#### Steps:
1. Open application
2. Go to "Faculty Request" tab
3. Fill valid signup form
4. Submit request
5. Check Firestore in Firebase Console

#### ✅ Expected Results:
- Signup form validates correctly
- reCAPTCHA executes invisibly
- Account created with status "pending"
- Document in `signupRequests` collection includes:
  - `email`
  - `name`
  - `department`
  - `uid`
  - `status: 'pending'`
  - `recaptchaToken` (string, ~1000 characters)
- User can see "Account pending approval" message

#### ❌ Failure Indicators:
- Form validation errors with valid data
- "Permission denied" error
- Missing `recaptchaToken` field in Firestore
- Signup completes but no Firestore document

---

### **TEST 4: Login and Dashboard Access**

**Objective:** Verify login flow unchanged and dashboards load correctly

#### Steps:
1. Login as **Admin** user
2. Verify admin dashboard loads
3. Navigate through all tabs:
   - Overview
   - Classrooms
   - Classroom Requests
   - Signups
   - Schedule
   - Reports
   - Users
   - Settings
4. Logout
5. Login as **Faculty** user
6. Verify faculty dashboard loads
7. Navigate through all tabs:
   - Room Booking
   - My Schedules
   - Room Search
   - Schedule Viewer
   - Profile Settings

#### ✅ Expected Results:
- Login succeeds without errors
- Dashboards render completely
- All tabs load without blank screens
- No console errors (in dev mode, only info logs)
- Navigation smooth between tabs
- Real-time data updates work
- Logout works correctly

#### ❌ Failure Indicators:
- Blank screen after login
- Dashboard tabs don't load
- Console errors about missing components
- "Suspense boundary" errors
- Data not loading

---

### **TEST 5: Lazy-Loaded Components with Error Boundaries**

**Objective:** Verify error boundaries catch component load failures

#### Steps (Requires Code Modification):
1. Temporarily break a lazy component import:
   ```typescript
   // In App.tsx, temporarily change:
   const AdminDashboard = React.lazy(() => import('./components/AdminDashboardBROKEN'));
   ```
2. Try to login as admin
3. Observe error handling

#### ✅ Expected Results:
- Error boundary catches the failure
- User sees error UI (not blank screen)
- Error message is helpful
- Can navigate back or reload

#### ❌ Failure Indicators:
- Blank white screen
- No error message
- Application completely frozen
- Must force-refresh browser

**NOTE:** Don't forget to revert the code change after testing!

---

### **TEST 6: Existing Features Still Work**

**Objective:** Verify no regressions in existing functionality

#### A. Booking Request Flow

**Steps:**
1. Login as Faculty
2. Go to "Room Booking" tab
3. Search for available classroom
4. Create booking request
5. Submit

#### ✅ Expected Results:
- Search works correctly
- Conflict detection works
- Request submits successfully
- Status shows "pending"

#### B. Admin Approval Flow

**Steps:**
1. Login as Admin
2. Go to "Classroom Requests" tab
3. View pending request
4. Approve or reject request

#### ✅ Expected Results:
- Requests visible
- Can filter by status
- Approval/rejection works
- Notifications sent

#### C. Real-time Updates

**Steps:**
1. Open two browser windows
2. Login as Admin in window 1
3. Login as Faculty in window 2
4. Faculty creates booking in window 2
5. Watch Admin dashboard in window 1

#### ✅ Expected Results:
- New request appears in Admin dashboard immediately
- No page refresh needed
- Notification bell updates

#### D. Push Notifications

**Steps:**
1. Login as Faculty
2. Go to Profile Settings
3. Enable push notifications
4. Allow browser permission
5. Have admin approve a request

#### ✅ Expected Results:
- Browser asks for permission
- Token registered successfully
- Push notification received when request approved

---

### **TEST 7: Security Features**

**Objective:** Verify existing security features still functional

#### A. Brute Force Protection

**Steps:**
1. Logout completely
2. Try to login with wrong password 5 times
3. Check account status

#### ✅ Expected Results:
- After 5 failed attempts, account locks for 30 minutes
- Clear error message shown
- Cannot login even with correct password
- Admin can manually unlock

#### B. Session Timeout

**Steps:**
1. Login as any user
2. Wait 25 minutes without activity
3. Observe warning dialog

#### ✅ Expected Results:
- Warning appears after 25 min idle
- Shows countdown (5 minutes remaining)
- Can extend session or logout
- Auto-logout after 30 min total

#### C. Password Reset

**Steps:**
1. Click "Forgot Password?"
2. Enter email
3. Submit

#### ✅ Expected Results:
- Rate limiting works (60s cooldown)
- Email sent successfully
- Cannot spam reset requests

---

### **TEST 8: Rate Limiting Functions (NEW)**

**Objective:** Verify all rate limiting Cloud Functions work correctly

#### A. Login Rate Limiting

**Steps:**
1. Open login page in **incognito window**
2. Enter any email (e.g., `test@test.com`)
3. Enter wrong password and click Login
4. Repeat rapidly 11 times
5. Observe error messages

#### ✅ Expected Results:
- First 10 attempts show "Invalid credentials" or similar
- 11th attempt shows rate limit error:
  - "Too many login attempts. Please try again later."
  - Shows reset time (15 minutes from first attempt)
- Cannot attempt login even with correct password
- After 15 minutes, can try again

#### ❌ Failure Indicators:
- Can make unlimited login attempts
- No rate limit error shown
- Rate limit not enforced
- Incorrect reset time shown

---

#### B. Booking Rate Limiting

**Steps:**
1. Login as **Faculty** user
2. Go to Room Booking page
3. Create a booking request:
   - Select any classroom
   - Select tomorrow's date
   - Select any time slot
   - Enter purpose
   - Submit
4. Repeat rapidly 6 times (change time slot each time)
5. Observe messages

#### ✅ Expected Results:
- First 5 bookings submit successfully
- After 3rd booking, should see warning: "X booking requests remaining this hour"
- 6th booking shows rate limit error:
  - "Too many booking requests. Please try again later."
  - Shows reset time (1 hour from first booking)
- Cannot submit more bookings until reset time
- After 1 hour, can create bookings again

#### ❌ Failure Indicators:
- Can create unlimited bookings
- No rate limit warning or error
- Rate limit not enforced
- Bookings created but not counted

---

#### C. Admin Rate Limiting

**Steps:**
1. Login as **Admin** user
2. Go to Request Approval page
3. Perform rapid admin actions:
   - Approve 30+ requests rapidly, OR
   - Reject 30+ requests rapidly, OR
   - Mix of approve/reject actions
4. Observe messages after 30 actions

#### ✅ Expected Results:
- First 30 actions complete successfully
- 31st action shows rate limit error:
  - "Too many admin actions. Please slow down."
  - Shows reset time (1 minute from first action)
- Cannot perform more actions until reset time
- After 1 minute, can perform actions again
- Counter resets properly

#### ❌ Failure Indicators:
- Can perform unlimited admin actions
- No rate limit error shown
- Rate limit not enforced
- Actions slow down but no error message

---

#### D. Rate Limit Error Handling

**Steps:**
1. Test unauthenticated access:
   - Open browser console
   - Call `checkBookingRateLimit()` before login
2. Test non-admin access:
   - Login as Faculty
   - Try to call `checkAdminActionRateLimit()`

#### ✅ Expected Results:
- Booking/Admin functions require authentication
- Clear error: "User must be authenticated"
- Admin function checks role
- Clear error: "User must be an admin"
- No server crashes or 500 errors

#### ❌ Failure Indicators:
- Functions execute without authentication
- No role checking for admin function
- Server errors or crashes
- Unclear error messages

---

### **TEST 9: Build and Production Deployment**

**Objective:** Verify production build works correctly

#### Steps:
1. Clean build:
   ```bash
   npm run build
   ```
2. Preview production build:
   ```bash
   npm run preview
   ```
3. Test all features in preview mode
4. Check console - should be mostly silent

#### ✅ Expected Results:
- Build completes successfully (~13-15s)
- No TypeScript errors
- No build warnings
- Preview server starts
- All features work in production mode
- Console is clean (no dev logs)

#### ❌ Failure Indicators:
- Build fails
- TypeScript errors
- Missing environment variables
- Features broken in production
- Console still has logs

---

### **TEST 9: Mobile Responsiveness**

**Objective:** Verify mobile layout works with new changes

#### Steps:
1. Open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test on various screen sizes:
   - iPhone SE (375x667)
   - iPad (768x1024)
   - Desktop (1920x1080)
4. Test all dashboards and features

#### ✅ Expected Results:
- Layout adjusts properly
- All buttons accessible
- Forms usable on mobile
- reCAPTCHA badge doesn't block content
- No horizontal scroll

---

## 📊 **TEST RESULTS CHECKLIST**

Mark each test as you complete it:

### Critical Tests (Must Pass)
- [ ] TEST 1: Console logging safe in production
- [ ] TEST 2A: reCAPTCHA protects signup
- [ ] TEST 2B: reCAPTCHA badge hides after login
- [ ] TEST 3: Signup flow end-to-end works
- [ ] TEST 4: Login and dashboards load correctly

### High Priority Tests (Should Pass)
- [ ] TEST 5: Error boundaries catch failures
- [ ] TEST 6A: Booking requests work
- [ ] TEST 6B: Admin approval works
- [ ] TEST 6C: Real-time updates work
- [ ] TEST 6D: Push notifications work

### Security Tests (Must Pass)
- [ ] TEST 7A: Brute force protection works
- [ ] TEST 7B: Session timeout works
- [ ] TEST 7C: Password reset rate limiting works

### Rate Limiting Tests (Must Pass - NEW)
- [ ] TEST 8A: Login rate limiting (10/IP/15min)
- [ ] TEST 8B: Booking rate limiting (5/user/hour)
- [ ] TEST 8C: Admin rate limiting (30/user/min)
- [ ] TEST 8D: Rate limit error handling

### Production Tests (Must Pass)
- [ ] TEST 9: Build succeeds
- [ ] TEST 10: Mobile responsive

---

## 🐛 **TROUBLESHOOTING**

### Issue: Rate limiting not working
**Solution:**
1. Verify all 3 functions deployed: `firebase functions:list`
2. Check Firebase Console → Functions for deployment status
3. Ensure Cloud Functions properly initialized in frontend
4. Check browser console for CORS or network errors
5. Verify Firestore collection `rateLimits` is accessible

### Issue: Rate limit error "User must be authenticated"
**Solution:**
1. Ensure user is logged in before calling booking/admin rate limits
2. Check authentication token is valid
3. Verify `request.auth` is populated in Cloud Function

### Issue: Admin rate limiting not enforcing
**Solution:**
1. Check user has admin role in Firestore `users` collection
2. Verify role check in `checkAdminActionRateLimit` function
3. Ensure admin actions call the rate limit function
4. Check function logs in Firebase Console

### Issue: reCAPTCHA badge doesn't appear
**Solution:**
1. Check `index.html` has reCAPTCHA script
2. Verify `VITE_RECAPTCHA_SITE_KEY` in `.env`
3. Check browser console for errors
4. Ensure site key is valid in Google Cloud Console

### Issue: "Permission denied" on signup
**Solution:**
1. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
2. Verify rules allow `create: if true` for `signupRequests`
3. Check console for specific error details

### Issue: Console still shows logs in production
**Solution:**
1. Verify using production build: `npm run build && npm run preview`
2. Not running dev server: `npm run dev` will show logs
3. Check `import.meta.env.DEV` is false in production

### Issue: Dashboard blank screen
**Solution:**
1. Check ErrorBoundary is wrapping Suspense
2. Look for component import errors in console
3. Verify lazy imports are correct paths

### Issue: reCAPTCHA badge won't hide after login
**Solution:**
1. Check `styles/globals.css` has `.grecaptcha-badge` CSS rules
2. Verify `body` element has `authenticated` class after login
3. Check `App.tsx` has useEffect that adds/removes class (should already exist)

---

## ✅ **ACCEPTANCE CRITERIA**

The implementation is ready for deployment if:

1. ✅ All Critical Tests pass
2. ✅ All High Priority Tests pass
3. ✅ All Security Tests pass
4. ✅ All Rate Limiting Tests pass (NEW)
5. ✅ Production build succeeds
6. ✅ No console errors in production
7. ✅ Mobile responsive works
8. ✅ No regressions in existing features
9. ✅ reCAPTCHA badge behavior correct
10. ✅ Rate limiting functions operational (NEW)
11. ✅ Documentation complete

---

## 📝 **NOTES FOR TESTERS**

- **Test Environment:** Development server or production preview
- **Browser:** Test in Chrome, Firefox, Safari (if possible)
- **Devices:** Desktop + at least one mobile size
- **Duration:** Complete testing should take **45-60 minutes** (updated for rate limiting tests)
- **Report Issues:** Document any failures with screenshots and console logs
- **Rate Limiting:** May need to wait for reset windows (15min, 1hr) or use different IPs/accounts

---

## 🎓 **FOR THESIS DEFENSE**

Be prepared to demonstrate:

1. **Console Logging Protection**
   - Show dev vs production console output
   - Explain how logger.ts sanitizes data

2. **reCAPTCHA Integration**
   - Show signup flow with bot protection
   - Explain invisible reCAPTCHA score-based detection
   - Demonstrate badge auto-hide feature

3. **Security Layers**
   - Frontend validation
   - reCAPTCHA bot protection
   - Firebase Auth
   - Firestore Rules
   - Admin approval workflow

4. **Error Handling**
   - Show error boundaries in action (optional)
   - Explain graceful degradation

5. **Rate Limiting** (NEW)
   - Demonstrate login rate limiting (10 attempts/IP/15min)
   - Show booking rate limiting (5 requests/user/hour)
   - Explain admin action throttling (30 actions/user/min)
   - Show error messages and reset times
   - Discuss DDoS mitigation strategies

---

**Testing Guide Version:** 1.1  
**Last Updated:** November 4, 2025  
**Status:** Ready for Testing - Rate Limiting Tests Added

Good luck! 🚀
