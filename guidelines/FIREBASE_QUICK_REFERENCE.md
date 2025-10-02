# Firebase Setup Quick Reference

## 🚀 Quick Start Checklist

### 1. Firebase Console Setup (10 minutes)
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Add Web app and copy configuration
- [ ] Enable Email/Password authentication
- [ ] Create Firestore database (Singapore region recommended)
- [ ] Publish security rules (see main guide)

### 2. Local Configuration (5 minutes)
- [ ] Create `.env` file from `.env.example`
- [ ] Add Firebase credentials to `.env`
- [ ] Add admin emails to `VITE_FIREBASE_ADMIN_EMAILS`
- [ ] Run `npm install`

### 3. Create Admin User (5 minutes)
- [ ] Go to Firebase Authentication → Add user
- [ ] Copy User UID
- [ ] Create document in Firestore `users` collection
- [ ] Set role: "admin", status: "approved"

### 4. Test Connection (2 minutes)
- [ ] Run `npm run dev`
- [ ] Login with admin credentials
- [ ] Add a test classroom
- [ ] Verify in Firebase Console

---

## 📝 Required Environment Variables

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph
```

---

## 🗄️ Firestore Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | email, name, role, status |
| `classrooms` | Room inventory | name, capacity, equipment, building |
| `bookingRequests` | Pending bookings | classroomId, facultyId, date, startTime, status |
| `schedules` | Confirmed bookings | classroomId, facultyId, date, startTime |
| `signupRequests` | Faculty signups | email, name, department, status |

---

## 🔐 Security Rules Summary

```javascript
// Users: authenticated read, admin write
// Classrooms: authenticated read, admin write
// Booking Requests: faculty create, admin approve
// Schedules: authenticated read, admin write
// Signup Requests: anonymous create, admin approve
```

---

## 📊 Required Composite Indexes

1. **schedules**: date (ASC) + startTime (ASC)
2. **bookingRequests**: requestDate (DESC)
3. **signupRequests**: requestDate (DESC)

---

## ⚡ Common Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clear and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Missing env variables | Create `.env`, restart server |
| Permission denied | Check security rules, user role |
| Login fails | Verify user in Auth AND Firestore |
| Index required | Click error link to create |
| Port in use | Run `npm run dev -- --port 3000` |

---

## 📚 Full Documentation

- **Complete Setup Guide**: `guidelines/FirebaseDashboardSetup.md`
- **Troubleshooting**: `guidelines/FIREBASE_TROUBLESHOOTING.md`
- **Main README**: `README.MD`

---

## 🎯 Admin User Template

**Firebase Authentication**:
- Email: admin@plv.edu.ph
- Password: admin123456
- Copy UID after creation

**Firestore Document** (`users/{UID}`):
```json
{
  "email": "admin@plv.edu.ph",
  "name": "System Administrator",
  "role": "admin",
  "department": "Registrar",
  "status": "approved",
  "createdAt": "2025-10-03T...",
  "updatedAt": "2025-10-03T..."
}
```

---

## ✅ Verification Steps

1. Login works with admin credentials
2. Can create classroom in app
3. Classroom appears in Firebase Console
4. Can submit booking request as faculty
5. Can approve request as admin
6. Real-time updates work (edit in console, see in app)

---

## 🚀 Ready to Deploy?

1. Build: `npm run build`
2. Test: `npm run preview`
3. Deploy to Vercel/Netlify
4. Add environment variables to hosting platform
5. Update authorized domains in Firebase Console

---

**Need help?** Check `FIREBASE_TROUBLESHOOTING.md` or open a GitHub issue!
