# Firebase Deployment Guide for Developers

**PLV CEIT Digital Classroom Assignment System**

This comprehensive guide will help developers set up their own Firebase backend for the PLV CEIT Digital Classroom Assignment System.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Authentication Configuration](#authentication-configuration)
4. [Firestore Database Setup](#firestore-database-setup)
5. [Security Rules Configuration](#security-rules-configuration)
6. [Environment Configuration](#environment-configuration)
7. [Email Templates Setup](#email-templates-setup)
8. [Testing Your Setup](#testing-your-setup)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
10. [Best Practices](#best-practices)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ A Google account
- ✅ Node.js (v16 or higher) installed
- ✅ npm or yarn package manager
- ✅ Code editor (VS Code recommended)
- ✅ Access to this project's source code

---

## 1. Firebase Project Setup

### Step 1.1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `plv-ceit-classroom-dev` (or your preferred name)
4. **Google Analytics**: You can disable this for development or enable it for production
5. Click **"Create project"** and wait for setup to complete

### Step 1.2: Register Your Web App

1. In the Firebase Console, click the **Web icon** (`</>`) to add a web app
2. Register app nickname: `PLV CEIT Classroom Web App`
3. **Firebase Hosting**: Check this box if you plan to deploy to Firebase Hosting (optional)
4. Click **"Register app"**
5. **Save your configuration** - you'll need this for the `.env` file

Your Firebase config will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 2. Authentication Configuration

### Step 2.1: Enable Authentication Methods

1. In Firebase Console, navigate to **Build → Authentication**
2. Click **"Get started"** if it's your first time
3. Go to **"Sign-in method"** tab

### Step 2.2: Enable Email/Password Authentication

1. Click on **"Email/Password"**
2. Toggle **"Enable"** to ON
3. **Email link (passwordless sign-in)**: Keep this OFF (we use password-based auth)
4. Click **"Save"**

### Step 2.3: Configure Authorized Domains

1. Go to **"Settings"** tab in Authentication
2. Scroll to **"Authorized domains"**
3. Add your domains:
   - `localhost` (already included)
   - Your production domain (if applicable)

### Step 2.4: Customize Email Templates

1. Go to **"Templates"** tab in Authentication
2. You'll customize these templates:
   - **Email verification**
   - **Password reset**
   - **Email address change**

We'll set these up in detail in Section 7.

---

## 3. Firestore Database Setup

### Step 3.1: Create Firestore Database

1. In Firebase Console, navigate to **Build → Firestore Database**
2. Click **"Create database"**
3. **Start mode**: Select **"Start in production mode"** (we'll add custom rules next)
4. **Location**: Choose a location closest to your users (e.g., `asia-southeast1` for Philippines)
5. Click **"Enable"**

### Step 3.2: Create Collections

Create the following collections manually or they'll be created automatically when data is added:

#### Collection: `users`
```
users/
  └── {userId}/
      ├── email: string
      ├── name: string
      ├── role: string ("faculty" | "admin")
      ├── department: string
      ├── createdAt: timestamp
      ├── approved: boolean
      └── profilePicture?: string
```

#### Collection: `classrooms`
```
classrooms/
  └── {classroomId}/
      ├── roomNumber: string
      ├── floor: number
      ├── building: string
      ├── capacity: number
      ├── facilities: array
      ├── available: boolean
      └── createdAt: timestamp
```

#### Collection: `bookings`
```
bookings/
  └── {bookingId}/
      ├── userId: string
      ├── classroomId: string
      ├── date: string (YYYY-MM-DD)
      ├── startTime: string (HH:mm)
      ├── endTime: string (HH:mm)
      ├── purpose: string
      ├── status: string ("pending" | "approved" | "rejected")
      ├── createdAt: timestamp
      └── approvedBy?: string
```

#### Collection: `schedules`
```
schedules/
  └── {scheduleId}/
      ├── classroomId: string
      ├── facultyId: string
      ├── facultyName: string
      ├── subject: string
      ├── section: string
      ├── dayOfWeek: string
      ├── startTime: string (HH:mm)
      ├── endTime: string (HH:mm)
      └── semester: string
```

---

## 4. Security Rules Configuration

### Step 4.1: Set Firestore Security Rules

1. In Firestore Database, go to **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approved == true;
    }
    
    function isFaculty() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty' &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approved == true;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection rules
    match /users/{userId} {
      // Anyone authenticated can read their own profile
      allow read: if isSignedIn() && isOwner(userId);
      
      // Admins can read all users
      allow read: if isAdmin();
      
      // Users can create their own profile (signup)
      allow create: if isSignedIn() && isOwner(userId) && 
                    request.resource.data.role in ['faculty'] &&
                    request.resource.data.approved == false;
      
      // Users can update their own profile (limited fields)
      allow update: if isSignedIn() && isOwner(userId) &&
                    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'approved']);
      
      // Admins can update any user (for approval)
      allow update: if isAdmin();
      
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // Classrooms collection rules
    match /classrooms/{classroomId} {
      // Anyone authenticated can read classrooms
      allow read: if isSignedIn();
      
      // Only admins can create/update/delete classrooms
      allow create, update, delete: if isAdmin();
    }
    
   // Bookings collection rules (represents reservation requests)
    match /bookings/{bookingId} {
   // Faculty can read their own reservations
      allow read: if isSignedIn() && 
                  (isOwner(resource.data.userId) || isAdmin());
      
   // Admins can read all reservations
      allow list: if isAdmin();
      
   // Faculty can create reservation requests
      allow create: if isFaculty() && 
                    request.resource.data.userId == request.auth.uid &&
                    request.resource.data.status == 'pending';
      
   // Faculty can update their own pending reservation requests
      allow update: if isFaculty() && 
                    isOwner(resource.data.userId) && 
                    resource.data.status == 'pending';
      
   // Admins can update any reservation (for approval/rejection)
      allow update: if isAdmin();
      
   // Users can delete their own pending reservation requests
      allow delete: if isSignedIn() && 
                    isOwner(resource.data.userId) && 
                    resource.data.status == 'pending';
      
   // Admins can delete any reservation
      allow delete: if isAdmin();
    }
    
    // Schedules collection rules
    match /schedules/{scheduleId} {
      // Anyone authenticated can read schedules
      allow read: if isSignedIn();
      
      // Only admins can create/update/delete schedules
      allow create, update, delete: if isAdmin();
    }
  }
}
```

3. Click **"Publish"** to save the rules

### Step 4.2: Verify Rules

Test your rules using the **Rules Playground** in the Firebase Console:

```javascript
// Test as an authenticated user
Auth: { uid: "test-user-id" }
Location: /databases/(default)/documents/users/test-user-id
Operation: get

// Should succeed if the user exists
```

---

## 5. Environment Configuration

### Step 5.1: Create Environment File

1. In your project root, locate `.env.example`
2. Copy it and rename to `.env`:

```bash
cp .env.example .env
```

### Step 5.2: Add Firebase Configuration

Open `.env` and add your Firebase configuration from Step 1.2:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Optional: Firebase Measurement ID (if using Analytics)
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### Step 5.3: Important Security Notes

⚠️ **NEVER commit `.env` to version control!**

- The `.env` file is already in `.gitignore`
- Each developer should have their own `.env` file
- For production, use environment variables in your hosting platform

### Step 5.4: Push Notifications (VAPID) and Admin Config

This project uses Web Push (VAPID) for browser push notifications and a small admin-only callable that can send test pushes. Store VAPID keys and admin email list in Firebase Functions config so they are available at runtime.

1. Generate VAPID keys (one-time):

```bash
npx web-push generate-vapid-keys --json
```

2. Set the VAPID keys in your Firebase functions config (replace values):

```bash
firebase functions:config:set push.vapid_public="<YOUR_PUBLIC_KEY>" push.vapid_private="<YOUR_PRIVATE_KEY>"
```

3. (Optional) Provide a comma-separated list of admin emails for the `testPush` callable:

```bash
firebase functions:config:set admins.emails="admin1@example.com,admin2@example.com"
```

4. Deploy functions:

```bash
firebase deploy --only functions
```

Notes:
- The functions code will read VAPID keys from `functions.config().push.vapid_public` and `functions.config().push.vapid_private` and fall back to environment variables if not set.
- The `testPush` callable checks for a custom claim `admin=true` on the caller or matches the caller email against the `admins.emails` list in functions config.


---

## 6. Email Templates Setup

### Step 6.1: Customize Email Verification Template

1. In Firebase Console, go to **Authentication → Templates**
2. Click on **"Email address verification"**
3. Click **"Edit template"** (pencil icon)
4. Use the template from `email-templates/email-verification-template.html`
5. Make sure to include the `%LINK%` placeholder
6. Save the template

### Step 6.2: Customize Password Reset Template

1. Click on **"Password reset"** in Templates
2. Click **"Edit template"**
3. Copy the content from `email-templates/password-reset-template.html`
4. Paste it into the Firebase template editor
5. Verify these placeholders are present:
   - `%LINK%` - The password reset link
   - `%DISPLAY_NAME%` - The user's name (optional)
6. **Action URL**: Set to your app's password reset page:
   ```
   https://yourdomain.com/reset-password
   ```
   For local development:
   ```
   http://localhost:5173/reset-password
   ```
7. Save the template

### Step 6.3: Customize Email Change Template

1. Click on **"Email address change"** in Templates
2. Click **"Edit template"**
3. Use the template from `email-templates/email-change-template.html`
4. Save the template

### Step 6.4: Configure Sender Information

1. In Templates, click **"Customize"** at the top
2. **From name**: `PLV CEIT Digital Classroom`
3. **From email**: Use `noreply@your-project.firebaseapp.com` or configure a custom domain
4. **Reply-to**: Add a support email if available
5. Save changes

---

## 7. Testing Your Setup

### Step 7.1: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 7.2: Start Development Server

```bash
npm run dev
# or
yarn dev
```

The app should start at `http://localhost:5173`

### Step 7.3: Test Authentication

1. **Sign Up**:
   - Create a new account
   - Check if the user appears in Firestore `users` collection
   - Verify email should be sent

2. **Email Verification**:
   - Check your email for verification link
   - Click the link and verify it works

3. **Sign In**:
   - Try logging in with your credentials
   - Should be redirected to the appropriate dashboard

### Step 7.4: Create First Admin User

**Option 1: Using Firebase Console**

1. Go to **Firestore Database**
2. Find your user document in `users` collection
3. Edit the document:
   - Set `role` to `"admin"`
   - Set `approved` to `true`
4. Save and refresh your app

**Option 2: Using Firebase Authentication Console**

1. Go to **Authentication → Users**
2. Find your user
3. Copy the UID
4. Go to **Firestore Database → users → [your-uid]**
5. Update `role` to `"admin"` and `approved` to `true`

### Step 7.5: Test Admin Functions

1. Log in as admin
2. Try accessing Admin Dashboard
3. Test creating classrooms
4. Test approving users
5. Test managing reservations

---

## 8. Common Issues & Troubleshooting

### Issue 1: "Permission Denied" Errors

**Symptoms**: Cannot read/write to Firestore

**Solutions**:
- ✅ Verify security rules are published
- ✅ Check if user is authenticated
- ✅ Verify user document exists in Firestore
- ✅ Check `approved` field is `true`
- ✅ Verify `role` field is set correctly

### Issue 2: Email Not Sending

**Symptoms**: No verification or reset emails received

**Solutions**:
- ✅ Check spam/junk folder
- ✅ Verify email templates are saved in Firebase
- ✅ Check authorized domains in Authentication settings
- ✅ Verify action URL is correct in templates
- ✅ Check Firebase Console → Authentication → Templates → Activity log

### Issue 3: Environment Variables Not Loading

**Symptoms**: `undefined` Firebase config values

**Solutions**:
- ✅ Ensure `.env` file is in project root
- ✅ Restart development server after editing `.env`
- ✅ Verify variable names start with `VITE_`
- ✅ Check for spaces or quotes in `.env` values

### Issue 4: CORS Errors

**Symptoms**: Cross-origin request blocked

**Solutions**:
- ✅ Add `localhost` to authorized domains
- ✅ Check if the correct authDomain is set
- ✅ Clear browser cache and cookies

### Issue 5: "Missing or Insufficient Permissions"

**Symptoms**: Firestore operations fail

**Solutions**:
- ✅ User document must exist in Firestore
- ✅ Check security rules match function names
- ✅ Verify `approved` field is boolean, not string
- ✅ Re-authenticate the user

---

## 9. Best Practices

### Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` to version control
   - Use different Firebase projects for dev/staging/production
   - Rotate API keys periodically in production

2. **Authentication**:
   - Enforce strong password policies
   - Enable email verification for all users
   - Implement proper session management

3. **Firestore Rules**:
   - Always validate user authentication
   - Use helper functions for role checks
   - Test rules thoroughly before deployment
   - Never allow unrestricted `read` or `write`

4. **Data Validation**:
   - Validate data on client and server (rules)
   - Use TypeScript for type safety
   - Sanitize user inputs

### Performance Best Practices

1. **Firestore Queries**:
   - Use indexes for complex queries
   - Limit query results with pagination
   - Cache frequently accessed data
   - Use compound queries when possible

2. **Authentication**:
   - Implement persistent auth state
   - Use auth state listeners efficiently
   - Cache user data in local storage

3. **Code Splitting**:
   - Lazy load components
   - Use dynamic imports for large modules
   - Optimize bundle size

### Development Workflow

1. **Version Control**:
   - Use feature branches
   - Write descriptive commit messages
   - Review code before merging

2. **Testing**:
   - Test authentication flows
   - Test CRUD operations
   - Test security rules
   - Test edge cases

3. **Documentation**:
   - Document API changes
   - Update README for new features
   - Maintain changelog

---

## 10. Additional Resources

### Firebase Documentation

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

### Project Resources

- **Email Templates**: `/email-templates/`
- **Firebase Config**: `/lib/firebaseConfig.ts`
- **Firebase Service**: `/lib/firebaseService.ts`
- **Guidelines**: `/guidelines/`

### Support

If you encounter issues not covered in this guide:

1. Check Firebase Console logs
2. Review browser console for errors
3. Check Firestore rules simulator
4. Consult Firebase documentation
5. Contact the team lead

---

## Quick Reference Checklist

Use this checklist when setting up a new Firebase project:

- [ ] Create Firebase project
- [ ] Register web app
- [ ] Enable Email/Password authentication
- [ ] Create Firestore database
- [ ] Set up security rules
- [ ] Create `.env` file with Firebase config
- [ ] Customize email templates
- [ ] Install dependencies
- [ ] Test authentication (signup/login)
- [ ] Create first admin user
- [ ] Test admin dashboard
- [ ] Test classroom creation
- [ ] Test booking system
- [ ] Verify email sending

 - [ ] Test admin dashboard
 - [ ] Test classroom creation
 - [ ] Test reservation system
 - [ ] Verify email sending
- [ ] Check security rules in production mode

---

## Deployment Checklist (Production)

Before deploying to production:

- [ ] Use separate Firebase project for production
- [ ] Set strong security rules
- [ ] Enable Firebase App Check (optional)
- [ ] Configure custom domain for emails
- [ ] Set up monitoring and alerts
- [ ] Enable backup for Firestore
- [ ] Test all features in production environment
- [ ] Update authorized domains
- [ ] Set up proper error logging
- [ ] Document production credentials securely

---

**Document Version**: 1.0  
**Last Updated**: October 3, 2025  
**Maintained By**: PLV CEIT Development Team

For questions or updates to this guide, please contact the project maintainers.
