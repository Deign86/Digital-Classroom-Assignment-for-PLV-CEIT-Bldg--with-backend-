# Faculty Cancel Approved Reservation Feature

## Overview
This feature allows faculty members to cancel their own approved reservations with a mandatory reason. When faculty cancel their reservations, all administrators are notified with the cancellation reason.

## Implementation Date
Implemented: November 7, 2025

## Feature Description

### Faculty Side
- Faculty can view their approved reservations in the "Approved" tab of their schedule
- Each approved reservation has a checkbox for selection
- Faculty can select multiple approved reservations and cancel them in bulk
- A mandatory cancellation reason must be provided (max 500 characters)
- The system prevents cancellation of reservations that have already started or passed

### Admin Side
- Admins receive a unique notification type `'faculty_cancelled'` when faculty cancel their own reservations
- The notification includes:
  - Faculty member's name
  - Classroom name
  - Date and time of the cancelled reservation
  - The reason provided by the faculty member
- The notification appears in the admin's notification center with a purple icon
- Admin feedback field shows the faculty's cancellation reason

## Technical Implementation

### 1. Notification Type Addition
**File:** `lib/notificationService.ts`
```typescript
export type NotificationType = 'approved' | 'rejected' | 'info' | 'cancelled' | 'faculty_cancelled' | 'signup' | 'classroom_disabled';
```

### 2. Cloud Function Update
**File:** `plv-classroom-assignment-functions/src/index.ts`

The `cancelApprovedBooking` callable function was modified to:
- Detect whether the caller is the faculty member (owner) or an admin
- If faculty cancels their own reservation:
  - Notify all admins with type `'faculty_cancelled'`
  - Include the faculty member's name in the notification message
  - Include the cancellation reason in the notification
- If admin cancels the reservation:
  - Notify the faculty member with type `'cancelled'`
  - Include the admin's name in the notification message

**Logic Flow:**
```typescript
if (callerUid && callerUid === data.facultyId) {
  // Faculty cancelled their own booking - notify all admins
  const facultyName = (callerData && (callerData.name || callerData.displayName)) 
    ? (callerData.name || callerData.displayName) 
    : 'A faculty member';
  const message = `${facultyName} cancelled their approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime}. Reason: ${feedback}`;
  
  // Get all admin users and send notifications
  const adminsSnap = await admin.firestore().collection('users').where('role', '==', 'admin').get();
  await Promise.all(
    adminsSnap.docs.map((adminDoc) => 
      persistAndSendNotification(adminDoc.id, 'faculty_cancelled', message, { 
        bookingRequestId: null, 
        adminFeedback: feedback, 
        actorId: callerUid 
      })
    )
  );
} else {
  // Admin cancelled the booking - notify the faculty member
  const adminName = (callerData && (callerData.name || callerData.displayName)) 
    ? (callerData.name || callerData.displayName) 
    : 'an administrator';
  const message = `Admin ${adminName} cancelled your approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime}.`;
  
  await persistAndSendNotification(data.facultyId, 'cancelled', message, { 
    bookingRequestId: null, 
    adminFeedback: feedback, 
    actorId: callerUid 
  });
}
```

### 3. UI Updates

#### NotificationCenter Component
**File:** `components/NotificationCenter.tsx`

Added handling for the new `'faculty_cancelled'` notification type:
- Purple XCircle icon to distinguish from admin-cancelled reservations (orange)
- Title: "Faculty cancelled reservation"
- Displays the full notification message including the faculty member's name and reason

#### FacultySchedule Component
**File:** `components/FacultySchedule.tsx`

Updated the bulk cancel dialog text to reflect faculty perspective:
- Dialog description: "Please provide a reason for cancelling your approved reservation(s). This will be sent to the administrators."
- Placeholder text: "Explain why you need to cancel your reservation(s)"

The existing UI already included:
- Checkbox selection for multiple approved reservations
- Bulk cancel button with count of selected items
- Textarea for cancellation reason with character counter (500 max)
- Individual reservation processing indicators
- Success/error toast notifications

## Security & Validation

### Permission Checks
The Cloud Function verifies:
1. User must be authenticated
2. Caller must be either the reservation owner (faculty) OR an admin
3. Reservation cannot have already started or passed

### Data Validation
- `scheduleId` must be provided and be a valid string
- `adminFeedback` (cancellation reason) must be provided and non-empty
- Schedule document must exist in Firestore
- Start time is checked against current time to prevent past booking cancellations

### Notification Deduplication
The `persistAndSendNotification` helper includes:
- Actor-exclusion: Users don't receive notifications for their own actions
- Time-window deduplication: Prevents duplicate notifications within 2 minutes
- Type and booking request ID matching for accurate deduplication

## User Experience

### Faculty Workflow
1. Faculty navigates to "Approved" tab in their schedule
2. Selects one or more approved reservations using checkboxes
3. Clicks "Cancel Selected (X)" button
4. Dialog appears requesting cancellation reason
5. Faculty types reason (required, max 500 characters)
6. Clicks "Confirm Cancel" button
7. System processes each cancellation with loading indicators
8. Success toast appears: "Successfully cancelled X reservation(s)."
9. Cancelled reservations move to "Cancelled" tab

### Admin Experience
1. Admin receives push notification (if enabled) and bell notification
2. Opens notification center
3. Sees purple icon with "Faculty cancelled reservation" title
4. Notification message includes:
   - Faculty member's name
   - Classroom, date, and time details
   - The faculty member's cancellation reason
5. Admin can acknowledge the notification
6. Admin can view full details in their cancelled reservations view

## Toast Notifications

### Success Messages
- Faculty: "Successfully cancelled {count} reservation(s)."
- Shows count of successfully cancelled reservations
- Announced to screen readers as 'polite'

### Error Messages
- "Failed to cancel schedule for request {id}"
- "Cancelled {success} reservation(s). {failed} failed."
- Logged to console for debugging

## Accessibility Features
- All dialogs have proper ARIA labels
- Checkbox selections include screen reader labels
- Loading states announced to screen readers
- Error messages have `role="alert"` for immediate announcement
- Character counter visible for reason textarea
- Keyboard navigation fully supported

## Related Components & Services

### Frontend
- `components/FacultySchedule.tsx` - Faculty reservation management UI
- `components/NotificationCenter.tsx` - Notification display
- `lib/notificationService.ts` - Notification type definitions
- `lib/firebaseService.ts` - Schedule service cancellation method

### Backend
- `plv-classroom-assignment-functions/src/index.ts` - Cloud Functions
  - `cancelApprovedBooking` callable
  - `persistAndSendNotification` helper

### Database
- `schedules` collection - Reservation records
- `bookingRequests` collection - Request records
- `notifications` collection - Notification records
- `pushTokens` collection - FCM tokens for push notifications

## Testing Considerations

### Unit Tests Needed
1. Faculty can cancel their own approved reservations
2. Cancellation reason is required (validation)
3. Reason cannot exceed 500 characters
4. Cannot cancel reservations that have started/passed
5. Admin notification is created with type `'faculty_cancelled'`
6. Multiple admins all receive notifications
7. Faculty does not receive self-notification
8. Schedule status updates to 'cancelled'
9. Booking request status updates to 'cancelled'
10. Admin feedback field contains the faculty reason

### Integration Tests Needed
1. End-to-end faculty cancellation flow
2. Real-time notification delivery to admins
3. Push notification delivery (if enabled)
4. Bulk cancellation of multiple reservations
5. Error handling for network failures
6. Concurrent cancellations by multiple faculty members

### Manual Testing Checklist
- [ ] Faculty can see approved reservations
- [ ] Faculty can select multiple reservations
- [ ] Cancel button shows count of selected items
- [ ] Dialog opens with proper text
- [ ] Reason field validates correctly
- [ ] Character counter updates in real-time
- [ ] Cannot submit without reason
- [ ] Loading indicators appear during processing
- [ ] Success toast shows correct count
- [ ] Cancelled items move to Cancelled tab
- [ ] Admin receives notification
- [ ] Notification has purple icon
- [ ] Notification message includes all details
- [ ] Push notification sent (if admin has enabled)
- [ ] Cannot cancel past reservations

## Future Enhancements

### Potential Improvements
1. **Cancellation History** - Track who cancelled what and when
2. **Cancellation Analytics** - Report on cancellation patterns
3. **Auto-rebook Suggestions** - Suggest alternative times when cancelling
4. **Cancellation Penalties** - Track frequent cancellations for accountability
5. **Approval Required** - Option to require admin approval for faculty cancellations
6. **Cancellation Deadline** - Set minimum notice period before reservation start
7. **Email Notifications** - Send email in addition to in-app notification
8. **Cancellation Templates** - Common reasons as quick-select options
9. **Partial Cancellation** - Cancel only part of a recurring reservation

## Deployment Notes

### Prerequisites
- Firebase Cloud Functions deployed
- Notification service operational
- Push notification service configured (optional but recommended)

### Deployment Steps
1. Deploy updated Cloud Functions:
   ```bash
   cd plv-classroom-assignment-functions
   npm run build
   firebase deploy --only functions:cancelApprovedBooking
   ```

2. Deploy frontend updates:
   ```bash
   npm run build
   # Deploy to hosting (Vercel/Firebase Hosting)
   ```

3. Verify notifications work:
   - Test as faculty user
   - Cancel an approved reservation
   - Verify admin receives notification
   - Check notification type is 'faculty_cancelled'

### Rollback Plan
If issues occur:
1. Revert Cloud Function to previous version via Firebase Console
2. Revert frontend deployment
3. Check Firebase logs for error details
4. Fix issues and redeploy

## Documentation References
- Firebase Cloud Functions: https://firebase.google.com/docs/functions
- Firestore Security Rules: `firestore.rules`
- Copilot Instructions: `.github/copilot-instructions.md`
- System Features: `SYSTEM_FEATURES_COMPLETE_LIST.md`

## Change Log

### Version 1.0 - November 7, 2025
- Initial implementation
- Added `'faculty_cancelled'` notification type
- Modified `cancelApprovedBooking` Cloud Function
- Updated NotificationCenter UI
- Updated FacultySchedule dialog text
- Created comprehensive documentation

## Support & Maintenance
For questions or issues related to this feature:
1. Check Firebase logs for function errors
2. Review notification service logs
3. Verify Firestore rules allow proper access
4. Test with different faculty and admin accounts
5. Check browser console for client-side errors
