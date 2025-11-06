# Test Cases: Classroom Disable Warning Feature

## Overview
This document outlines comprehensive test cases for the Classroom Disable Warning feature, which notifies faculty members when their reserved classroom is disabled by an admin.

**Feature Branch**: `feature/classroom-disable-warning`  
**Related Documentation**: `CLASSROOM_DISABLE_WARNING_FEATURE.md`  
**Test Date**: November 7, 2025

---

## Test Environment Setup

### Prerequisites
- ✅ Firebase project with Cloud Functions deployed
- ✅ Test admin account with admin role
- ✅ Multiple test faculty accounts
- ✅ Test classrooms in the system
- ✅ Push notifications enabled in browser (optional)
- ✅ Development or staging environment (not production)

### Test Data Requirements
```javascript
// Test Classroom
{
  name: "TEST-101",
  capacity: 50,
  building: "CEIT Building",
  floor: 1,
  equipment: ["Projector", "Whiteboard"],
  isAvailable: true
}

// Test Faculty Users
Faculty A: faculty-a@test.com
Faculty B: faculty-b@test.com
Faculty C: faculty-c@test.com

// Test Admin User
Admin: admin@test.com
```

---

## Test Cases

### Category 1: Basic Warning Dialog Functionality

#### TC-001: Display Warning for Pending Booking
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Logged in as Faculty A
2. Create a booking request for TEST-101 for tomorrow, status: pending
3. Log out and log in as Admin

**Test Steps:**
1. Navigate to Classroom Management
2. Locate TEST-101 in the classroom list
3. Toggle the availability switch to OFF

**Expected Results:**
- ✅ Warning dialog appears immediately
- ✅ Dialog title shows "Warning: Active Reservations Found"
- ✅ Shows "1 active or upcoming reservation(s)"
- ✅ Booking details displayed: Faculty A's name, date, time, purpose
- ✅ Status badge shows "pending"
- ✅ Cancel and "Disable Classroom & Notify" buttons visible
- ✅ Classroom remains enabled (toggle not changed yet)

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

**Notes:**

---

#### TC-002: Display Warning for Approved Booking
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Booking request exists for TEST-101 (Faculty A, tomorrow)
2. Admin has approved the booking (status: approved)

**Test Steps:**
1. As Admin, go to Classroom Management
2. Locate TEST-101
3. Toggle availability switch to OFF

**Expected Results:**
- ✅ Warning dialog appears
- ✅ Shows "1 active or upcoming reservation(s)"
- ✅ Booking displayed with "approved" status badge (default variant)
- ✅ All booking details present

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-003: Display Warning for Confirmed Schedule
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Approved booking converted to schedule (status: confirmed)
2. Schedule date is tomorrow or future

**Test Steps:**
1. As Admin, attempt to disable TEST-101

**Expected Results:**
- ✅ Warning dialog shows "Confirmed Schedules (1)" section
- ✅ Schedule details displayed with "confirmed" badge
- ✅ Both sections (bookings and schedules) can coexist if both types present

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-004: Multiple Affected Reservations
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Faculty A has booking for TEST-101 tomorrow at 9:00 AM
2. Faculty B has booking for TEST-101 tomorrow at 2:00 PM
3. Faculty C has schedule for TEST-101 next week
4. All approved/confirmed

**Test Steps:**
1. As Admin, attempt to disable TEST-101

**Expected Results:**
- ✅ Dialog shows "3 active or upcoming reservation(s)"
- ✅ All three reservations listed separately
- ✅ Scrollable container if list is long
- ✅ Each reservation shows correct faculty name, date, time

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-005: No Warning for No Reservations
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. TEST-101 has no bookings or schedules
2. Or all bookings are past dates

**Test Steps:**
1. As Admin, toggle TEST-101 availability to OFF

**Expected Results:**
- ✅ No warning dialog appears
- ✅ Classroom is disabled immediately
- ✅ Success toast: "Classroom disabled successfully"
- ✅ Toggle switch updates to OFF state

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 2: Reason Field Functionality

#### TC-006: Optional Reason - Empty
**Priority**: Medium  
**Type**: Functional

**Preconditions:**
1. Warning dialog is open with affected reservations

**Test Steps:**
1. Leave reason field empty
2. Click "Disable Classroom & Notify"

**Expected Results:**
- ✅ Classroom disables successfully
- ✅ Notification sent without reason mentioned
- ✅ Message format: "The classroom '{name}' has been disabled. Please contact admin..."

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-007: Optional Reason - Provided
**Priority**: Medium  
**Type**: Functional

**Test Steps:**
1. In warning dialog, type "Maintenance scheduled for AC repair"
2. Click "Disable Classroom & Notify"

**Expected Results:**
- ✅ Classroom disables
- ✅ Notification includes reason: "...Reason: Maintenance scheduled for AC repair..."
- ✅ Success toast shows affected count

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-008: Reason Character Limit
**Priority**: Low  
**Type**: Validation

**Test Steps:**
1. Type 201 characters in reason field
2. Observe character counter

**Expected Results:**
- ✅ Field stops accepting input at 200 characters
- ✅ Counter shows "200/200 characters"
- ✅ Cannot type beyond limit

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 3: Notification System

#### TC-009: In-App Notification Delivery
**Priority**: Critical  
**Type**: Functional

**Preconditions:**
1. Faculty A has approved booking for TEST-101

**Test Steps:**
1. As Admin, disable TEST-101 with reason "Equipment malfunction"
2. Log out from Admin account
3. Log in as Faculty A
4. Check notification bell icon

**Expected Results:**
- ✅ Notification bell shows red badge with count
- ✅ Click bell to open notification center
- ✅ New notification visible with:
  - Amber warning icon
  - Title: "Classroom disabled"
  - Message includes classroom name and reason
  - "Acknowledge" button available
  - Unread styling (ring border)

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-010: Push Notification Delivery
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Faculty A has push notifications enabled
2. Browser supports push notifications
3. FCM configured properly

**Test Steps:**
1. As Admin, disable classroom with Faculty A's booking
2. Check Faculty A's device/browser for push notification

**Expected Results:**
- ✅ Push notification appears (if browser tab not focused)
- ✅ Notification title and body contain classroom info
- ✅ Clicking notification opens app to notification center

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-011: No Self-Notification to Admin
**Priority**: High  
**Type**: Security

**Preconditions:**
1. Admin has an approved booking for TEST-101
2. Logged in as that same admin

**Test Steps:**
1. Disable TEST-101 (which has admin's own booking)
2. Check admin's notification center

**Expected Results:**
- ✅ Admin does NOT receive notification
- ✅ Actor ID properly passed to notification service
- ✅ Other affected faculty still notified

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-012: Multiple Faculty, Single Notification Each
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Faculty A has 2 bookings for TEST-101 (tomorrow and next week)
2. Faculty B has 1 booking for TEST-101

**Test Steps:**
1. As Admin, disable TEST-101
2. Log in as Faculty A and check notifications
3. Log in as Faculty B and check notifications

**Expected Results:**
- ✅ Faculty A receives exactly ONE notification (not 2)
- ✅ Faculty B receives exactly ONE notification
- ✅ Both notifications have correct classroom name
- ✅ Success toast shows "2 affected reservation(s) notified"

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 4: Edge Cases

#### TC-013: Past Reservations Ignored
**Priority**: High  
**Type**: Boundary

**Preconditions:**
1. TEST-101 has booking from yesterday (status: approved)
2. TEST-101 has booking for tomorrow (status: approved)

**Test Steps:**
1. As Admin, attempt to disable TEST-101

**Expected Results:**
- ✅ Warning shows only 1 reservation (tomorrow's booking)
- ✅ Yesterday's booking NOT shown in list
- ✅ Only future reservations trigger warning

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-014: Today's Reservation Included
**Priority**: High  
**Type**: Boundary

**Preconditions:**
1. TEST-101 has booking for today at 3:00 PM
2. Current time is 10:00 AM (before the booking)

**Test Steps:**
1. Attempt to disable TEST-101

**Expected Results:**
- ✅ Today's booking IS included in warning
- ✅ Date comparison uses today at 00:00:00 as cutoff

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-015: Rejected/Cancelled Bookings Ignored
**Priority**: Medium  
**Type**: Functional

**Preconditions:**
1. TEST-101 has rejected booking for tomorrow
2. TEST-101 has cancelled schedule for next week
3. TEST-101 has approved booking for next month

**Test Steps:**
1. Attempt to disable TEST-101

**Expected Results:**
- ✅ Warning shows only 1 reservation (approved booking)
- ✅ Rejected and cancelled not included
- ✅ Only 'pending', 'approved' bookings and 'confirmed' schedules shown

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-016: Expired Bookings Ignored
**Priority**: Medium  
**Type**: Functional

**Preconditions:**
1. TEST-101 has expired booking (status: expired)
2. TEST-101 has approved booking for tomorrow

**Test Steps:**
1. Attempt to disable TEST-101

**Expected Results:**
- ✅ Only approved booking shown
- ✅ Expired booking not included

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-017: Very Long Reservation List
**Priority**: Low  
**Type**: UI/UX

**Preconditions:**
1. TEST-101 has 10+ bookings and schedules for various future dates

**Test Steps:**
1. Attempt to disable TEST-101
2. Observe dialog content

**Expected Results:**
- ✅ Dialog remains within viewport (max 80vh height)
- ✅ Lists are scrollable (max-h-48 classes applied)
- ✅ All reservations accessible via scroll
- ✅ Dialog doesn't overflow screen
- ✅ Action buttons remain visible at bottom

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 5: Cancel and Re-enable Scenarios

#### TC-018: Cancel Disable Action
**Priority**: High  
**Type**: Functional

**Preconditions:**
1. Warning dialog open with affected reservations

**Test Steps:**
1. Click "Cancel" button
2. Check classroom status

**Expected Results:**
- ✅ Dialog closes
- ✅ Classroom remains ENABLED
- ✅ Toggle switch stays in ON position
- ✅ No notifications sent to faculty
- ✅ State reset (classroomToDisable, affectedBookings cleared)

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-019: Close Dialog via X or Escape
**Priority**: Medium  
**Type**: UI/UX

**Test Steps:**
1. Open warning dialog
2. Press Escape key OR click X button

**Expected Results:**
- ✅ Dialog closes
- ✅ Same behavior as clicking Cancel
- ✅ Classroom remains enabled

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-020: Re-enable Classroom (No Warning)
**Priority**: Medium  
**Type**: Functional

**Preconditions:**
1. TEST-101 is currently disabled
2. Has active bookings

**Test Steps:**
1. Toggle TEST-101 availability to ON

**Expected Results:**
- ✅ No warning dialog appears
- ✅ Classroom enables immediately
- ✅ Success toast: "Classroom enabled successfully"
- ✅ No notifications sent

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 6: Input Validation (Classroom Form)

#### TC-021: Room Name Character Limit
**Priority**: Medium  
**Type**: Validation

**Test Steps:**
1. Open "Add Classroom" dialog
2. Type 51 characters in Room Name field

**Expected Results:**
- ✅ Field stops at 50 characters
- ✅ Counter shows "50/50 characters"
- ✅ Cannot exceed limit

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-022: Capacity Minimum Validation
**Priority**: High  
**Type**: Validation

**Test Steps:**
1. Open "Add Classroom" dialog
2. Enter "0" in Capacity field
3. Try to submit

**Expected Results:**
- ✅ Error message: "Capacity must be at least 1"
- ✅ Red border on input field
- ✅ Submit button disabled
- ✅ AlertCircle icon with error

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-023: Capacity Maximum Validation
**Priority**: High  
**Type**: Validation

**Test Steps:**
1. Open "Add Classroom" dialog
2. Enter "999" in Capacity field
3. Observe validation

**Expected Results:**
- ✅ Error message: "Capacity cannot exceed 200"
- ✅ Red border appears
- ✅ Submit button disabled
- ✅ Helper text shows "Range: 1-200"

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-024: Building Name Character Limit
**Priority**: Low  
**Type**: Validation

**Test Steps:**
1. Enter 101 characters in Building field

**Expected Results:**
- ✅ Field stops at 100 characters
- ✅ Counter shows "100/100"

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-025: Submit Button Disabled on Errors
**Priority**: High  
**Type**: Validation

**Test Steps:**
1. Open Add Classroom dialog
2. Enter valid room name
3. Enter capacity "300" (over limit)
4. Leave building empty
5. Try to click submit

**Expected Results:**
- ✅ Submit button is disabled (grayed out)
- ✅ Cannot click to submit
- ✅ Multiple validation errors shown

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 7: Network & Error Handling

#### TC-026: Network Error During Disable Check
**Priority**: High  
**Type**: Error Handling

**Test Steps:**
1. Open DevTools, set Network to Offline
2. Attempt to disable classroom with bookings
3. Observe behavior

**Expected Results:**
- ✅ Loading toast appears during check
- ✅ Error toast appears: network error message
- ✅ Classroom remains enabled
- ✅ Retry logic executes (3 attempts)

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-027: Network Error During Notification Send
**Priority**: Medium  
**Type**: Error Handling

**Test Steps:**
1. Disable classroom (warning appears)
2. Confirm disable
3. Simulate network failure during notification creation
4. Observe console logs

**Expected Results:**
- ✅ Classroom still disables successfully
- ✅ Error logged to console for failed notifications
- ✅ Process doesn't completely fail
- ✅ Partial success possible

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-028: Concurrent Admin Actions
**Priority**: Low  
**Type**: Concurrency

**Test Steps:**
1. Open two admin sessions
2. Both attempt to disable same classroom simultaneously

**Expected Results:**
- ✅ Both see warning dialog
- ✅ First to confirm disables classroom
- ✅ Second receives updated state via real-time listener
- ✅ No duplicate notifications sent

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

### Category 8: Accessibility & Responsiveness

#### TC-029: Mobile Responsive - Warning Dialog
**Priority**: Medium  
**Type**: UI/UX

**Test Steps:**
1. Open app on mobile viewport (375px width)
2. Trigger warning dialog with multiple reservations

**Expected Results:**
- ✅ Dialog fits within mobile viewport
- ✅ Content scrollable on small screens
- ✅ Buttons stack vertically if needed
- ✅ Text remains readable
- ✅ Touch targets adequate size (44px minimum)

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

#### TC-030: Keyboard Navigation
**Priority**: Medium  
**Type**: Accessibility

**Test Steps:**
1. Open warning dialog
2. Use Tab key to navigate
3. Use Enter/Space to activate buttons
4. Use Escape to close

**Expected Results:**
- ✅ Tab cycles through interactive elements
- ✅ Focus visible on all elements
- ✅ Enter/Space activates buttons
- ✅ Escape closes dialog
- ✅ Focus returns to trigger element on close

**Actual Results:** _To be filled during testing_

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Blocked

---

## Summary Statistics

**Total Test Cases**: 30  
**Critical Priority**: 1  
**High Priority**: 15  
**Medium Priority**: 10  
**Low Priority**: 4  

**Categories:**
- Basic Warning Dialog: 5 tests
- Reason Field: 3 tests
- Notification System: 4 tests
- Edge Cases: 5 tests
- Cancel/Re-enable: 3 tests
- Input Validation: 5 tests
- Network/Error Handling: 3 tests
- Accessibility: 2 tests

---

## Test Execution Checklist

### Before Testing
- [ ] Firebase Cloud Functions deployed
- [ ] Test data created (classrooms, users, bookings)
- [ ] Push notifications configured
- [ ] Browser notifications permission granted
- [ ] Development environment running

### During Testing
- [ ] Record actual results for each test case
- [ ] Screenshot any failures
- [ ] Note unexpected behaviors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS Safari, Chrome Mobile)

### After Testing
- [ ] Calculate pass/fail rate
- [ ] Document all bugs found
- [ ] Create bug reports with reproduction steps
- [ ] Update feature documentation if needed
- [ ] Recommend production readiness

---

## Bug Report Template

```markdown
**Bug ID**: BUG-XXX
**Test Case**: TC-XXX
**Severity**: Critical / High / Medium / Low
**Status**: Open / In Progress / Fixed / Won't Fix

**Description**: Brief description of the issue

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen

**Actual Result**: What actually happened

**Screenshots**: [Attach if applicable]

**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- Branch: feature/classroom-disable-warning

**Additional Notes**: Any other relevant information
```

---

## Regression Testing

After fixes are applied, re-run:
- All failed test cases
- All high and critical priority tests
- Any related test cases that might be affected

---

## Sign-off

**Tested By**: _________________  
**Date**: _________________  
**Overall Status**: ⬜ Approved for Production / ⬜ Requires Fixes  
**Notes**: _________________

---

*Last Updated: November 7, 2025*
