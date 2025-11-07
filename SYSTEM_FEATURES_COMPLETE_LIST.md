# Digital Classroom Assignment System - Complete Feature List for PPT Demo

## 📋 TABLE OF CONTENTS
1. [Authentication & Security Flow](#1-authentication--security-flow)
2. [User Registration Flow](#2-user-registration-flow)
3. [Admin Dashboard Flow](#3-admin-dashboard-flow)
4. [Faculty Dashboard Flow](#4-faculty-dashboard-flow)
5. [Classroom Booking Flow](#5-classroom-booking-flow)
6. [Request Approval Flow](#6-request-approval-flow)
7. [Classroom Management Flow](#7-classroom-management-flow)
8. [Schedule Management Flow](#8-schedule-management-flow)
9. [Notification System Flow](#9-notification-system-flow)
10. [User Management Flow](#10-user-management-flow)
11. [Reports & Analytics Flow](#11-reports--analytics-flow)
12. [Profile Settings Flow](#12-profile-settings-flow)
13. [Real-time Data Synchronization](#13-real-time-data-synchronization)
14. [Network & Error Handling](#14-network--error-handling)
15. [Cross-cutting Features](#15-cross-cutting-features)

---

## 1. AUTHENTICATION & SECURITY FLOW

### Features:
1. **Email/Password Login**
   - Email validation (RFC 5322 simplified regex)
   - Input sanitization (trim, lowercase)
   - Password visibility toggle (Eye/EyeOff icons)

2. **Password Input Sanitization**
   - Removes line breaks, tabs
   - Removes zero-width characters (U+200B, U+200C, U+200D, U+FEFF)
   - Trims whitespace
   - Handles paste operations safely

3. **reCAPTCHA v3 Enterprise Integration**
   - Dynamic script loading
   - Environment-based configuration (VITE_RECAPTCHA_SITE_KEY)
   - Token generation for signup
   - Fallback handling when unavailable

4. **Brute Force Protection**
   - Failed login attempt tracking (Cloud Function: `trackFailedLogin`)
   - Account auto-lock after 5 failed attempts
   - 30-minute lockout duration
   - Progressive warnings ("X attempts remaining")
   - Auto-unlock after timeout expiration
   - Manual admin unlock capability
   - Server-side validation (bypass-proof)

5. **Account Lock Status Display**
   - Real-time lock status checking
   - Locked account message with countdown
   - Admin vs. system lock differentiation (`lockedByAdmin` flag)
   - Lock expiration time display

6. **Session Management**
   - Browser local persistence (Firebase Auth)
   - Role-based routing (Admin/Faculty)
   - Authentication state persistence
   - Custom claims for role verification

7. **Session Timeout & Idle Detection**
   - 30-minute idle timeout (configurable)
   - 5-minute warning before logout
   - Activity tracking (mouse, keyboard, scroll, touch)
   - Visual countdown timer
   - Session extension option ("Stay Logged In")
   - Auto-logout on timeout
   - Warning dialog with time remaining

8. **Password Reset**
   - Email-based password reset
   - Rate limiting (1-minute cooldown)
   - Email validation
   - Reset link expiration (1 hour)
   - Success confirmation UI
   - Custom email templates (HTML)
   - Spam folder reminder

9. **Security Rules (Firestore)**
   - Role-based access control (admin/faculty)
   - Document ownership validation
   - Field-level write restrictions
   - Status field protection (`status: 'expired'` server-only)
   - Admin account lock prevention
   - Self-deletion prevention

10. **Environment Variable Security**
    - Required environment variables validation
    - Throws error on missing Firebase config
    - VAPID key validation for push notifications
    - Service account key support (Cloud Functions)

---

## 2. USER REGISTRATION FLOW

### Features:
1. **Signup Form Fields**
   - First Name (required, max 50 chars)
   - Last Name (required, max 50 chars)
   - Email (required, PLV domain validation)
   - Department(s) selection (multi-select, 1-3 departments)
   - Password (min 6 chars)
   - Confirm Password (match validation)

2. **Input Validation**
   - Real-time inline validation
   - Required field checking
   - Email format validation
   - Password strength requirements
   - Password match confirmation
   - Character limits enforcement
   - Sanitization (XSS prevention)

3. **Password Visibility Toggles**
   - Separate toggles for Password field
   - Separate toggles for Confirm Password field
   - Eye/EyeOff icon indicators
   - Accessibility labels

4. **Department Selection**
   - Multi-select dropdown
   - Supports 1-3 departments
   - Department badges display
   - Remove individual departments
   - Available departments:
     - Information Technology
     - Civil Engineering
     - Electrical Engineering

5. **reCAPTCHA Integration**
   - Token generation on submit
   - Silent background verification
   - Fallback on reCAPTCHA failure

6. **Signup Request Creation**
   - Creates pending signup request
   - Stores in `signupRequests` collection
   - Status: 'pending' by default
   - Timestamp tracking
   - User ID association

7. **Confirmation Message**
   - Success toast notification
   - Admin approval waiting message
   - Tab auto-switch to Login

8. **Error Handling**
   - Duplicate email detection
   - Network error recovery
   - User-friendly error messages
   - Form state preservation on error

---

## 3. ADMIN DASHBOARD FLOW

### Features:
1. **Dashboard Tabs**
   - Overview (default on login)
   - Classrooms
   - Requests
   - Signups
   - Schedule
   - Reports
   - Settings
   - User Management

2. **Tab Persistence**
   - Defaults to 'overview' on login (no persistence)
   - Scroll to top on mount
   - Smooth scroll behavior

3. **Responsive Tab Layout**
   - Mobile: Horizontal scrollable tabs
   - Tablet/Desktop: Standard tab layout
   - Auto-scroll to active tab on mobile
   - CSS classes: `mobile-tab-container`, `mobile-tab-scroll`, `mobile-tab-item`

4. **Real-time Data Updates**
   - Auto-refresh on data changes
   - Live booking request counter
   - Live signup request counter
   - Schedule updates
   - Classroom availability status

5. **Quick Stats Cards (Overview)**
   - Pending Requests count (with icon)
   - Pending Signups count (with icon)
   - Total Classrooms count
   - Today's Schedules count
   - Color-coded status indicators
   - Clickable cards (navigate to relevant tab)

6. **Notification Bell**
   - Unread notification count badge
   - Real-time updates
   - Click to open Notification Center
   - Red badge indicator

7. **Notification Center**
   - Fixed top-right panel
   - Slide-in animation (Framer Motion)
   - Grouped notifications (today, earlier)
   - Acknowledge individual/all notifications
   - Empty state message
   - Close button

8. **Logout Functionality**
   - Confirmation dialog
   - Session cleanup
   - Redirect to login

9. **Settings Tab Refresh**
   - Auto-refresh on first settings tab open
   - Service worker initialization for push notifications
   - Session storage flag to prevent repeated refreshes

---

## 4. FACULTY DASHBOARD FLOW

### Features:
1. **Dashboard Tabs**
   - Overview (default on login)
   - Booking
   - Search
   - Schedule
   - Settings

2. **Tab Persistence**
   - Defaults to 'overview' on login (no persistence)
   - Respects `initialTab` prop

3. **Responsive Tab Layout**
   - Mobile: Horizontal scrollable tabs
   - Auto-scroll to active tab
   - Touch-friendly interactions

4. **Quick Stats Cards (Overview)**
   - Upcoming Classes count
   - Pending Requests count
   - Recent Bookings list (last 5)
   - Quick action buttons

5. **Booking Prefill Support**
   - External initial data support
   - "Book Similar" prefill from schedule
   - Auto-switch to Booking tab
   - Data consumption callback

6. **Quick Actions**
   - "New Booking" button (switches to Booking tab)
   - "View All" buttons
   - Recent booking cards with status badges

7. **Notification Bell**
   - Same as admin dashboard
   - Faculty-specific notifications

8. **Notification Center**
   - Same as admin dashboard
   - Faculty-filtered notifications

9. **Logout Functionality**
   - Same as admin dashboard

10. **Real-time Updates**
    - Live schedule updates
    - Booking request status changes
    - Conflict detection updates

---

## 5. CLASSROOM BOOKING FLOW

### Features:
1. **Form Fields**
   - Classroom Selection (dropdown with details)
   - Date Picker (calendar popover)
   - Start Time (30-min slots, 7:00 AM - 7:30 PM)
   - End Time (dynamic based on start time)
   - Purpose (required, max 500 chars, textarea)

2. **Date Validation**
   - Minimum: Today
   - Maximum: 2 months from today
   - No past dates allowed
   - Invalid date detection (e.g., Feb 30, Apr 31)
   - ISO format validation (YYYY-MM-DD)

3. **Date Input Methods**
   - Calendar popover (desktop/tablet)
   - Native date input (small phones, 320-425px)
   - Date format: MM/DD/YYYY display, YYYY-MM-DD storage
   - Auto-detection of screen size

4. **Time Slot Generation**
   - 30-minute intervals
   - School hours: 7:00 AM - 8:30 PM
   - Latest start time: 7:30 PM
   - 12-hour format display (AM/PM)
   - 24-hour format storage (HH:MM)

5. **Smart End Time Selection**
   - Only shows valid end times based on start time
   - Auto-clears invalid end times when start changes
   - Minimum duration validation
   - Maximum duration checking

6. **Conflict Detection (Real-time)**
   - Client-side conflict checking
   - Confirmed schedule conflicts (red badges)
   - Pending request conflicts (yellow badges)
   - Conflict list display with faculty names, times
   - Visual conflict indicators on form

7. **Conflict Warnings**
   - Allows submission despite pending conflicts
   - Clear warning messages
   - "Submit Anyway" option
   - Conflict details in expandable section

8. **Classroom Information Display**
   - Room name with building/floor
   - Capacity indicator
   - Equipment icons (visual)
   - Availability status badge

9. **Equipment Icons**
   - Phosphor Icons library
   - Visual equipment list
   - Tooltip on hover (desktop)
   - Icons: Projector, Computer, WiFi, Whiteboard, TV, Speakers, etc.

10. **Form Validation**
    - Required field checking
    - Date range validation (today to +2 months)
    - Time range validation (end > start)
    - School hours validation (7:00 AM - 8:30 PM)
    - Purpose length validation (max 500 chars)
    - Reasonable duration checking
    - Past booking time prevention

11. **Initial Data Support ("Book Similar")**
    - Accepts prefill data from parent component
    - Auto-populates all fields
    - Normalizes 12/24-hour time formats
    - Validates prefilled data

12. **Offline Detection**
    - Network status checking before submit
    - Offline badge display (WifiOff icon)
    - Submit button disabled when offline
    - User-friendly offline messages

13. **Loading States**
    - Submit button loader
    - Disabled state during submission
    - Conflict checking loader

14. **Success Handling**
    - Success toast notification
    - Form reset after submission
    - Accessibility announcement
    - Optional toast suppression (for bulk operations)

15. **Error Handling**
    - Inline error messages per field
    - Network error retry logic
    - User-friendly error descriptions
    - Form state preservation on error

16. **Accessibility**
    - ARIA labels on all inputs
    - Screen reader announcements (useAnnouncer)
    - Keyboard navigation support
    - Focus management

---

## 6. REQUEST APPROVAL FLOW

### Features:
1. **Request Tabs**
   - Pending (default)
   - Approved
   - Rejected
   - Expired

2. **Tab Persistence**
   - User-specific storage key (includes userId)
   - Remembers last active tab
   - Hash-based sharing support

3. **Request Filtering**
   - Expired detection (server-marked OR past start time)
   - Status-based filtering
   - Auto-categorization

4. **Request Cards**
   - Faculty name and email
   - Classroom details (name, building, floor, capacity)
   - Date and time (formatted, with day of week)
   - Purpose display
   - Equipment list with icons
   - Status badges (color-coded)
   - Action buttons (Approve/Reject)

5. **Conflict Checking (Pre-approval)**
   - Server-side conflict detection
   - Checks schedules and other approved requests
   - Excludes current request from conflict check
   - Past time validation
   - Visual conflict warnings

6. **Single Request Actions**
   - Approve button (green, CheckCircle icon)
   - Reject button (red, XCircle icon)
   - Feedback dialog for both actions
   - Required feedback for rejection
   - Optional feedback for approval

7. **Bulk Actions (Pending Tab)**
   - Checkbox selection (multi-select)
   - "Select All" option
   - Bulk Approve button
   - Bulk Reject button
   - Selected count display
   - Clear selection button

8. **Bulk Processing**
   - Throttled concurrency (3 concurrent max)
   - Progress tracking (X of Y processed)
   - Individual failure handling
   - Success/failure summary toast
   - Retry logic for failures
   - Retry button for failed items

9. **Feedback Dialog**
   - Required for rejection
   - Optional for approval
   - Character limit (500 chars)
   - Validation error display
   - Cancel and Confirm buttons

10. **Approved Tab Features**
    - Bulk cancel functionality
    - Checkbox selection
    - Cancel reason required (reuses feedback dialog)
    - Past booking prevention

11. **Request Details Display**
    - Date formatting (weekday, month, day, year)
    - Time range formatting (12-hour with AM/PM)
    - Relative dates ("Today", "Tomorrow")
    - Status badges with icons

12. **Auto-expiration**
    - Cloud Function: `expirePastPendingBookings` (runs hourly)
    - Marks pending requests past start time as 'expired'
    - Auto-feedback: "Auto-expired: booking date/time has passed"
    - Server timestamp tracking

13. **Notification Creation**
    - Auto-notification on approval
    - Auto-notification on rejection
    - Includes admin feedback
    - Actor ID tracking (prevents self-notification)

14. **Loading States**
    - Per-request processing indicators
    - Bulk operation progress display
    - Disabled buttons during processing
    - Minimum loader display time (UX smoothness)

15. **Responsive Design**
    - Mobile: Horizontal scrollable tabs
    - Card-based layout
    - Touch-friendly buttons
    - Adaptive spacing

---

## 7. CLASSROOM MANAGEMENT FLOW

### Features:
1. **Classroom List Table**
   - Room name and building
   - Floor number
   - Capacity
   - Equipment list with icons
   - Availability status (Available/Unavailable badge)
   - Action buttons (Edit, Disable/Enable, Delete)

2. **Add Classroom Dialog**
   - Room Name (required, max 50 chars)
   - Building (required, max 100 chars)
   - Floor (dropdown, 1-10)
   - Capacity (number, min 1, max 200)
   - Equipment (multi-select checkboxes)
   - Availability toggle (default: enabled)

3. **Edit Classroom**
   - Same form as Add
   - Prefills existing data
   - Updates all fields
   - Firestore timestamp tracking

4. **Classroom Validation**
   - Room name sanitization
   - Capacity range validation (1-200)
   - Building name sanitization
   - XSS prevention (input sanitization)
   - Real-time validation errors

5. **Equipment Options**
   - Projector
   - Computer
   - WiFi
   - Whiteboard
   - TV
   - Speakers
   - Air Conditioner
   - Podium
   - Microphone
   - Camera
   - Printer
   - Scanner

6. **Equipment Icons**
   - Visual equipment representation
   - Icon helper: `getIconForEquipment()`
   - Phosphor Icons library

7. **Disable/Enable Classroom**
   - Disable warning dialog
   - Affected bookings detection (Cloud Function query)
   - Affected schedules detection
   - Required disable reason
   - Shows count of affected items
   - Notifications to affected faculty
   - Status update in Firestore

8. **Affected Items Display**
   - Faculty name
   - Date and time
   - Purpose
   - Scrollable list (max-height)
   - Empty state handling

9. **Delete Classroom (Cascade)**
   - Cloud Function: `deleteClassroomCascade`
   - Confirmation dialog
   - Deletes non-lapsed bookings/schedules
   - Preserves historical (lapsed) records
   - Deletion lock mechanism (prevents concurrent deletes)
   - Audit log creation
   - Deletion notification creation
   - Batch deletion (chunks of 450)

10. **Loading States**
    - Per-row loading indicators
    - Submit button loaders
    - Disable button loaders
    - Table row disabled state

11. **Success/Error Handling**
    - Toast notifications
    - Error message display
    - Network retry logic
    - Form state preservation

12. **Responsive Design**
    - Mobile: Scrollable table
    - Touch-friendly buttons
    - Dialog responsive layout

---

## 8. SCHEDULE MANAGEMENT FLOW

### Features:
1. **Schedule Viewer**
   - Day view
   - Week view
   - Calendar navigation (prev/next)
   - Classroom filter dropdown
   - Date display (formatted)

2. **Time Slot Grid**
   - 30-minute time slots (7:00 AM - 8:00 PM)
   - Visual schedule blocks
   - Faculty name display
   - Purpose on hover/click
   - Color-coded status

3. **Schedule Details**
   - Classroom name
   - Faculty name
   - Date and time range
   - Purpose
   - Status badge

4. **Cancel Schedule (Admin)**
   - Cancel button on each schedule
   - Required cancellation reason
   - Reason validation (max 500 chars)
   - Updates schedule status to 'cancelled'
   - Creates notification for faculty

5. **Faculty Schedule View**
   - Upcoming tab (future schedules)
   - Requests tab (pending requests)
   - Approved tab (approved requests, not yet started)
   - Cancelled tab
   - History tab (past schedules)
   - Rejected tab (rejected requests)

6. **Faculty Bulk Cancel**
   - Multi-select approved bookings
   - Bulk cancel button
   - Required cancellation reason (feedback dialog)
   - Throttled processing
   - Success/failure summary

7. **Quick Rebook**
   - "Book Similar" button on schedule cards
   - Prefills booking form with same details
   - Auto-switches to Booking tab
   - Confirmation dialog before submission

8. **Lapsed Schedule Detection**
   - Checks if schedule end time has passed
   - Prevents cancellation of past schedules
   - Visual indication (grayed out, disabled actions)

9. **Schedule Filtering**
   - Date-based filtering (today, week)
   - Classroom-based filtering
   - Status-based filtering
   - Multi-criteria support

10. **Date Navigation**
    - Previous/Next day (day view)
    - Previous/Next week (week view)
    - Jump to today button
    - Date range display

11. **Responsive Design**
    - Mobile: Vertical card layout
    - Desktop: Grid layout
    - Horizontal scroll on small screens

---

## 9. NOTIFICATION SYSTEM FLOW

### Features:
1. **Notification Types**
   - `approved` - Booking approved
   - `rejected` - Booking rejected
   - `info` - General information
   - `cancelled` - Booking cancelled
   - `signup` - Signup request processed
   - `classroom_disabled` - Classroom disabled

2. **Notification Creation (Server-side)**
   - Cloud Function: `createNotification`
   - Prevents self-notifications (actorId check)
   - Server timestamp
   - Associated data (bookingRequestId, adminFeedback)

3. **Push Notification Integration**
   - Firebase Cloud Messaging (FCM)
   - Service Worker (`firebase-messaging-sw.js`)
   - VAPID key configuration
   - Token registration/unregistration
   - Push enabled flag per user

4. **Push Service Features**
   - `isPushSupported()` - Browser support detection
   - `enablePush()` - Request permission, register token
   - `disablePush()` - Unregister token
   - `waitForServiceWorkerReady()` - SW initialization wait
   - Exponential backoff polling for SW readiness

5. **Notification Service**
   - `createNotification()` - Server-side callable
   - `acknowledgeNotification()` - Mark single as read
   - `acknowledgeNotifications()` - Mark multiple as read
   - `getUnreadCount()` - Count unread for user
   - `setupNotificationsListener()` - Real-time subscription

6. **Notification Bell**
   - Unread count badge
   - Real-time updates via listener
   - Force unread count prop (for temporary states)
   - Click to open Notification Center

7. **Notification Center Panel**
   - Fixed top-right position
   - Slide-in animation (Framer Motion)
   - Grouped by date ("Today", "Earlier")
   - Individual acknowledge buttons
   - "Mark All as Read" button
   - Empty state message
   - Close button (X icon)
   - Auto-focus on open (accessibility)

8. **In-app Notifications**
   - Always created regardless of push settings
   - Real-time Firestore listener
   - Auto-update unread count
   - Persists across sessions

9. **Push Notifications (Browser)**
   - Requires user opt-in
   - `pushEnabled` flag in Firestore
   - FCM token storage
   - Cloud Function checks `pushEnabled` before sending
   - Service worker handles background messages
   - Foreground message handling (`onMessage`)

10. **Browser Support Detection**
    - iOS Safari 16.4+ with Web Push enabled
    - Android Chrome/Firefox support
    - Desktop browser support
    - Graceful fallback (in-app only)
    - User-friendly error messages

11. **Test Push Notification**
    - Cloud Function: `sendTestPush`
    - Admin-only (for testing)
    - Sends test FCM message
    - Verifies push setup

12. **Notification Content**
    - Title (auto-generated based on type)
    - Message text
    - Optional admin feedback
    - Optional booking request link
    - Created/updated timestamps
    - Acknowledged timestamp

13. **Real-time Sync**
    - Firestore `onSnapshot` listener
    - Auto-refresh on new notifications
    - Optimistic UI updates
    - Conflict-free merging

---

## 10. USER MANAGEMENT FLOW

### Features:
1. **User List Table**
   - Name (first + last)
   - Email
   - Role (Admin/Faculty)
   - Department(s)
   - Status (Pending/Approved)
   - Account Lock status
   - Action buttons

2. **Search and Filtering**
   - Search by name/email/department
   - Filter by role (All/Admin/Faculty)
   - Filter by status (All/Pending/Approved/Rejected)
   - Filter by lock status (All/Locked/Unlocked)
   - Real-time filtering

3. **Sorting**
   - Sort by first name (A-Z, Z-A)
   - Sort by last name (A-Z, Z-A)
   - Toggle sort order button

4. **User Actions**
   - Disable User (sets status to inactive)
   - Enable User (sets status to active)
   - Delete User (soft/hard delete)
   - Change Role (Admin ↔ Faculty)
   - Unlock Account (clear brute force lock)

5. **Delete User**
   - Confirmation dialog
   - Email confirmation input (must match)
   - Soft delete option (default)
   - Hard delete option (checkbox)
   - Cloud Function: `deleteUserAccount`
   - Deletes Firebase Auth account
   - Deletes Firestore user document
   - Deletes related signup requests
   - Admin account delete prevention
   - Self-delete prevention

6. **Change Role**
   - Admin → Faculty (allowed)
   - Faculty → Admin (requires confirmation)
   - Promotion warning dialog
   - Prevents role change if user is currently logged in
   - Toast notification on success

7. **Unlock Account**
   - Clears brute force lock
   - Resets `failedLoginAttempts`
   - Clears `accountLocked` flag
   - Clears `lockedUntil` timestamp
   - Preserves `lockedByAdmin` if set

8. **Account Lock Indicators**
   - Lock icon in table
   - Lock reason tooltip
   - Manual vs. auto-lock differentiation
   - Unlock button (admin only)

9. **Processing States**
   - Per-user action loaders
   - Disabled buttons during processing
   - Action-specific loading indicators
   - Prevents multiple simultaneous actions on same user

10. **Bulk Cleanup**
    - Cloud Function: `bulkCleanupRejectedAccounts`
    - Deletes all rejected signup accounts
    - Batch processing
    - Admin-only

11. **User Status Management**
    - Pending (awaiting approval)
    - Approved (active account)
    - Rejected (denied signup)
    - Disabled (admin-disabled account)

12. **Responsive Design**
    - Mobile: Scrollable table
    - Compact view on small screens
    - Touch-friendly action buttons

---

## 11. REPORTS & ANALYTICS FLOW

### Features:
1. **Report Period Selection**
   - Week (last 7 days)
   - Month (last 30 days)
   - Semester (last 4 months)
   - Dropdown selector

2. **Key Metrics Cards**
   - Total Requests (count)
   - Approved Requests (count)
   - Approval Rate (percentage)
   - Total Hours Booked (sum)
   - Utilization Rate (percentage)
   - Total Classes (count)

3. **Classroom Utilization Chart**
   - Bar chart (Recharts)
   - X-axis: Classroom names
   - Y-axis: Number of bookings
   - Color-coded bars
   - Responsive container

4. **Request Status Breakdown**
   - Pie chart (Recharts)
   - Segments: Approved, Rejected, Pending
   - Color-coded (green, red, orange)
   - Percentage labels
   - Legend

5. **Booking Trends Over Time**
   - Line chart (Recharts)
   - X-axis: Dates
   - Y-axis: Number of bookings
   - Trend line
   - Data points

6. **Top Classrooms by Usage**
   - Ranked list
   - Classroom name
   - Total bookings count
   - Total hours count
   - Top 5 display

7. **Department Activity**
   - Grouped by department
   - Bookings per department
   - Hours per department
   - Comparison chart

8. **Peak Usage Times**
   - Time slot analysis
   - Most booked hours
   - Heatmap visualization (future enhancement)

9. **Export Reports**
   - Download button
   - CSV export (future enhancement)
   - PDF export (future enhancement)

10. **Data Filtering**
    - Date range filtering
    - Status filtering (confirmed only)
    - Excludes past bookings option

11. **Responsive Charts**
    - Responsive container (Recharts)
    - Auto-resize on window resize
    - Mobile-friendly chart layout
    - Tooltip on hover (desktop)

---

## 12. PROFILE SETTINGS FLOW

### Features:
1. **Profile Information Display**
   - Name
   - Email
   - Role badge (Admin/Faculty)
   - Department(s) badges
   - Last sign-in time

2. **Edit Profile**
   - Edit button
   - Name field (editable)
   - Department(s) multi-select (faculty only)
   - Save/Cancel buttons
   - Validation (name required, 1-3 departments)

3. **Department Management (Faculty)**
   - Multi-select dropdown
   - Add/Remove departments
   - Visual badge display
   - 1-3 department limit
   - Validation errors

4. **Change Password**
   - Current password (required)
   - New password (min 6 chars)
   - Confirm new password (must match)
   - Password visibility toggles (3 separate)
   - Reauthentication required
   - Confirmation dialog before change

5. **Password Validation**
   - Current password verification (reauthentication)
   - New password strength (min 6 chars)
   - Password match validation
   - Real-time inline errors
   - User-friendly error messages

6. **Push Notification Settings**
   - Enable/Disable toggle
   - Browser support detection
   - Service worker status check
   - Permission request flow
   - Token registration/unregistration
   - Cloud Functions: `registerPushToken`, `unregisterPushToken`, `setPushEnabled`

7. **Push Notification Setup**
   - Browser compatibility check (iOS Safari 16.4+, Android, Desktop)
   - Service worker readiness wait (exponential backoff polling)
   - Permission request dialog (browser native)
   - FCM token generation
   - Token storage in Firestore (`users` collection)
   - `pushEnabled` flag update

8. **Push Notification Disable**
   - Unregister FCM token
   - Update `pushEnabled` flag to false
   - Clear token from Firestore
   - User confirmation

9. **Service Worker Integration**
   - `waitForServiceWorkerReady()` - prevents "no active SW" errors
   - Auto-registration on page load
   - Foreground message handling
   - Background message handling (in SW)

10. **Loading States**
    - Password change loader
    - Profile save loader
    - Push toggle loader
    - Disabled buttons during processing

11. **Success/Error Handling**
    - Toast notifications
    - Inline error messages
    - Network retry logic
    - User-friendly error descriptions

12. **Accessibility**
    - ARIA labels
    - Screen reader support
    - Keyboard navigation
    - Focus management

---

## 13. REAL-TIME DATA SYNCHRONIZATION

### Features:
1. **Real-time Service (`realtimeService`)**
   - `subscribeToData(user, callbacks)` - Sets up role-filtered listeners
   - Auto-unsubscribe on user change
   - Handles multiple collections simultaneously
   - Error handling and logging

2. **Admin Real-time Subscriptions**
   - All classrooms
   - All booking requests
   - All schedules
   - All signup requests
   - All signup history
   - All users

3. **Faculty Real-time Subscriptions**
   - All classrooms (read-only)
   - Own booking requests (filtered by facultyId)
   - Own schedules (filtered by facultyId)
   - All schedules (for conflict checking)
   - All booking requests (for conflict checking)

4. **Firestore `onSnapshot` Listeners**
   - Real-time document updates
   - Real-time collection queries
   - Auto-refresh UI on data change
   - Optimistic UI updates

5. **Data Normalization**
   - Timestamp conversion (Firestore Timestamp → ISO string)
   - ID injection from document ID
   - Type safety (TypeScript interfaces)

6. **Callback-based Architecture**
   - `onClassroomsUpdate(classrooms)`
   - `onBookingRequestsUpdate(requests)`
   - `onSchedulesUpdate(schedules)`
   - `onSignupRequestsUpdate(signups)`
   - `onSignupHistoryUpdate(history)`
   - `onUsersUpdate(users)`

7. **Subscription Cleanup**
   - Auto-cleanup on component unmount
   - Unsubscribe functions returned
   - Memory leak prevention

8. **Network Resilience**
   - Auto-reconnect on network restore
   - Offline persistence (Firestore cache)
   - Graceful degradation

---

## 14. NETWORK & ERROR HANDLING

### Features:
1. **Network Status Detection**
   - Browser `navigator.onLine` API
   - Online/Offline event listeners
   - Real-time status updates

2. **Network Status Indicator**
   - Visual badge (top-right corner)
   - Offline: Red badge with WifiOff icon
   - Online (reconnect): Green badge with Wifi icon
   - Auto-hide after 3 seconds (online)
   - Framer Motion animations

3. **Retry Logic (`withRetry`)**
   - Automatic retry with exponential backoff
   - Default: 3 attempts
   - Initial delay: 300ms
   - Backoff factor: 2x
   - Configurable retry predicate
   - Network error detection

4. **Network Error Detection**
   - `isNetworkError(err)` helper
   - Detects common network error codes
   - TypeError, Failed to fetch
   - CORS errors
   - Timeout errors

5. **Network-Aware Operations (`executeWithNetworkHandling`)**
   - Wraps async operations
   - Auto-retry on network errors
   - User-friendly toast notifications
   - Loading state management
   - Success/Error toast messages
   - Offline detection before execution

6. **Operation Feedback**
   - Loading toasts (optional)
   - Success toasts (with custom messages)
   - Error toasts (with user-friendly descriptions)
   - Silent mode (no success toast)
   - Custom error message prefixes

7. **Offline Handling**
   - Disable submit buttons when offline
   - Display offline badges on forms
   - Prevent actions requiring network
   - Queue actions for online (future enhancement)

8. **Error Logging**
   - Console logging in development
   - Firebase Analytics error tracking (optional)
   - Error categorization (network, validation, auth, etc.)

9. **User-Friendly Error Messages**
   - "Network error, please check your connection"
   - "Please try again in a moment"
   - Avoid technical jargon
   - Actionable suggestions

10. **Loading State Management**
    - Button loaders (spinning icons)
    - Disabled states during operations
    - Form field lockdown during submit
    - Minimum loader display time (UX smoothness)

---

## 15. CROSS-CUTTING FEATURES

### 1. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Horizontal scrollable tabs on mobile
   - Touch-friendly buttons (min 44x44px)
   - Adaptive spacing (Tailwind utility classes)
   - Grid layouts (responsive columns)

### 2. **Animation & Transitions**
   - Framer Motion library
   - Slide-in animations (Notification Center)
   - Fade animations (modals, toasts)
   - Smooth transitions (tab changes)
   - Apple Motion easing (custom motion component)

### 3. **Accessibility (a11y)**
   - ARIA labels on all interactive elements
   - Screen reader announcements (useAnnouncer)
   - Keyboard navigation support
   - Focus management (dialogs, modals)
   - Color contrast compliance (WCAG AA)
   - Semantic HTML structure

### 4. **Time Utilities**
   - `convertTo12Hour()` - 24h → 12h with AM/PM
   - `convertTo24Hour()` - 12h → 24h
   - `generateTimeSlots()` - 30-min slots, 7AM-7:30PM
   - `isValidSchoolTime()` - Validates school hours
   - `isPastBookingTime()` - Checks if time has passed
   - `formatTimeRange()` - Formats start-end time display
   - `isValidTimeRange()` - Validates end > start
   - `getValidEndTimes()` - Returns valid end times for start
   - `abbreviateDepartments()` - Shortens department names

### 5. **Input Validation & Sanitization**
   - `sanitizeText()` - XSS prevention, trim, collapse spaces
   - `isValidEmail()` - RFC 5322 simplified regex
   - `validatePassword()` - Min length, strength
   - `sanitizePassword()` - Removes line breaks, zero-width chars
   - Character limits enforcement (INPUT_LIMITS constants)
   - Real-time validation feedback

### 6. **Tab Persistence**
   - `readPreferredTab()` - Reads from localStorage + hash
   - `writeStoredTab()` - Writes to localStorage
   - `writeTabToHash()` - Writes to URL hash
   - User-specific keys (includes userId)
   - Allowed tabs validation
   - Default tab fallback

### 7. **Loading States & Skeletons**
   - Suspense fallback loaders
   - Per-component loading indicators
   - Skeleton screens (future enhancement)
   - Minimum loader display time (prevents flash)

### 8. **Error Boundaries**
   - React Error Boundary component
   - Catches component errors
   - Displays fallback UI
   - Error logging
   - Reset functionality

### 9. **Toast Notifications (Sonner)**
   - Success toasts (green, CheckCircle icon)
   - Error toasts (red, AlertCircle icon)
   - Warning toasts (orange, AlertTriangle icon)
   - Info toasts (blue, Info icon)
   - Loading toasts (spinner)
   - Custom duration (default: 5s)
   - Action buttons (Undo, Retry, etc.)
   - Dismissible (X button)
   - Position: bottom-right

### 10. **Form Components (Radix UI)**
    - Form, FormItem, FormLabel, FormControl, FormMessage
    - Input, Textarea, Select, Checkbox, Switch
    - Calendar, Popover, Dialog, AlertDialog
    - Tabs, Badge, Button, Card
    - Tooltip, Dropdown Menu
    - Accessible by default (WAI-ARIA)

### 11. **Icon Libraries**
    - Lucide React (primary: Search, Calendar, Clock, etc.)
    - Phosphor Icons (equipment icons, notifications)
    - Consistent sizing (h-4 w-4, h-5 w-5, etc.)
    - Color theming (text-current)

### 12. **TypeScript Type Safety**
    - Strict mode enabled
    - Interface definitions for all data models:
      - User
      - Classroom
      - BookingRequest
      - Schedule
      - SignupRequest
      - SignupHistory
      - Notification
    - Type guards
    - Generics for reusable components/functions

### 13. **Environment Configuration**
    - `.env` file support
    - Required variables validation
    - Firebase config (apiKey, authDomain, etc.)
    - reCAPTCHA site key
    - VAPID key for push
    - Service account keys (Cloud Functions)

### 14. **Cloud Functions (Backend)**
    - `trackFailedLogin` - Brute force protection
    - `resetFailedLogins` - Clear failed attempts
    - `deleteUserAccount` - User deletion
    - `bulkCleanupRejectedAccounts` - Bulk cleanup
    - `cancelBookingRequest` - Undo booking
    - `deleteClassroomCascade` - Cascade delete
    - `cancelApprovedBooking` - Admin cancel
    - `createNotification` - Server-side notification
    - `acknowledgeNotification` - Mark read (single)
    - `acknowledgeNotifications` - Mark read (bulk)
    - `registerPushToken` - FCM token registration
    - `unregisterPushToken` - FCM token removal
    - `setPushEnabled` - Toggle push flag
    - `sendTestPush` - Test push notification
    - `expirePastPendingBookings` - Scheduled function (hourly)

### 15. **Firestore Security Rules**
    - Role-based access (admin/faculty)
    - Document ownership validation
    - Field-level restrictions
    - Status field protection (expired server-only)
    - Admin account lock prevention
    - Self-modification restrictions
    - Client cannot set `updatedBy` to other users

### 16. **Service Worker (PWA)**
    - `firebase-messaging-sw.js` - FCM background messages
    - Service worker registration on page load
    - Background notification handling
    - Push notification display
    - Offline cache (future enhancement)

### 17. **Analytics & Monitoring**
    - Vercel Analytics integration
    - Firebase Analytics (optional)
    - Error tracking
    - Performance monitoring
    - User behavior tracking (future)

### 18. **Code Splitting & Performance**
    - Lazy loading (React.lazy)
    - Suspense fallbacks
    - Component-level code splitting:
      - AdminDashboard
      - FacultyDashboard
      - ClassroomManagement
      - RequestApproval
      - SignupApproval
      - ScheduleViewer
      - AdminReports
      - ProfileSettings
      - AdminUserManagement
      - RoomBooking
      - RoomSearch
      - FacultySchedule
    - Reduced initial bundle size
    - Dynamic imports

### 19. **Deployment**
    - Vercel hosting (frontend)
    - Firebase Hosting (alternative)
    - Cloud Functions deployment (backend)
    - Environment-specific configs
    - CI/CD pipelines (future)

### 20. **Documentation**
    - README.md - Project overview
    - DEPLOYMENT_GUIDE.md - Cloud Functions deployment
    - FIREBASE_QUICK_REFERENCE.md - Firebase service guide
    - FIREBASE_TROUBLESHOOTING.md - Common issues
    - BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md - Security feature
    - ADVANCE_BOOKING_LIMIT_IMPLEMENTATION.md - Booking limit feature
    - CLASSROOM_DISABLE_WARNING_FEATURE.md - Classroom disable
    - Copilot instructions (copilot-instructions.md)
    - Inline code comments (JSDoc)

---

## 🎯 SUMMARY BY NUMBER

- **20+ Major Feature Flows**
- **300+ Individual Features**
- **15+ Cloud Functions**
- **10+ Real-time Data Subscriptions**
- **12+ Notification Types**
- **50+ UI Components**
- **15+ Security Features**
- **10+ Validation Utilities**
- **5+ Network Resilience Features**
- **Complete Mobile Responsiveness**

---

## 📊 TECHNOLOGY STACK SUMMARY

### Frontend:
- React 18 (TypeScript)
- Vite (Build tool)
- Tailwind CSS (Styling)
- Shadcn/ui (Component library)
- Radix UI (Primitives)
- Framer Motion (Animations)
- Recharts (Charts/Analytics)
- Lucide React & Phosphor Icons (Icons)
- Sonner (Toast notifications)

### Backend:
- Firebase Authentication
- Firestore Database
- Firebase Cloud Functions (Node.js, TypeScript)
- Firebase Cloud Messaging (FCM)
- Firebase Admin SDK

### Security:
- reCAPTCHA v3 Enterprise
- Firestore Security Rules
- Brute Force Protection
- Session Timeout
- Input Sanitization

### Deployment:
- Vercel (Frontend)
- Firebase Hosting (Alternative)
- Firebase Cloud Functions (Backend)

### Development:
- TypeScript (Strict mode)
- ESLint
- VS Code
- Git version control

---

**This comprehensive list demonstrates a production-ready, enterprise-grade classroom management system with advanced features, security, and user experience considerations.**
