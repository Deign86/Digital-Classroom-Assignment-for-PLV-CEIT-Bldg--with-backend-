### Common Issues and Solutions

#### ❌ "Missing Firebase environment variables"

**Symptoms:**
- App crashes on startup
- Console error: `Missing Firebase environment variables`

**Causes:**
- `.env` file doesn't exist
- Environment variables not prefixed with `VITE_`
- Typos in variable names

**Solutions:**
1. Ensure `.env` file exists in project root
2. Copy from `.env.example` if needed
3. Verify all variables start with `VITE_`
4. Check for typos: `VITE_FIREBASE_API_KEY`, not `VITE_FIREBASE_APIKEY`
5. Restart dev server: `Ctrl+C` then `npm run dev`

---

#### ❌ Firebase connection fails / "Failed to fetch" errors

**Symptoms:**
- Network errors in console
- "FirebaseError: Failed to get document"
- Data doesn't load

**Causes:**
- Wrong Firebase configuration
- Firebase project not initialized
- Network/firewall issues

**Solutions:**
1. Verify credentials in Firebase Console → **Project settings** → **General**
2. Check `.env` values match Firebase config exactly
3. Ensure no extra spaces or quotes in `.env`
4. Verify Firebase project is active (not paused/deleted)
5. Check browser console for specific error messages
6. Try accessing Firebase Console to verify project exists

---

#### ❌ "Permission denied" / "Missing or insufficient permissions"

**Symptoms:**
- Can't read or write to Firestore
- Error: `FirebaseError: Missing or insufficient permissions`

**Causes:**
- Firestore security rules too restrictive
- User not authenticated
- User doesn't have required role

**Solutions:**
1. Check Firestore **Rules** tab for current rules
2. For testing, temporarily use permissive rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Verify user is logged in (check `request.auth != null`)
4. Check user's `role` field in `users` collection
5. Review security rules in Step 7 of setup guide

---

#### ❌ Login fails with correct credentials

**Symptoms:**
- "Invalid email or password" even with correct credentials
- User exists in Firebase Auth but can't login

**Causes:**
- User not in Firebase Authentication
- Missing user document in Firestore `users` collection
- User status is `pending` instead of `approved`
- User ID mismatch between Auth and Firestore

**Solutions:**
1. Check **Firebase Authentication** → **Users** tab
   - User should exist with correct email
2. Check **Firestore** → `users` collection
   - Document ID should match Firebase Auth UID
   - `status` field should be `"approved"`
   - `role` field should be `"admin"` or `"faculty"`
3. Verify email in `VITE_FIREBASE_ADMIN_EMAILS` for admin access
4. Try password reset if password might be wrong
5. Check browser console for specific error messages

---

#### ❌ Signup requests not working / Anonymous users can't sign up

**Symptoms:**
- New faculty can't submit signup requests
- "Permission denied" on signup form

**Causes:**
- Firestore security rules don't allow anonymous writes to `signupRequests`
- Security rules misconfigured

**Solutions:**
1. Check Firestore **Rules** for `signupRequests` collection
2. Ensure this rule exists:
   ```javascript
   match /signupRequests/{requestId} {
     allow read: if isAdmin();
     allow create: if true; // Allow anonymous signup
     allow update: if isAdmin();
     allow delete: if isAdmin();
   }
   ```
3. Publish the updated rules
4. Clear browser cache and try again

---

#### ❌ "The query requires an index"

**Symptoms:**
- Error message with link to create index
- Queries fail with "index required" error

**Causes:**
- Composite indexes not created for complex queries
- Firestore requires indexes for queries with multiple filters/sorts

**Solutions:**
1. **Easy Fix:** Click the link in the error message
   - It automatically creates the required index
2. **Manual Fix:** Go to **Firestore** → **Indexes** → **Composite**
   - Create indexes as described in Step 10
3. Wait 2-5 minutes for index to build
4. Refresh the app

---

#### ❌ Real-time updates not working

**Symptoms:**
- Changes in Firebase Console don't appear in app
- Need to refresh page to see updates

**Causes:**
- Real-time listeners not set up correctly
- Network issues
- Firestore offline persistence issues

**Solutions:**
1. Check browser console for errors
2. Verify Firestore listeners are active:
   ```javascript
   // Should see listeners in firebaseService.ts
   onSnapshot(collection(db, 'collectionName'), (snapshot) => {...})
   ```
3. Try clearing browser cache
4. Check Network tab in DevTools for active connections
5. Restart dev server

---

#### ❌ Admin user can't access admin features

**Symptoms:**
- Logged in but sees faculty dashboard instead
- Admin menu items not showing

**Causes:**
- User `role` is not `"admin"`
- Email not in `VITE_FIREBASE_ADMIN_EMAILS`
- Firestore document not properly configured

**Solutions:**
1. Check Firestore `users` collection
   - Document ID matches Firebase Auth UID
   - `role` field is exactly `"admin"` (case-sensitive)
   - `status` field is `"approved"`
2. Check `.env` file:
   ```bash
   VITE_FIREBASE_ADMIN_EMAILS=your-admin@plv.edu.ph
   ```
3. Restart dev server after `.env` changes
4. Log out and log back in
5. Clear browser cache/cookies

---

#### ❌ Port 5173 already in use

**Symptoms:**
- `npm run dev` fails with "port in use" error
- Can't start development server

**Solutions:**
1. Vite usually auto-assigns next available port
2. Manually specify port: `npm run dev -- --port 3000`
3. Kill process using port 5173:
   ```powershell
   # Find process
   netstat -ano | findstr :5173
   # Kill process (replace PID)
   taskkill /PID <PID> /F
   ```

---

#### ❌ Build fails / TypeScript errors

**Symptoms:**
- `npm run build` fails
- TypeScript compilation errors

**Solutions:**
1. Ensure all dependencies installed: `npm install`
2. Clear node_modules and reinstall:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```
3. Check TypeScript version compatibility
4. Review error messages for specific issues
5. Ensure all imports are correct

---

#### ❌ Data not persisting / disappearing

**Symptoms:**
- Data saves but disappears after refresh
- Changes don't persist

**Causes:**
- Test mode security rules expired (30 days)
- Firestore writes failing silently
- Browser cache issues

**Solutions:**
1. Check Firestore **Rules** expiration date
2. Update security rules (see Step 7)
3. Check browser console for errors
4. Verify writes in Firebase Console
5. Check Network tab for failed requests

---

#### ❌ Email/Password authentication not working

**Symptoms:**
- Can't create users
- "Email already in use" errors

**Causes:**
- Email/password provider not enabled
- Email already exists in Firebase Auth

**Solutions:**
1. Enable Email/Password in **Authentication** → **Sign-in method**
2. Check if email exists: **Authentication** → **Users**
3. Delete duplicate user if needed
4. Ensure email is valid format
5. Password must be at least 6 characters

---

### Need More Help?

1. **Check Browser Console**
   - Press `F12` to open DevTools
   - Look for error messages in Console tab
   - Check Network tab for failed requests

2. **Check Firebase Console**
   - Verify data in Firestore
   - Check Authentication users
   - Review security rules
   - Check Usage tab for quota issues

3. **Review Documentation**
   - [Firebase Documentation](https://firebase.google.com/docs)
   - [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
   - [Firebase Authentication](https://firebase.google.com/docs/auth/web/start)

4. **Common Commands**
   ```powershell
   # Restart dev server
   npm run dev
   
   # Clear and reinstall
   Remove-Item -Recurse -Force node_modules, dist
   npm install
   
   # Build for production
   npm run build
   
   # Preview production build
   npm run preview
   ```

5. **Open an Issue**
   - [GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
   - Include error messages and steps to reproduce
