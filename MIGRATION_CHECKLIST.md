# Supabase Migration Checklist

Use this checklist to ensure you've completed all setup steps correctly.

## Pre-Setup

- [ ] Node.js installed (v18+)
- [ ] Project dependencies installed (`npm install` already run)
- [ ] Access to the project folder

## Supabase Account Setup

- [ ] Created Supabase account at https://supabase.com
- [ ] Created a new project
- [ ] Project is fully provisioned (status shows "Active")
- [ ] Copied Project URL from Project Settings → API
- [ ] Copied anon public key from Project Settings → API

## Database Setup

- [ ] Opened SQL Editor in Supabase dashboard
- [ ] Opened `database/schema.sql` file from project
- [ ] Copied ALL contents of schema.sql
- [ ] Pasted into Supabase SQL Editor
- [ ] Clicked "Run" and saw success message
- [ ] Verified tables exist in Table Editor:
  - [ ] users (with 2 default users)
  - [ ] classrooms (with 4 default rooms)
  - [ ] signup_requests
  - [ ] booking_requests
  - [ ] schedules

## Environment Configuration

- [ ] Located `.env` file in project root
- [ ] Replaced `your_supabase_project_url` with actual Project URL
- [ ] Replaced `your_supabase_anon_key` with actual anon key
- [ ] Saved the `.env` file
- [ ] Verified no spaces around the `=` signs

## File Migration

Choose one method:

### Method 1: Rename (Recommended)
- [ ] Backed up original: `mv App.tsx App.original.tsx`
- [ ] Renamed Supabase version: `mv App.supabase.tsx App.tsx`

### Method 2: Manual
- [ ] Deleted or renamed current `App.tsx`
- [ ] Renamed `App.supabase.tsx` to `App.tsx`

## Testing

- [ ] Started dev server: `npm run dev`
- [ ] Application opened in browser (http://localhost:3000)
- [ ] No console errors visible (F12 → Console)
- [ ] Login page displays correctly

### Admin Login Test
- [ ] Logged in as admin (registrar@plv.edu.ph / admin123)
- [ ] Dashboard loads successfully
- [ ] Can see all tabs: Overview, Classrooms, Requests, Signup Requests, Schedules, Reports
- [ ] Classrooms tab shows 4 classrooms
- [ ] Logged out successfully

### Faculty Login Test
- [ ] Logged in as faculty (pgalarosa@plv.edu.ph / faculty123)
- [ ] Dashboard loads successfully
- [ ] Can see all tabs: Overview, Book Room, Search, My Schedule, My Requests
- [ ] Can view classrooms in Book Room tab
- [ ] Logged out successfully

### Signup Flow Test
- [ ] Clicked "Faculty Request" tab on login page
- [ ] Filled in signup form with test data
- [ ] Submitted successfully
- [ ] Saw success message
- [ ] Logged in as admin
- [ ] Found new request in Signup Requests tab
- [ ] Approved the request
- [ ] Verified new user can log in

### Booking Flow Test
- [ ] Logged in as faculty
- [ ] Created a booking request
- [ ] Saw success message
- [ ] Logged in as admin
- [ ] Found request in Requests tab
- [ ] Approved the booking
- [ ] Verified booking appears in Schedules

## Verification

- [ ] Data persists after page refresh
- [ ] Can log in from different browser/device
- [ ] No "localStorage" related console warnings
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Conflict detection works for overlapping bookings

## Documentation Review

- [ ] Read through `SUPABASE_SETUP.md`
- [ ] Bookmarked for future reference
- [ ] Noted troubleshooting section
- [ ] Understood security implications

## Optional (Production Readiness)

- [ ] Changed default passwords for admin/faculty accounts
- [ ] Added more test data for classrooms
- [ ] Reviewed Row Level Security policies
- [ ] Set up database backups
- [ ] Planned authentication upgrade (Supabase Auth)
- [ ] Considered email notification system

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

- [ ] Stop the dev server (Ctrl+C)
- [ ] Restore original: `mv App.original.tsx App.tsx`
- [ ] Delete Supabase version if needed
- [ ] Restart server: `npm run dev`

---

## ✅ Success Criteria

You've successfully completed the migration if:

1. ✅ You can log in with default accounts
2. ✅ Data persists after refresh
3. ✅ Admin can approve/reject requests
4. ✅ Faculty can create booking requests
5. ✅ Schedules are visible to all users
6. ✅ No console errors

## 🎉 Next Steps

Once everything is working:

1. Customize the application for your needs
2. Add more classrooms, users, etc.
3. Consider implementing suggested enhancements
4. Deploy to production (see DEPLOYMENT.md)

---

**Questions or Issues?**

- Check the Troubleshooting section in `SUPABASE_SETUP.md`
- Review browser console for errors
- Check Supabase logs in dashboard
- Verify environment variables are correct

---

*Version: 1.0 | Last Updated: October 2, 2025*
