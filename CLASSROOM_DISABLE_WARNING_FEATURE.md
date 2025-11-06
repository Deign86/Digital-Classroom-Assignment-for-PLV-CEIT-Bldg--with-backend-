# Classroom Disable Warning Feature

## Overview
This feature addresses the edge case where an admin attempts to disable a classroom that has active or upcoming reservations. It provides a comprehensive warning system to ensure affected faculty members are properly notified.

## Problem Statement
Previously, when an admin disabled a classroom, faculty members with existing reservations for that classroom would not be notified, leading to:
- Confusion on reservation day
- Wasted time preparing for classes
- Poor communication between admin and faculty
- No visibility into the reason for disruption

## Solution

### 1. **Automatic Detection**
When an admin attempts to disable a classroom (toggle off), the system automatically:
- Queries all booking requests with status 'approved' or 'pending'
- Queries all schedules with status 'confirmed'
- Filters for reservations from today onwards
- Identifies all affected reservations for that specific classroom

### 2. **Warning Modal**
If active/upcoming reservations are found, a comprehensive warning dialog appears showing:
- **Total count** of affected reservations
- **Detailed list** of affected booking requests with:
  - Faculty name
  - Date (formatted)
  - Time slot
  - Purpose
  - Status badge (approved/pending)
- **Detailed list** of affected schedules with:
  - Faculty name
  - Date (formatted)
  - Time slot
  - Purpose
  - Status badge (confirmed)
- **Optional reason field** (max 200 characters) where admin can provide context
- **Information box** explaining what happens next

### 3. **Notification System**
Upon confirmation, the system:
- Disables the classroom
- Identifies all unique faculty IDs from affected bookings and schedules
- Sends individual notifications to each affected faculty member
- Includes the admin's reason (if provided) in the notification message
- Excludes the admin from receiving a notification (self-notification prevention)
- Shows success toast with count of affected reservations

### 4. **Faculty Experience**
Faculty members receive:
- **In-app notification** with type 'classroom_disabled'
- **Push notification** (if enabled) via Firebase Cloud Messaging
- **Clear message** including:
  - Classroom name
  - Reason for disabling (if provided)
  - Instruction to contact admin
- **Visual indicator** in notification center (amber warning icon)

## Technical Implementation

### Changes Made

#### 1. **NotificationType Extension** (`lib/notificationService.ts`)
```typescript
export type NotificationType = 'approved' | 'rejected' | 'info' | 'cancelled' | 'signup' | 'classroom_disabled';
```

#### 2. **ClassroomManagement Component** (`components/ClassroomManagement.tsx`)

**New State Variables:**
- `disableWarningOpen`: Controls warning dialog visibility
- `classroomToDisable`: Stores classroom being disabled
- `affectedBookings`: Array of affected booking requests
- `affectedSchedules`: Array of affected schedules
- `disableReason`: Optional reason text from admin

**New Functions:**
- `handleAvailabilityToggle()`: Intercepts disable action, checks for conflicts
- `performAvailabilityToggle()`: Performs actual disable operation and sends notifications
- `handleDisableConfirm()`: Confirms disable action from warning dialog
- `handleDisableCancel()`: Cancels disable action and resets state

**New UI Components:**
- Disable Warning Dialog with:
  - Scrollable lists of affected reservations
  - Textarea for optional reason
  - Information box with next steps
  - Action buttons (Cancel / Disable & Notify)

#### 3. **NotificationCenter Component** (`components/NotificationCenter.tsx`)
- Added `Warning` icon import
- Added case for 'classroom_disabled' notification type
- Displays amber warning icon for classroom disable notifications

### Data Flow

```
Admin toggles classroom OFF
         ↓
handleAvailabilityToggle() called
         ↓
Query all bookings & schedules
         ↓
Filter for affected reservations
         ↓
    ┌────────────┐
    │ Found any? │
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │YES        │NO
    ↓           ↓
Show Warning  Disable
Dialog        Immediately
    │
    ↓
Admin reviews
& adds reason
    │
    ↓
Confirms action
    │
    ↓
performAvailabilityToggle()
    │
    ├─→ Update classroom status
    │
    └─→ Send notifications to faculty
         │
         ├─→ In-app notification
         │
         └─→ Push notification (if enabled)
```

## Usage

### For Admins:
1. Navigate to Classroom Management
2. Find the classroom to disable
3. Toggle the availability switch OFF
4. **If no active reservations:**
   - Classroom disables immediately
   - Success toast appears
5. **If active reservations exist:**
   - Warning dialog appears
   - Review list of affected reservations
   - Optionally provide a reason
   - Click "Disable Classroom & Notify"
   - All affected faculty are notified
   - Success toast shows count of notifications sent

### For Faculty:
1. Receive notification when classroom is disabled
2. Check notification center for details
3. Contact admin regarding affected reservations
4. Admin can help find alternative classroom or reschedule

## Edge Cases Handled

✅ **Multiple reservations same day**: All shown in list
✅ **Past reservations**: Ignored (only from today onwards)
✅ **Cancelled/rejected bookings**: Not included in warning
✅ **Same faculty multiple bookings**: Single notification sent
✅ **Both bookings and schedules**: Both types shown separately
✅ **Re-enabling classroom**: No warning needed, happens immediately
✅ **Network errors**: Handled with retry logic via `executeWithNetworkHandling`
✅ **Long lists**: Scrollable containers prevent overflow
✅ **Character limits**: 200-char max on reason field

## Security Considerations

- ✅ Notifications use Cloud Functions to prevent self-notifications
- ✅ Only admins can disable classrooms (enforced in Firestore rules)
- ✅ Faculty can only see their own notifications
- ✅ Input sanitization on reason field (via `sanitizeText` utility)
- ✅ Actor ID passed to notification service to exclude admin

## Future Enhancements

**Potential improvements:**
1. Allow admin to individually notify specific faculty
2. Provide "Suggest Alternative" feature in notification
3. Auto-cancel affected bookings with option to reschedule
4. Email notifications in addition to in-app/push
5. Audit log of classroom disable actions
6. Bulk operations for multiple classrooms
7. Scheduled disable/enable (maintenance windows)

## Testing Recommendations

### Manual Testing:
1. ✅ Create upcoming booking request (approved status)
2. ✅ Create confirmed schedule for same classroom
3. ✅ Attempt to disable the classroom
4. ✅ Verify warning dialog appears with both reservations
5. ✅ Add optional reason and confirm
6. ✅ Check faculty notification center for notification
7. ✅ Verify push notification received (if enabled)
8. ✅ Try disabling classroom with no reservations
9. ✅ Verify re-enabling shows no warning

### Edge Case Testing:
- [ ] Past reservations (should be ignored)
- [ ] Same faculty multiple reservations (single notification)
- [ ] Very long reservation lists (scrolling works)
- [ ] Network interruption during disable
- [ ] Concurrent admin actions
- [ ] Character limit on reason field

## Dependencies

- Firebase Firestore (booking/schedule queries)
- Firebase Cloud Functions (notification service)
- Firebase Cloud Messaging (push notifications)
- Shadcn/ui Dialog, Textarea, Badge components
- Lucide React icons
- Phosphor icons (Warning icon)

## Files Modified

1. `lib/notificationService.ts` - Added 'classroom_disabled' type
2. `components/ClassroomManagement.tsx` - Main implementation
3. `components/NotificationCenter.tsx` - UI for new notification type
4. `CLASSROOM_DISABLE_WARNING_FEATURE.md` - This documentation

## Branch Information

**Branch Name:** `feature/classroom-disable-warning`

**Based On:** `master`

**Status:** ✅ Ready for testing

---

*Last Updated: November 7, 2025*
