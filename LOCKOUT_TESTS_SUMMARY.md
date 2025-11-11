# Account Lockout Tests Summary

## Overview
Two comprehensive test files have been created to cover all lockout features and contextual modal behavior in the Digital Classroom Assignment System.

## Test Files Created

### 1. `src/test/components/AccountLockout.test.tsx` ✅
**Status:** 25/25 tests passing

Tests the **LoginForm component** lockout behavior and user-facing lockout messages.

#### Test Coverage:

**Failed Login Attempts Lockout (5 tests)**
- ✅ Prevents login when account is locked due to failed attempts
- ✅ Shows default locked message when no specific message provided
- ✅ Displays remaining attempts warning message
- ✅ Allows login attempts when account is not locked
- ✅ Handles transition from unlocked to locked state

**Admin Lock Scenarios (3 tests)**
- ✅ Prevents login when account is locked by admin
- ✅ Displays admin lock message with custom reason
- ✅ Handles admin lock without specific reason

**Realtime Lock Scenarios (2 tests)**
- ✅ Handles realtime lock detection
- ✅ Prevents form submission during realtime lock

**Lock State Persistence (3 tests)**
- ✅ Persists lock state in sessionStorage
- ✅ Clears lock state from sessionStorage on successful unlock
- ✅ Maintains lock state across component remounts

**Multiple Lock Scenarios (3 tests)**
- ✅ Handles account locked due to failed attempts with time-based unlock
- ✅ Handles account locked by admin (permanent until admin unlocks)
- ✅ Differentiates between temporary and permanent locks in UI

**Lock Message Variations (3 tests)**
- ✅ Displays lock message with attempts remaining info
- ✅ Displays lock message with unlock time
- ✅ Displays admin lock with contact info

**Edge Cases (4 tests)**
- ✅ Handles empty lock message gracefully
- ✅ Handles null lock message
- ✅ Handles very long lock message
- ✅ Handles special characters in lock message

**Accessibility (2 tests)**
- ✅ Disables login button when account is locked
- ✅ Makes lock message visible to screen readers

---

### 2. `src/test/components/AccountLockoutModal.test.tsx`
**Status:** Needs mock fixes (33 tests implemented)

Tests the **App.tsx AlertDialog component** showing contextual lock modals with different styling and content based on lock reason.

#### Test Coverage:

**Failed Attempts Lock Modal (4 tests)**
- Shows failed attempts modal with countdown timer
- Displays time remaining for failed attempts lock
- Shows orange/warning styling for failed attempts
- Provides password reset option in failed attempts modal

**Admin Lock Modal (5 tests)**
- Shows admin lock modal with custom reason
- Shows red/error styling for admin lock
- Does not show countdown timer for admin lock
- Emphasizes permanent nature of admin lock
- Provides admin contact action for admin lock

**Realtime Lock Modal (3 tests)**
- Shows realtime lock modal when locked while logged in
- Shows amber/warning styling for realtime lock
- Lists possible reasons for realtime lock

**Modal Actions and Interactions (4 tests)**
- Has Contact Administrator button that opens email
- Has Dismiss button that clears sessionStorage
- Prevents modal from auto-closing on ESC or outside click
- Shows both action buttons in all lock types

**Modal Content Variations (3 tests)**
- Shows different title for each lock reason
- Shows different icons for each lock reason
- Shows contextual help text for each lock type

**Modal State Management (4 tests)**
- Shows modal immediately when accountLocked flag is set
- Maintains modal state across re-renders
- Does not show modal when no lock flag is set
- Handles missing lock reason gracefully

**Countdown Timer Behavior (3 tests)**
- Updates countdown timer every second for failed attempts
- Shows formatted time remaining with minutes and seconds
- Does not show timer for admin or realtime locks

**Accessibility (3 tests)**
- Has proper ARIA labels on modal
- Has accessible buttons with proper labels
- Maintains focus within modal

**Edge Cases (4 tests)**
- Handles malformed lockedUntil timestamp
- Handles expired lock time gracefully
- Handles very long lock message
- Handles special characters in lock message

---

## Lock Types Tested

### 1. Failed Attempts Lock (`accountLockReason: 'failed_attempts'`)
**Characteristics:**
- ⏱️ **Temporary** - Auto-expires after 30 minutes
- 🟠 **Orange/Warning Styling** - Time remaining display
- 🔄 **Countdown Timer** - Shows minutes and seconds remaining
- 💡 **Actions:** Wait for expiry, use forgot password, contact admin

**Example Messages:**
- "Account locked due to too many failed login attempts"
- "⚠️ Warning: 2 attempts remaining. Account will be locked after 5 failed attempts."
- "Account locked for 30 minutes due to failed login attempts"

### 2. Admin Lock (`accountLockReason: 'admin_lock'`)
**Characteristics:**
- 🔒 **Permanent** - Requires admin to manually unlock
- 🔴 **Red/Error Styling** - Critical blocking message
- ❌ **No Countdown Timer** - Manual unlock required
- 📋 **Custom Reason** - Admin can provide specific explanation
- 💡 **Actions:** Contact administrator for unlock

**Example Messages:**
- "Account disabled by administrator. Reason: Policy violation."
- "Account permanently locked by administrator"
- "This account has been disabled by an administrator."

### 3. Realtime Lock (`accountLockReason: 'realtime_lock'`)
**Characteristics:**
- 🔄 **Dynamic** - Detected while user is logged in
- 🟡 **Amber/Warning Styling** - Security alert
- 🚨 **Immediate Logout** - User is signed out automatically
- ⚠️ **Multiple Possible Reasons:**
  - Security policy changes
  - Suspicious activity detected
  - Administrative action
- 💡 **Actions:** Contact administrator for assistance

**Example Messages:**
- "Your account has been locked for security reasons"
- "Your account has been locked and you were signed out for security reasons"

---

## Session Storage Keys

The tests verify proper handling of these sessionStorage keys:

- `accountLocked` - Boolean string ('true' / null)
- `accountLockedMessage` - Lock message string
- `accountLockReason` - Lock type ('failed_attempts' / 'admin_lock' / 'realtime_lock')
- `accountLockedUntil` - ISO timestamp string (for failed_attempts only)

---

## Modal UI Components Tested

### AlertDialog Structure
```
<AlertDialog>
  <AlertDialogHeader>
    <AlertDialogTitle>
      🔒 [Lock Type-Specific Title]
    </AlertDialogTitle>
  </AlertDialogHeader>
  
  <AlertDialogDescription>
    [Contextual content based on lock reason]
    - Lock explanation
    - Reason/message display
    - Time remaining (if applicable)
    - Action items list
  </AlertDialogDescription>
  
  <AlertDialogFooter>
    <Button variant="outline">Contact Administrator</Button>
    <AlertDialogAction variant="destructive">Dismiss</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

### Color Schemes by Lock Type
- **Failed Attempts:** `text-orange-600`, `bg-orange-50`, `border-orange-200`
- **Admin Lock:** `text-red-600`, `bg-red-50`, `border-red-200`
- **Realtime Lock:** `text-amber-600`, `bg-amber-50`, `border-amber-200`

---

## Running the Tests

### Run all lockout tests:
```bash
npm test -- AccountLockout
```

### Run specific test file:
```bash
# LoginForm lockout tests
npm test -- AccountLockout.test.tsx

# Modal contextual behavior tests  
npm test -- AccountLockoutModal.test.tsx
```

### Run in watch mode:
```bash
npm test -- AccountLockout --watch
```

---

## Test Patterns Used

### 1. SessionStorage Manipulation
```typescript
beforeEach(() => {
  sessionStorage.clear();
});

sessionStorage.setItem('accountLocked', 'true');
sessionStorage.setItem('accountLockReason', 'failed_attempts');
sessionStorage.setItem('accountLockedMessage', 'Custom message');
```

### 2. Component Rendering with Lock Props
```typescript
render(
  <LoginForm
    onLogin={mockOnLogin}
    onSignup={mockOnSignup}
    users={mockUsers}
    isLocked={true}
    accountLockedMessage="Account locked"
  />
);
```

### 3. Modal Visibility Testing
```typescript
await waitFor(() => {
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});
```

### 4. Timer Testing (Fake Timers)
```typescript
vi.useFakeTimers();
vi.advanceTimersByTime(1000); // Advance 1 second
await waitFor(() => {
  expect(screen.getByText(/4 minutes 4[0-9] seconds/i)).toBeInTheDocument();
});
vi.useRealTimers();
```

---

## Key Features Tested

### ✅ Security Features
- Login button disabled when locked
- Form submission prevented during lock
- Proper error messaging
- Contact administrator functionality

### ✅ User Experience
- Clear lock messages for each scenario
- Visual styling differences (colors, icons)
- Countdown timer for temporary locks
- Password reset option for failed attempts
- Help text and action items

### ✅ State Management
- SessionStorage persistence
- Component re-render handling
- Lock state transitions
- Modal open/close behavior

### ✅ Accessibility
- ARIA labels on dialogs
- Proper button labeling
- Focus management
- Screen reader compatibility

### ✅ Edge Cases
- Empty/null messages
- Malformed timestamps
- Very long messages
- Special characters
- Expired lock times

---

## Integration with Existing Features

These tests complement the existing lockout implementation:

1. **Cloud Functions:** `trackFailedLogin`, `resetFailedLogins`
2. **Firestore Rules:** Role-based access, lock status enforcement
3. **Real-time Listeners:** User document lock status monitoring
4. **Session Management:** Idle timeout integration

---

## Next Steps

### To complete AccountLockoutModal.test.tsx:
1. ✅ Add `onAuthStateChange` mock to authService
2. ✅ Add `checkConflicts` mock to bookingRequestService
3. Run tests again to verify all 33 tests pass

### Future Enhancements:
- Integration tests combining App + LoginForm
- E2E tests for full lockout workflow
- Performance tests for countdown timer
- Cross-browser compatibility tests

---

## Related Documentation

- `BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md` - Overall lockout system architecture
- `LOCK_HANDLING_COMPLETE_FLOW.md` - Lock detection and handling flows
- `firestore.rules` - Security rules for lock enforcement
- `App.tsx` (lines 1700-1850) - Modal implementation
- `LoginForm.tsx` (lines 500-550) - Lock UI rendering

---

## Test Statistics

- **Total Tests:** 58 (25 + 33)
- **Passing:** 25 (LoginForm tests)
- **Pending:** 33 (Modal tests - mock fixes applied)
- **Coverage Areas:** 11 distinct test categories
- **Lock Scenarios:** 3 types (failed_attempts, admin_lock, realtime_lock)
- **Edge Cases:** 8 specific scenarios tested

---

**Last Updated:** {{date}}
**Test Framework:** Vitest + React Testing Library
**Component:** LoginForm, App (AlertDialog)
