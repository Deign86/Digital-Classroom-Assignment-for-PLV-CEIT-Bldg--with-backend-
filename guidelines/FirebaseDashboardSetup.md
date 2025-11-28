# Connecting the Digital Classroom Reservation App to Firebase

This comprehensive guide walks you through setting up Firebase for the Digital Classroom Reservation System. You'll learn how to create a Firebase project, configure authentication, set up Firestore, configure security rules, and connect your existing React + Vite codebase to Firebase.

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create a Firebase Project](#2-create-a-firebase-project)
3. [Register Your Web App](#3-register-your-web-app)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Enable Firebase Authentication](#5-enable-firebase-authentication)
6. [Enable Cloud Firestore](#6-enable-cloud-firestore)
7. [Configure Firestore Security Rules](#7-configure-firestore-security-rules)
8. [Create Firestore Collections](#8-create-firestore-collections)
9. [Create Initial Admin User](#9-create-initial-admin-user)
10. [Create Composite Indexes](#10-create-composite-indexes)
11. [Test Your Connection](#11-test-your-connection)
12. [Troubleshooting](#12-troubleshooting)

## 1. Prerequisites

Before you begin, ensure you have:

- ✅ A Google account with access to [Firebase Console](https://console.firebase.google.com/)
- ✅ Node.js 18+ and npm 9+ installed locally
- ✅ This project cloned or downloaded to your local machine
- ✅ Dependencies installed (`npm install`)
- ✅ Basic understanding of Firebase and Firestore concepts

## 2. Create a Firebase Project

1. **Open Firebase Console**
   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create New Project**
   - Click **Add project** or **Create a project**
   - Enter a project name (e.g., `plv-ceit-classroom` or `digital-classroom`)
   - Click **Continue**

3. **Configure Google Analytics** (Optional)
   - Choose whether to enable Google Analytics
   - For development/testing, you can disable it
   - Click **Create project**

4. **Wait for Project Creation**
   - Firebase will provision your project (takes 30-60 seconds)
   - Click **Continue** when the setup is complete

## 3. Register Your Web App

1. **Add a Web App**
   - In your Firebase project dashboard, click the **Web icon** (`</>`) under "Get started by adding Firebase to your app"
   - If you don't see this, go to **Project settings** (gear icon) → **General** tab → scroll to "Your apps" → click **Add app** → select **Web**

2. **Register the App**
   - Enter an app nickname (e.g., `classroom-web` or `plv-ceit-web`)
   - ✅ Check **"Also set up Firebase Hosting"** (optional, for deployment later)
   - Click **Register app**

3. **Copy Configuration**
   - You'll see a Firebase configuration object that looks like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456789012"
   };
   ```

   - **Keep this page open** or copy these values to a text file temporarily
   - You can always access this again from **Project settings** → **General** → **Your apps**

4. **Complete Setup**
   - Click **Continue to console**

## 4. Configure Environment Variables

1. **Locate `.env.example`**
   - In your project root directory, find the `.env.example` file

2. **Create `.env` File**
   - Duplicate `.env.example` and rename it to `.env`
   - Or create a new file named `.env` in the project root

3. **Add Firebase Credentials**
   - Open `.env` and replace the placeholder values with your Firebase config:

   ```bash
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789012
   
   # Admin Emails (comma-separated)
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph,registrar@plv.edu.ph
   ```

4. **Important Notes**
   - ⚠️ Never commit `.env` to Git (it's already in `.gitignore`)
   - ✅ The `VITE_FIREBASE_ADMIN_EMAILS` variable defines which emails automatically get admin role
   - ✅ Vite automatically loads variables prefixed with `VITE_` at build time

## 5. Enable Firebase Authentication

1. **Navigate to Authentication**
   - In Firebase Console left sidebar, click **Build** → **Authentication**
   - Click **Get started**

2. **Enable Email/Password Sign-In**
   - Go to the **Sign-in method** tab
   - Click on **Email/Password** in the providers list
   - Toggle **Enable** to ON
   - You can leave **Email link (passwordless sign-in)** disabled
   - Click **Save**

3. **Configure Authorized Domains** (for deployment)
   - Go to **Authentication** → **Settings** → **Authorized domains**
   - Your Firebase project domain is already authorized
   - Add your production domain when deploying (e.g., `your-app.vercel.app`)

4. **Email Templates** (Optional)
   - Go to **Authentication** → **Templates**
   - Customize password reset, email verification, and other email templates
   - Update sender name and email address

## 6. Enable Cloud Firestore

1. **Navigate to Firestore**
   - From the left sidebar, click **Build** → **Firestore Database**
   - Click **Create database**

2. **Select Location**
   - Choose a Firestore location closest to your users
   - For Philippines: **asia-southeast1 (Singapore)** is recommended
   - ⚠️ **Location cannot be changed later**
   - Click **Next**

3. **Set Security Rules**
   - Select **Start in test mode** for now (allows read/write for 30 days)
   - We'll configure proper rules in the next step
   - Click **Enable**

4. **Wait for Provisioning**
   - Firestore will be created in about 1-2 minutes
   - You'll land on the **Data** tab when ready

## 7. Configure Firestore Security Rules

Proper security rules are crucial for protecting your data. Here are production-ready rules for the Digital Classroom Reservation System:

1. **Navigate to Rules**
   - In Firestore Database, click the **Rules** tab

2. **Replace Default Rules**
   - Copy and paste the following rules:

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
    
      // Booking Requests collection (reservation requests)
      match /bookingRequests/{requestId} {
         allow read: if isAuthenticated();
         allow create: if isApproved() && isFaculty();
         allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
         allow delete: if isAdmin();
      }
    
    // Schedules collection
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

3. **Publish Rules**
   - Click **Publish** to apply the rules
   - These rules will:
     - ✅ Allow only authenticated users to read most data
     - ✅ Allow admins full control over all collections
   - ✅ Allow faculty to create reservation requests
     - ✅ Allow anonymous users to submit signup requests
     - ✅ Prevent unauthorized access and modifications

## 8. Create Firestore Collections

The app requires five main collections. You can create them manually or they'll be created automatically when data is first written.

### Collection Structures

#### `users`
Stores user profiles (linked to Firebase Auth)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `email` | string | User's email address | ✅ |
| `name` | string | Full name | ✅ |
| `role` | string | `"admin"` or `"faculty"` | ✅ |
| `department` | string | Department name | ❌ |
| `status` | string | `"pending"` or `"approved"` | ✅ |
| `createdAt` | timestamp | Account creation date | ✅ |
| `updatedAt` | timestamp | Last modification date | ✅ |

#### `classrooms`
Classroom inventory

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `name` | string | Classroom name (e.g., "CEIT-101") | ✅ |
| `capacity` | number | Maximum capacity | ✅ |
| `equipment` | array | List of equipment (e.g., ["TV", "Projector"]) | ✅ |
| `building` | string | Building name | ✅ |
| `floor` | number | Floor number | ✅ |
| `isAvailable` | boolean | Availability status | ✅ |
| `createdAt` | timestamp | Creation date | ✅ |

#### `bookingRequests`
Pending and processed reservation requests

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `classroomId` | string | Reference to classroom doc ID | ✅ |
| `classroomName` | string | Classroom name (denormalized) | ✅ |
| `facultyId` | string | Reference to user doc ID | ✅ |
| `facultyName` | string | Faculty name (denormalized) | ✅ |
| `date` | string | Date in YYYY-MM-DD format | ✅ |
| `startTime` | string | Time in HH:mm format (24hr) | ✅ |
| `endTime` | string | Time in HH:mm format (24hr) | ✅ |
| `purpose` | string | Reservation purpose/reason | ✅ |
| `status` | string | `"pending"`, `"approved"`, or `"rejected"` | ✅ |
| `adminFeedback` | string | Admin's comment | ❌ |
| `requestDate` | timestamp | When request was made | ✅ |
| `reviewedAt` | timestamp | When admin reviewed | ❌ |

#### `schedules`
Confirmed classroom schedules

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `classroomId` | string | Reference to classroom doc ID | ✅ |
| `classroomName` | string | Classroom name (denormalized) | ✅ |
| `facultyId` | string | Reference to user doc ID | ✅ |
| `facultyName` | string | Faculty name (denormalized) | ✅ |
| `date` | string | Date in YYYY-MM-DD format | ✅ |
| `startTime` | string | Time in HH:mm format (24hr) | ✅ |
| `endTime` | string | Time in HH:mm format (24hr) | ✅ |
| `purpose` | string | Schedule purpose | ✅ |
| `status` | string | `"confirmed"` or `"cancelled"` | ✅ |
| `createdAt` | timestamp | Creation date | ✅ |

#### `signupRequests`
Faculty registration requests

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `email` | string | Requested email address | ✅ |
| `name` | string | Full name | ✅ |
| `department` | string | Department name | ✅ |
| `status` | string | `"pending"`, `"approved"`, or `"rejected"` | ✅ |
| `adminFeedback` | string | Admin's comment | ❌ |
| `requestDate` | timestamp | When request was made | ✅ |
| `reviewedAt` | timestamp | When admin reviewed | ❌ |

### Creating Collections Manually (Optional)

1. In Firestore **Data** tab, click **+ Start collection**
2. Enter collection ID (e.g., `users`)
3. Add a sample document with required fields
4. Repeat for other collections

**Note:** The app will automatically create collections when data is first written, so manual creation is optional.

## 9. Create Initial Admin User

You need at least one admin user to access the system. Here's how to create one:

### Method 1: Using Firebase Authentication Console (Recommended)

1. **Create Auth User**
   - Go to **Authentication** → **Users** tab
   - Click **Add user**
   - Enter email: `admin@plv.edu.ph` (or your preferred admin email)
   - Enter password: `admin123456` (or your preferred password)
   - Click **Add user**
   - Copy the **User UID** from the users list

2. **Create Firestore User Document**
   - Go to **Firestore Database** → **Data** tab
   - Click **+ Start collection** (if users collection doesn't exist) or navigate to existing `users` collection
   - Document ID: **Use the User UID from step 1**
   - Add fields:
     ```
     email: "admin@plv.edu.ph"
     name: "System Administrator"
     role: "admin"
     department: "Registrar"
     status: "approved"
     createdAt: [Click "Add field" → Select "timestamp" → Click "Set to current time"]
     updatedAt: [Same as createdAt]
     ```
   - Click **Save**

3. **Verify in .env**
   - Make sure your `.env` file includes this email in `VITE_FIREBASE_ADMIN_EMAILS`:
   ```bash
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph
   ```

### Method 2: Using Firebase Admin SDK (Advanced)

If you prefer automation, you can create a script:

```javascript
// createAdmin.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  // Your config from .env
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'admin@plv.edu.ph',
      'admin123456'
    );
    
    // Create Firestore document
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: 'admin@plv.edu.ph',
      name: 'System Administrator',
      role: 'admin',
      department: 'Registrar',
      status: 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Admin user created successfully!');
    console.log('UID:', userCredential.user.uid);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdmin();
```

## 10. Create Composite Indexes

Firestore requires indexes for complex queries. Create these indexes to avoid runtime errors:

1. **Navigate to Indexes**
   - Go to **Firestore Database** → **Indexes** tab
   - Click on **Composite** tab

2. **Create Required Indexes**

   Click **Create Index** and add each of these:

   **Index 1: Schedules by Date and Time**
   - Collection ID: `schedules`
   - Fields to index:
     - `date` (Ascending)
     - `startTime` (Ascending)
   - Query scope: Collection
   - Click **Create**

   **Index 2: Reservation Requests by Date**
   - Collection ID: `bookingRequests`
   - Fields to index:
     - `requestDate` (Descending)
   - Query scope: Collection
   - Click **Create**

   **Index 3: Signup Requests by Date**
   - Collection ID: `signupRequests`
   - Fields to index:
     - `requestDate` (Descending)
   - Query scope: Collection
   - Click **Create**

3. **Wait for Index Build**
   - Indexes take 2-5 minutes to build
   - Status will change from "Building" to "Enabled"

**Note:** You can also wait for the app to request indexes. When you encounter an error like *"The query requires an index"*, click the provided link to auto-create the index.

## 11. Test Your Connection

1. **Start the Development Server**
   ```powershell
   npm run dev
   ```

2. **Open the Application**
   - Navigate to `http://localhost:5173` (or the URL shown in terminal)

3. **Test Admin Login**
   - Use the admin credentials you created:
     - Email: `admin@plv.edu.ph`
     - Password: `admin123456`
   - You should see the Admin Dashboard

4. **Verify Firestore Connection**
   - Try adding a classroom
   - Go to Firebase Console → Firestore Database
   - You should see the new classroom document in the `classrooms` collection

5. **Test Real-time Updates**
   - Keep the app open
   - In Firebase Console, manually edit a document
   - The app should update automatically (real-time listeners)

## 12. Troubleshooting

Having issues? Check out the comprehensive troubleshooting guide:
**[FIREBASE_TROUBLESHOOTING.md](./FIREBASE_TROUBLESHOOTING.md)**

### Quick Troubleshooting Tips

- **Missing environment variables**: Check `.env` file exists and restart dev server
- **Permission denied**: Review Firestore security rules (Step 7)
- **Login fails**: Verify user exists in both Firebase Auth AND Firestore `users` collection
- **Index required**: Click the link in error message to auto-create
- **Real-time not working**: Check browser console for errors

---

## 🎉 Setup Complete!

Your Digital Classroom Reservation System is now connected to Firebase! You can:

✅ **Manage everything from Firebase Console**
- View and edit data in Firestore
- Monitor authentication in Auth panel
- Track usage and performance

✅ **Start developing**
- Run `npm run dev` to start the development server
- Login with your admin credentials
- Test all features (reservation flows, approvals, reports)

✅ **Deploy to production**
- Run `npm run build` to create production build
- Deploy to Vercel, Netlify, or your hosting provider
- Add environment variables to deployment platform
- Update authorized domains in Firebase Console

---

## 📚 Additional Resources

### Firebase Documentation
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Authentication Guide](https://firebase.google.com/docs/auth/web/start)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

### Project Documentation
- [Main README](../README.MD)
- [Troubleshooting Guide](./FIREBASE_TROUBLESHOOTING.md)
- [Development Guidelines](./Guidelines.md)

### Community & Support
- [Firebase Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
- [Firebase Community](https://firebase.google.com/community)
- [Project GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)

---

**Need Help?** Open an issue on GitHub or check the troubleshooting guide!

---

**Last Updated**: October 3, 2025  
**Version**: 2.0 (Firebase Edition)
