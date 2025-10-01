# Supabase Backend Setup Guide
## PLV CEIT Digital Classroom Assignment System

This guide will walk you through setting up Supabase as the backend for your Digital Classroom application.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Supabase Project](#create-supabase-project)
3. [Set Up Database](#set-up-database)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Install Dependencies](#install-dependencies)
6. [Switch to Supabase Version](#switch-to-supabase-version)
7. [Run the Application](#run-the-application)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

- Node.js (v18 or higher)
- A Supabase account (free tier is sufficient)
- Basic understanding of SQL and environment variables

---

## 🚀 Create Supabase Project

### Step 1: Sign Up/Login to Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Sign up with GitHub, Google, or email

### Step 2: Create a New Project

1. Click "New Project" from your dashboard
2. Fill in the project details:
   - **Name**: `plv-digital-classroom` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your location
   - **Pricing Plan**: Free tier is fine for development
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be provisioned

### Step 3: Get Your API Keys

1. Once your project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. **Keep these values handy** - you'll need them in the next steps

---

## 🗄️ Set Up Database

### Step 1: Open SQL Editor

1. In your Supabase dashboard, click on **SQL Editor** in the left sidebar
2. Click "**+ New query**" button

### Step 2: Run the Schema Script

1. Open the file `database/schema.sql` from your project folder
2. Copy **ALL** the contents of the file
3. Paste it into the SQL Editor in Supabase
4. Click "**Run**" (or press Ctrl+Enter / Cmd+Enter)
5. You should see a success message: "Success. No rows returned"

### Step 3: Verify the Setup

1. Click on **Table Editor** in the left sidebar
2. You should now see these tables:
   - `users`
   - `classrooms`
   - `signup_requests`
   - `booking_requests`
   - `schedules`

3. Click on the `users` table - you should see 2 default users:
   - **Admin**: `registrar@plv.edu.ph` (password: `admin123`)
   - **Faculty**: `pgalarosa@plv.edu.ph` (password: `faculty123`)

4. Click on the `classrooms` table - you should see 4 default classrooms (CEIT-101, CEIT-102, CEIT-201, CEIT-LAB1)

✅ **If you see these tables and data, your database is set up correctly!**

---

## 🔐 Configure Environment Variables

### Step 1: Update the .env File

1. In your project root folder, open the `.env` file
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**Where to find these values:**
- `VITE_SUPABASE_URL`: Your Project URL from Step 3 above
- `VITE_SUPABASE_ANON_KEY`: Your "anon public" key from Step 3 above

### Step 2: Save the File

Make sure to **save the .env file** after updating it.

⚠️ **Important:** Never commit the `.env` file to Git! It's already in `.gitignore` to prevent accidental commits.

---

## 📦 Install Dependencies

Open your terminal in the project folder and run:

```powershell
npm install
```

This will install the Supabase client library (`@supabase/supabase-js`) and all other dependencies.

---

## 🔄 Switch to Supabase Version

The application has two versions:
- **App.tsx**: Original version with mock data (localStorage)
- **App.supabase.tsx**: New version with Supabase backend

### To Switch to the Supabase Version:

#### Option 1: Rename Files (Recommended)

```powershell
# Backup the original file
mv App.tsx App.original.tsx

# Use the Supabase version
mv App.supabase.tsx App.tsx
```

#### Option 2: Manual Replacement

1. Delete or rename the current `App.tsx`
2. Rename `App.supabase.tsx` to `App.tsx`

---

## ▶️ Run the Application

### Step 1: Start the Development Server

```powershell
npm run dev
```

### Step 2: Open in Browser

The application should automatically open at `http://localhost:3000`

If it doesn't, manually navigate to: **http://localhost:3000**

### Step 3: Test the Login

Try logging in with the default accounts:

**Admin Account:**
- Email: `registrar@plv.edu.ph`
- Password: `admin123`

**Faculty Account:**
- Email: `pgalarosa@plv.edu.ph`
- Password: `faculty123`

✅ **If you can log in successfully, congratulations! Your Supabase backend is working!**

---

## 🧪 Testing the Features

### Test User Signup Flow

1. Click on "Faculty Request" tab on login page
2. Fill in the signup form with a new email
3. Submit the request
4. Log out and login as admin
5. Go to "Signup Requests" tab
6. Approve or reject the request

### Test Classroom Booking Flow

1. Log in as a faculty member
2. Go to "Book Room" tab
3. Select a classroom, date, and time
4. Submit the booking request
5. Log out and login as admin
6. Go to "Requests" tab
7. Approve or reject the booking request

### Test Classroom Management

1. Log in as admin
2. Go to "Classrooms" tab
3. Add, edit, or delete classrooms
4. Toggle classroom availability

---

## 🔍 Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:**
- Make sure you've created the `.env` file in the project root
- Verify that the variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the development server after changing `.env`

### Issue: "Failed to connect to database"

**Solution:**
- Check that your Supabase project is active (not paused)
- Verify your Supabase URL is correct (should start with `https://` and end with `.supabase.co`)
- Make sure your API key is the "anon public" key, not the "service_role" key

### Issue: Tables are empty or not found

**Solution:**
- Go back to SQL Editor in Supabase
- Re-run the `database/schema.sql` script
- Check for any error messages in the SQL Editor

### Issue: Login doesn't work

**Solution:**
- Verify that the `users` table has data (check in Table Editor)
- Make sure you're using the correct email/password
- Check browser console for error messages (F12 → Console tab)

### Issue: "CORS policy" errors

**Solution:**
- This shouldn't happen with Supabase's anon key
- If it does, check that you're using the correct API key
- Verify in Supabase Project Settings → API that "Enable Row Level Security" is ON

### Issue: Changes not reflecting

**Solution:**
- Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache and local storage
- Restart the development server

---

## 📊 Understanding the Database Structure

### Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | Stores all users (admin & faculty) | email, name, role, password |
| **classrooms** | Available classrooms | name, capacity, equipment, building |
| **signup_requests** | Faculty signup requests awaiting approval | email, name, status |
| **booking_requests** | Classroom booking requests | classroom_id, date, time, status |
| **schedules** | Approved and confirmed bookings | classroom_id, faculty_id, date, time |

### Row Level Security (RLS)

The database uses RLS policies to control access:
- Everyone can read most data (for availability checks)
- Anyone can insert signup/booking requests
- Updates are allowed for status changes

**Note:** In production, you should implement proper authentication and more restrictive RLS policies.

---

## 🔒 Security Best Practices

### For Development

1. ✅ Use the anon (public) key - it's safe for client-side use
2. ✅ Keep RLS enabled - it protects your data
3. ✅ Never commit `.env` file to Git
4. ✅ Use strong passwords for test accounts

### For Production

1. 🔐 Implement Supabase Auth instead of password storage
2. 🔐 Hash passwords if storing them (use bcrypt)
3. 🔐 Add stricter RLS policies based on user roles
4. 🔐 Enable email verification for signups
5. 🔐 Use environment-specific API keys
6. 🔐 Add rate limiting to prevent abuse
7. 🔐 Regular database backups

---

## 🎯 Next Steps

### Enhancements You Can Add

1. **Email Notifications**
   - Send emails when requests are approved/rejected
   - Reminder emails for upcoming bookings
   - Use Supabase Edge Functions + Resend/SendGrid

2. **Real-time Updates**
   - Use Supabase Realtime for live dashboard updates
   - Notify admins instantly when new requests come in

3. **File Uploads**
   - Allow uploading documents for booking requests
   - Store room photos using Supabase Storage

4. **Analytics**
   - Track popular classrooms
   - Generate utilization reports
   - Export data to Excel/PDF

5. **Advanced Scheduling**
   - Recurring bookings
   - Calendar integration
   - Conflict resolution system

---

## 📚 Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase JavaScript Client**: https://supabase.com/docs/reference/javascript/introduction
- **Supabase SQL Editor**: https://supabase.com/docs/guides/database/overview
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

## ✨ Features Enabled by Supabase

✅ Persistent data storage (survives page refresh)
✅ Multi-user support (real database, not localStorage)
✅ Scalable architecture (can handle many users)
✅ Real-time capabilities (optional enhancement)
✅ Built-in authentication system (optional upgrade)
✅ Free hosting and database (generous free tier)
✅ Automatic backups
✅ RESTful API endpoints
✅ Row-level security

---

## 💬 Support

If you encounter any issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review your browser console for errors (F12)
3. Check Supabase logs in the Supabase Dashboard
4. Verify all environment variables are correct
5. Make sure the development server is running

---

## 🎉 Congratulations!

You've successfully integrated Supabase as the backend for your PLV CEIT Digital Classroom Assignment System!

Your application now has:
- ✅ Real database storage
- ✅ Multi-user support
- ✅ Persistent data
- ✅ Scalable architecture
- ✅ Production-ready backend

**Happy coding! 🚀**

---

*Last updated: October 2, 2025*
