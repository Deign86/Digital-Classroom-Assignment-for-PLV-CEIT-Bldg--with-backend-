# Supabase Edge Functions Setup Guide

This guide explains how to deploy and use the Supabase Edge Functions for secure authentication in the Digital Classroom Assignment system.

## What Changed?

We've migrated from client-side authentication (which exposed the service role key in the browser) to **Supabase Edge Functions** for secure server-side authentication.

### Key Improvements:
- ✅ **No service role key in client code** - Much more secure!
- ✅ **Server-side password validation** - Authentication happens on Supabase's edge network
- ✅ **Better session management** - No admin session conflicts
- ✅ **Scalable architecture** - Edge functions can be deployed globally

## Prerequisites

1. **Install Supabase CLI**
   
   **Option A: Using Scoop (Recommended for Windows)**
   ```powershell
   # Install Scoop first if you don't have it
   # Visit: https://scoop.sh/
   
   # Then install Supabase CLI
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   
   **Option B: Using Chocolatey**
   ```powershell
   choco install supabase
   ```
   
   **Option C: Direct Download (Windows)**
   ```powershell
   # Download the latest Windows binary from:
   # https://github.com/supabase/cli/releases
   # Extract and add to your PATH
   ```
   
   **Option D: Using npm (Project-specific, NOT global)**
   ```powershell
   # Install as dev dependency in your project
   npm install supabase --save-dev
   
   # Then use with npx:
   npx supabase login
   ```
   
   ⚠️ **Note**: Global npm install (`npm install -g supabase`) is no longer supported!

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   # Get your project reference from Supabase Dashboard > Settings > General
   supabase link --project-ref your-project-ref
   ```

## Edge Functions Overview

We have three edge functions:

### 1. `login` - Secure authentication
- **Purpose**: Validates email/password server-side
- **Location**: `supabase/functions/login/index.ts`
- **Called by**: LoginForm component when user signs in

### 2. `approve-signup` - Admin user creation
- **Purpose**: Creates user accounts when admin approves signup requests
- **Location**: `supabase/functions/approve-signup/index.ts`
- **Called by**: AdminDashboard when approving faculty requests
- **Requires**: Admin authentication token

### 3. `reset-password` - Password reset
- **Purpose**: Sends password reset emails
- **Location**: `supabase/functions/reset-password/index.ts`
- **Called by**: PasswordResetDialog component

## Deployment Steps

### Step 1: Deploy All Functions

Navigate to your project directory and deploy all functions at once:

```powershell
# Deploy all functions
supabase functions deploy login
supabase functions deploy approve-signup
supabase functions deploy reset-password
```

Or deploy them all at once:

```powershell
supabase functions deploy
```

### Step 2: Set Environment Variables

Edge functions need access to your Supabase credentials via environment variables:

```powershell
# Set Supabase URL
supabase secrets set SUPABASE_URL=https://your-project.supabase.co

# Set service role key (get from Dashboard > Settings > API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Set anon key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Verify Deployment

After deployment, you should see:

```
Deployed Function: login
Function URL: https://your-project.supabase.co/functions/v1/login

Deployed Function: approve-signup
Function URL: https://your-project.supabase.co/functions/v1/approve-signup

Deployed Function: reset-password
Function URL: https://your-project.supabase.co/functions/v1/reset-password
```

### Step 4: Enable Functions in Supabase Dashboard

1. Go to **Supabase Dashboard** > **Edge Functions**
2. Verify all three functions are listed and "Deployed"
3. Check the logs for any errors

### Step 5: Update Client Environment Variables

Your `.env` file should now only contain:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# ❌ REMOVE THIS - No longer needed on client!
# VITE_SUPABASE_SERVICE_ROLE_KEY=...
```

The service role key is now **only** used by the Edge Functions on Supabase's servers.

## Testing Edge Functions

### Test Login Function

```powershell
# Using PowerShell
$body = @{
    email = "test@plv.edu.ph"
    password = "testpassword"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-project.supabase.co/functions/v1/login" `
  -Method Post `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer your-anon-key"
  } `
  -Body $body
```

### Test from Browser Console

You can also test from your app's browser console:

```javascript
// Test login function
const { data, error } = await supabase.functions.invoke('login', {
  body: { 
    email: 'admin@plv.edu.ph', 
    password: 'admin123456' 
  }
});
console.log('Login result:', data);
```

## Monitoring and Logs

### View Function Logs

```powershell
# View logs for a specific function
supabase functions logs login

# Stream live logs
supabase functions logs login --follow
```

### View Logs in Dashboard

1. Go to **Supabase Dashboard** > **Edge Functions**
2. Click on a function name
3. Click on "Logs" tab
4. View real-time execution logs

## Troubleshooting

### Problem: "Function not found"
**Solution**: Make sure you deployed the functions and they appear in the Supabase Dashboard.

### Problem: "Missing service role key"
**Solution**: Set the secrets using `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`

### Problem: "CORS errors"
**Solution**: Edge functions already include CORS headers. Make sure you're calling them from your configured domain.

### Problem: "Admin session lost during user creation"
**Solution**: This is exactly why we moved to Edge Functions! The new approach keeps admin sessions separate from user creation operations.

### Problem: TypeScript errors in VS Code
**Solution**: The Deno imports (`https://deno.land/...`) are expected. These work when deployed to Supabase Edge Runtime (which uses Deno). VS Code shows errors because it expects Node.js modules.

## Local Development

To test Edge Functions locally:

```powershell
# Start local Supabase (includes Edge Functions)
supabase start

# Deploy functions locally
supabase functions serve

# Your functions will be available at:
# http://localhost:54321/functions/v1/login
# http://localhost:54321/functions/v1/approve-signup
# http://localhost:54321/functions/v1/reset-password
```

Update your `.env.local` for local development:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

## Architecture Diagram

```
┌─────────────────┐
│   React App     │
│  (Browser)      │
└────────┬────────┘
         │
         │ HTTPS (Anon Key Only)
         │
┌────────▼────────────────────────────────────────┐
│         Supabase Edge Functions                 │
│  ┌──────────┐ ┌────────────────┐ ┌───────────┐│
│  │  login   │ │ approve-signup │ │  reset-   ││
│  │          │ │                │ │  password ││
│  └──────────┘ └────────────────┘ └───────────┘│
│         │              │              │         │
│         └──────────────┴──────────────┘         │
│                        │                        │
│              Service Role Key                   │
│              (Server-side only)                 │
└────────────────────┬───────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │  Supabase Auth       │
         │  Postgres Database   │
         └──────────────────────┘
```

## Security Benefits

### Before (Client-side):
- ❌ Service role key exposed in browser
- ❌ Anyone could inspect and steal the key
- ❌ Admin operations could be spoofed
- ❌ Session conflicts during user creation

### After (Edge Functions):
- ✅ Service role key never leaves Supabase servers
- ✅ Authentication happens server-side only
- ✅ Admin operations are properly authorized
- ✅ Clean session management
- ✅ Better logging and monitoring

## Next Steps

1. **Deploy the functions** using the commands above
2. **Remove the service role key** from your `.env` file
3. **Test login** to verify everything works
4. **Test signup approval** as an admin
5. **Monitor logs** for any errors

## Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

---

**Need Help?** Check the Supabase Dashboard > Edge Functions > Logs for detailed error messages.
