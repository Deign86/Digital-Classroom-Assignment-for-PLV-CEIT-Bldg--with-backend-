# Quick Start Guide - Supabase Backend

## 🚀 Quick Setup (5 Minutes)

### 1. Create Supabase Account
- Go to https://supabase.com and sign up
- Create a new project
- Wait for it to provision (~2-3 minutes)

### 2. Set Up Database
- Open SQL Editor in Supabase dashboard
- Copy and paste contents from `database/schema.sql`
- Click "Run"

### 3. Get Your Credentials
- Go to Project Settings → API
- Copy your:
  - **Project URL**
  - **anon public key**

### 4. Configure Environment
- Open `.env` file in project root
- Replace the placeholders:
```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Switch to Supabase Version
```powershell
# Backup original
mv App.tsx App.original.tsx

# Use Supabase version
mv App.supabase.tsx App.tsx
```

### 6. Run the App
```powershell
npm run dev
```

### 7. Login
- **Admin**: registrar@plv.edu.ph / admin123
- **Faculty**: pgalarosa@plv.edu.ph / faculty123

## ✅ That's It!

Your app now has a real database backend with Supabase.

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `lib/supabaseClient.ts` | Supabase connection setup |
| `lib/supabaseService.ts` | Database operations (CRUD) |
| `database/schema.sql` | Database structure + seed data |
| `App.supabase.tsx` | App with Supabase integration |
| `.env` | Your Supabase credentials |
| `.env.example` | Template for credentials |
| `SUPABASE_SETUP.md` | Detailed setup guide |

---

## 🆘 Common Issues

**Problem**: "Missing Supabase environment variables"
- **Fix**: Restart dev server after updating `.env`

**Problem**: Login doesn't work
- **Fix**: Check that SQL script ran successfully in Supabase

**Problem**: Tables not found
- **Fix**: Re-run the `database/schema.sql` in SQL Editor

---

## 📖 Full Documentation

See `SUPABASE_SETUP.md` for:
- Detailed step-by-step instructions
- Troubleshooting guide
- Security best practices
- Enhancement ideas
- Database schema explanation

---

**Need Help?** Check the browser console (F12) for error messages.
