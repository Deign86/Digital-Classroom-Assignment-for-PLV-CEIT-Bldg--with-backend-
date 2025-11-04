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

### **TEST 8: Build and Production Deployment**

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

### Production Tests (Must Pass)
- [ ] TEST 8: Build succeeds
- [ ] TEST 9: Mobile responsive

---

## 🐛 **TROUBLESHOOTING**

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
4. ✅ Production build succeeds
5. ✅ No console errors in production
6. ✅ Mobile responsive works
7. ✅ No regressions in existing features
8. ✅ reCAPTCHA badge behavior correct
9. ✅ Documentation complete

---

## 📝 **NOTES FOR TESTERS**

- **Test Environment:** Development server or production preview
- **Browser:** Test in Chrome, Firefox, Safari (if possible)
- **Devices:** Desktop + at least one mobile size
- **Duration:** Complete testing should take 30-45 minutes
- **Report Issues:** Document any failures with screenshots and console logs

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

---

**Testing Guide Version:** 1.0  
**Last Updated:** November 4, 2025  
**Status:** Ready for Testing

Good luck! 🚀
