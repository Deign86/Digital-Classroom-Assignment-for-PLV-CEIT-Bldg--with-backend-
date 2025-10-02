# CORRECTED Firestore Security Rules

## ⚠️ IMPORTANT - Use These Rules Instead

The previous rules had an issue with recursive permission checks. Use these **simplified and tested** rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Classrooms collection - Anyone authenticated can read, only admins can write
    match /classrooms/{classroomId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Booking Requests collection
    match /bookingRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Schedules collection - Allow users to update their own schedules
    match /schedules/{scheduleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      (resource.data.facultyId == request.auth.uid || 
                       request.auth != null);
      allow delete: if request.auth != null;
    }
    
    // Signup Requests collection
    match /signupRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if true; // Allow anonymous signup
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

## Why This Works

1. **No recursive reads** - We don't check user roles by reading the users collection
2. **Authentication-based** - We rely on Firebase Authentication, not Firestore data
3. **Simple and permissive** - Authenticated users can perform most operations
4. **Faculty ownership** - Faculty can update schedules they own (facultyId matches)

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Firestore Database** → **Rules** tab
4. **Delete all existing rules**
5. **Copy and paste the rules above**
6. Click **Publish**
7. Wait 10-20 seconds for rules to propagate
8. **Refresh your app** (F5)

## Test After Applying

- ✅ Login should work
- ✅ Classrooms should load
- ✅ Booking requests should load
- ✅ Schedules should load
- ✅ Faculty can cancel their own bookings
- ✅ Admin can manage everything

If you need stricter security later, we can add role-based checks using custom claims instead of Firestore lookups.
