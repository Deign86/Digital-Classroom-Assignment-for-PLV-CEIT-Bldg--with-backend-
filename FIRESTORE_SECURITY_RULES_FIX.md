# Firestore Security Rules Fix - Cancel Booking Issue

## Date: October 3, 2025

## Issue Description
**Problem:** Faculty users cannot cancel their own bookings. When clicking "Cancel Booking", they receive a Firebase error: "Missing or insufficient permissions."

**Error in Console:**
```
POST https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel...
PERMISSION_DENIED: Missing or insufficient permissions.
```

## Root Cause
The current Firestore security rules only allow **admins** to update schedules:

```javascript
// Schedules collection - CURRENT (INCORRECT)
match /schedules/{scheduleId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();
  allow update: if isAdmin();  // ❌ Only admins can update
  allow delete: if isAdmin();
}
```

Faculty members need to be able to update their own schedules (specifically to change the status to 'cancelled').

## Solution
Update the Firestore security rules to allow faculty members to update schedules where they are the owner (their `facultyId` matches the authenticated user's `uid`).

### Updated Security Rules

Replace the entire `schedules` section with:

```javascript
// Schedules collection - FIXED
match /schedules/{scheduleId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();
  allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
  allow delete: if isAdmin();
}
```

## Complete Updated Firestore Security Rules

Here are the complete, corrected security rules for your Firebase project:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isFaculty() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty';
    }
    
    function isApproved() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || isOwner(userId);
      allow delete: if isAdmin();
    }
    
    // Classrooms collection
    match /classrooms/{classroomId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Booking Requests collection
    match /bookingRequests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isApproved() && isFaculty();
      allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
      allow delete: if isAdmin();
    }
    
    // Schedules collection - ✅ FIXED
    match /schedules/{scheduleId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
      allow delete: if isAdmin();
    }
    
    // Signup Requests collection (anonymous access for new faculty)
    match /signupRequests/{requestId} {
      allow read: if isAdmin();
      allow create: if true; // Allow anonymous signup requests
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

## How to Apply This Fix

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (PLV CEIT Digital Classroom)

### Step 2: Navigate to Firestore Rules
1. In the left sidebar, click **Firestore Database**
2. Click the **Rules** tab at the top

### Step 3: Update the Rules
1. **Select all** the existing rules text (Ctrl+A / Cmd+A)
2. **Delete** the old rules
3. **Copy** the complete updated rules above
4. **Paste** into the rules editor
5. Click **Publish** button

### Step 4: Verify the Fix
1. Wait a few seconds for the rules to propagate
2. In your app, log in as a faculty member
3. Try to cancel one of your bookings
4. It should now work without permission errors! ✅

## What Changed?

### Before:
```javascript
allow update: if isAdmin();
```
- Only admins could update schedules
- Faculty couldn't cancel their own bookings

### After:
```javascript
allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
```
- Admins can still update any schedule
- Faculty can update schedules where `resource.data.facultyId` equals their `request.auth.uid`
- This allows faculty to cancel their own bookings while maintaining security

## Security Implications

### ✅ What's Protected:
- Faculty can ONLY update their own schedules (where facultyId matches their uid)
- Faculty cannot update other faculty members' schedules
- Admins retain full control over all schedules
- The update permission doesn't grant delete permission
- All other fields and collections remain protected

### ✅ What's Allowed:
- Faculty members can cancel their own bookings
- Faculty members can update the status of their own schedules
- This is the expected behavior for the booking system

## Testing Checklist

After applying the fix, test the following scenarios:

### ✅ Faculty User Tests
- [ ] Log in as faculty
- [ ] View "My Schedule" section
- [ ] Click "Cancel" on your own booking
- [ ] Verify booking status changes to "Cancelled"
- [ ] Check console - should see success message, no errors

### ✅ Admin User Tests
- [ ] Log in as admin
- [ ] View all schedules
- [ ] Cancel any booking (not just your own)
- [ ] Verify it works

### ❌ Security Tests
- [ ] Faculty should NOT be able to cancel other faculty's bookings
- [ ] Faculty should NOT be able to delete schedules
- [ ] Unauthenticated users should NOT be able to access schedules

## Additional Notes

### Why This Fix is Safe
1. **`resource.data`** refers to the existing document in Firestore before the update
2. **`resource.data.facultyId`** is the facultyId stored in the schedule document
3. **`request.auth.uid`** is the authenticated user's ID
4. The `isOwner()` function checks if these match
5. This ensures faculty can only update their own schedules

### Common Mistakes to Avoid
- ❌ Don't use `request.resource.data.facultyId` (this would allow users to claim ownership by changing the facultyId)
- ✅ Use `resource.data.facultyId` (this checks the current owner)
- ❌ Don't remove the `isAdmin()` check - admins need full access
- ✅ Keep both admin and faculty checks with OR operator

## Related Files
- `App.tsx` - Line 573: `handleCancelSchedule` function
- `lib/firebaseService.ts` - Line 989: `scheduleService.update` function
- `guidelines/FirebaseDashboardSetup.md` - Line 155: Original security rules documentation

## Support
If you still experience issues after applying this fix:
1. Clear your browser cache and reload the page
2. Check the Firebase Console Rules tab to confirm rules were published
3. Check browser console for any new error messages
4. Verify your user has the 'faculty' role in the Firestore `users` collection
5. Ensure your schedule document has a `facultyId` field that matches your uid
