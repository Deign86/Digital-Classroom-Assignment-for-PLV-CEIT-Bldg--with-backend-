# ✅ Firebase Setup - Next Steps

Your Firebase credentials have been configured! Here's what to do next:

## 📋 Completed Steps

- ✅ Firebase project created: `plv-ceit-classroom`
- ✅ Web app registered: `classroom-web`
- ✅ Environment variables configured in `.env`
- ✅ Configuration validated

## 🎯 Next Steps (Follow in Order)

### 1. Enable Firebase Authentication (5 minutes)
- [ ] Go to [Firebase Console](https://console.firebase.google.com/project/plv-ceit-classroom)
- [ ] Click **Build** → **Authentication** → **Get started**
- [ ] Enable **Email/Password** sign-in method
- [ ] Click **Save**

### 2. Enable Cloud Firestore (3 minutes)
- [ ] Click **Build** → **Firestore Database** → **Create database**
- [ ] Select location: **asia-southeast1 (Singapore)**
- [ ] Start in **test mode** (we'll update rules next)
- [ ] Click **Enable**

### 3. Configure Security Rules (2 minutes)
- [ ] Go to **Firestore Database** → **Rules** tab
- [ ] Copy rules from `guidelines/FirebaseDashboardSetup.md` (Section 7)
- [ ] **IMPORTANT:** Make sure the schedules section includes faculty update permission:
  ```javascript
  match /schedules/{scheduleId} {
    allow read: if isAuthenticated();
    allow create: if isAdmin();
    allow update: if isAdmin() || (isFaculty() && isOwner(resource.data.facultyId));
    allow delete: if isAdmin();
  }
  ```
- [ ] Click **Publish**

> 📝 **Note:** This allows faculty to cancel their own bookings. See `FIRESTORE_SECURITY_RULES_FIX.md` for details.

### 4. Create Admin User (5 minutes)
- [ ] Go to **Authentication** → **Users** → **Add user**
- [ ] Email: `admin@plv.edu.ph`
- [ ] Password: `admin123456` (or your choice)
- [ ] **Copy the User UID**
- [ ] Go to **Firestore Database** → **Data** → **+ Start collection**
- [ ] Collection ID: `users`
- [ ] Document ID: **Paste the User UID**
- [ ] Add fields:
  ```
  email: "admin@plv.edu.ph"
  name: "System Administrator"
  role: "admin"
  department: "Registrar"
  status: "approved"
  createdAt: [timestamp - set to current time]
  updatedAt: [timestamp - set to current time]
  ```
- [ ] Click **Save**

### 5. Create Composite Indexes (Optional - can wait)
- [ ] Go to **Firestore Database** → **Indexes** → **Composite**
- [ ] Create indexes for:
  - `schedules`: date (ASC) + startTime (ASC)
  - `bookingRequests`: requestDate (DESC)
  - `signupRequests`: requestDate (DESC)

**OR** Wait for app to request them automatically (easier!)

### 6. Test Your Setup (2 minutes)
```powershell
# Start the development server
npm run dev
```

Then:
- [ ] Open http://localhost:5173
- [ ] Login with admin@plv.edu.ph / admin123456
- [ ] You should see the Admin Dashboard! 🎉

---

## 📚 Detailed Instructions

For step-by-step instructions with screenshots and explanations, see:
- **Main Guide**: `guidelines/FirebaseDashboardSetup.md`
- **Quick Reference**: `guidelines/FIREBASE_QUICK_REFERENCE.md`
- **Troubleshooting**: `guidelines/FIREBASE_TROUBLESHOOTING.md`

---

## 🚨 Important Notes

1. **Admin Emails**: The email `admin@plv.edu.ph` is already configured in your `.env` file
   ```
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph,registrar@plv.edu.ph
   ```

2. **Security Rules**: Don't skip step 3! Test mode rules expire in 30 days

3. **User UID**: The Firestore document ID MUST match the Firebase Auth UID

4. **Collections**: Don't worry about creating other collections manually - the app will create them automatically when needed

---

## ⏱️ Estimated Time

- **Minimum setup**: ~15 minutes (Steps 1-4, 6)
- **Complete setup**: ~20 minutes (All steps)

---

## 🆘 Getting Errors?

### "Missing Firebase environment variables"
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Permission denied"
- Check if you published the security rules (Step 3)

### "Invalid email or password"
- Verify user exists in Firebase Authentication
- Check that Firestore document ID matches Auth UID
- Ensure user status is "approved" and role is "admin"

### Other Issues
Check `guidelines/FIREBASE_TROUBLESHOOTING.md` for solutions!

---

**Ready to start?** Follow the steps above or open `guidelines/FirebaseDashboardSetup.md` for detailed instructions!
