# Quick Reference: Deploy Edge Functions

## One-Time Setup

```powershell
# 1. Install Supabase CLI (choose one method)

# Option A: Using Scoop (Recommended)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Option B: Using Chocolatey
choco install supabase

# Option C: Project-specific (use npx for commands)
npm install supabase --save-dev
# Then use: npx supabase login

# 2. Login
supabase login

# 3. Link project (get ref from dashboard)
supabase link --project-ref your-project-ref

# 4. Set secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

## Deploy Functions

```powershell
# Deploy all at once
supabase functions deploy

# Or deploy individually
supabase functions deploy login
supabase functions deploy approve-signup
supabase functions deploy reset-password
```

## Update Client .env

Remove the service role key from your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# ❌ Remove: VITE_SUPABASE_SERVICE_ROLE_KEY
```

## Test

Visit your app and try:
1. Logging in (uses `login` function)
2. Approving a signup request (uses `approve-signup` function)  
3. Resetting password (uses `reset-password` function)

## View Logs

```powershell
supabase functions logs login --follow
```

Or view in Supabase Dashboard > Edge Functions > Logs

---

**That's it!** Your authentication is now secure and server-side. 🎉
