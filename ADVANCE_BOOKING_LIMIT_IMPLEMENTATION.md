# Advance Booking Limit Implementation

## Overview
This feature prevents users from making classroom reservations more than 2 months in advance, addressing the issue where bookings could be made 2 years ahead.

## Changes Made

### 1. RoomBooking Component (`components/RoomBooking.tsx`)
- **Added `maxDate` calculation**: Automatically calculates a date 2 months from today
- **Updated validation**: Added checks to ensure selected date doesn't exceed `maxDate`
- **Enhanced error messages**: Clear message "Bookings can only be made up to 2 months in advance"
- **Native date input**: Added `max={maxDate}` attribute for small phone screens
- **Calendar popover**: Passes `max={maxDate}` to Calendar component

### 2. Calendar Component (`components/ui/calendar.tsx`)
- **Added `max` prop**: New optional prop to set maximum selectable date
- **Updated DayPicker config**: Disables dates after `max` date using `disabled={{ after: toDate }}`
- **Backward compatible**: Existing usage without `max` prop continues to work

## Technical Details

### Date Calculation
```typescript
const maxDate = (() => {
  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + 2);
  const year = future.getFullYear();
  const month = String(future.getMonth() + 1).padStart(2, '0');
  const day = String(future.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
})();
```

### Validation Points
1. **Form validation** (validate function): Checks `formData.date > maxDate`
2. **Native input onChange**: Validates on every date change
3. **Calendar onSelect**: Validates when date is picked from calendar
4. **Submit time**: Final validation before booking request is created

## Testing Guide

### Manual Testing Steps

#### Test 1: Calendar Date Selection (Desktop/Tablet)
1. Open the Room Booking form
2. Click on the Date field to open the calendar popover
3. **Expected**: Dates beyond 2 months from today should be disabled/grayed out
4. Try to click a date beyond 2 months
5. **Expected**: Should not be selectable

#### Test 2: Native Date Input (Mobile)
1. Open the Room Booking form on a small phone (320-425px width) or use browser dev tools
2. Click on the Date field (should show native date picker)
3. Try to select a date beyond 2 months
4. **Expected**: Browser should prevent selection (depends on browser implementation)
5. If you manually type a date beyond 2 months and tab away
6. **Expected**: Error message "Bookings can only be made up to 2 months in advance"

#### Test 3: Form Validation
1. Fill out all booking form fields
2. Select a date exactly 2 months from today
3. **Expected**: Should pass validation (no error)
4. Select a date 2 months + 1 day from today
5. **Expected**: Error message should appear: "Bookings can only be made up to 2 months in advance"

#### Test 4: Submit Prevention
1. Fill out all booking form fields correctly
2. Using browser dev tools, modify the date value to be beyond 2 months
3. Try to submit the form
4. **Expected**: Validation should catch it and prevent submission with error message

#### Test 5: Book Similar Feature
1. Find an existing booking with "Book Similar" button
2. Click "Book Similar"
3. Form should pre-fill with the booking's details
4. Change the date to something beyond 2 months
5. **Expected**: Should show validation error

#### Test 6: Edge Cases
- **Today**: Should be allowed
- **Today + 60 days**: Should be allowed (approximately 2 months)
- **Today + 61 days**: Depends on month lengths, test to verify
- **Today + 65 days**: Should be blocked
- **Today + 2 years**: Should be blocked (fixes original issue)

### Automated Testing (To Be Implemented)

```typescript
describe('Advance Booking Limit', () => {
  it('should prevent bookings more than 2 months in advance', () => {
    // Test implementation
  });

  it('should allow bookings up to 2 months in advance', () => {
    // Test implementation
  });

  it('should show appropriate error message for dates beyond limit', () => {
    // Test implementation
  });
});
```

## User Impact

### Before
- Users could book classrooms years in advance
- No restriction on advance booking timeframe
- Potential for resource hogging and scheduling conflicts

### After
- Users can only book up to 2 months ahead
- Clear feedback when attempting to book beyond limit
- More reasonable booking window for classroom management

## Configuration

The 2-month limit is currently hardcoded in `RoomBooking.tsx`. To change this:

1. Locate the `maxDate` calculation (around line 78)
2. Modify `future.setMonth(future.getMonth() + 2)` to desired number of months
3. Update error messages to reflect new limit

### Future Enhancement Suggestion
Consider moving this to a configuration file or Firebase config for easier management:
```typescript
// config/bookingRules.ts
export const ADVANCE_BOOKING_MONTHS = 2;
```

## Related Files
- `components/RoomBooking.tsx` - Main booking form with validation
- `components/ui/calendar.tsx` - Calendar component with date restrictions
- `utils/timeUtils.ts` - Time/date utility functions (not modified)
- `lib/firebaseService.ts` - Service layer (no changes needed as validation is client-side)

## Security Considerations

### Client-Side Validation
- Current implementation is client-side only
- Sufficient for UX but not security-critical
- Malicious users could bypass by modifying requests

### Server-Side Validation (Recommended Enhancement)
To add server-side enforcement:

1. **Firestore Security Rules** (`firestore.rules`):
```javascript
match /bookingRequests/{requestId} {
  allow create: if request.auth != null 
    && request.resource.data.date >= getDate()
    && request.resource.data.date <= getDatePlusMonths(2);
}
```

2. **Cloud Function Validation**:
```typescript
// In booking request creation function
const maxDate = new Date();
maxDate.setMonth(maxDate.getMonth() + 2);
if (new Date(bookingData.date) > maxDate) {
  throw new functions.https.HttpsError(
    'invalid-argument',
    'Bookings cannot be made more than 2 months in advance'
  );
}
```

## Deployment Checklist
- [x] Update RoomBooking component
- [x] Update Calendar component
- [x] Add validation logic
- [x] Update error messages
- [x] Commit changes to feature branch
- [ ] Manual testing (all scenarios above)
- [ ] Update Firestore rules (optional but recommended)
- [ ] Add server-side validation (optional but recommended)
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor for issues

## Known Limitations
1. **Month Length Variation**: A 2-month calculation from Jan 31 may result in Mar 31 or Apr 2 depending on implementation. Current implementation uses JavaScript's native date handling.
2. **Timezone**: All dates use the user's local timezone. Consider server timezone for consistency if needed.
3. **No Server-Side Enforcement**: Currently only enforced on client. Add Firestore rules for complete security.

## Support
For questions or issues with this feature:
- Check validation error messages in the form
- Review browser console for any JavaScript errors
- Verify date format is YYYY-MM-DD in form data
- Check that Calendar component is receiving max prop correctly
