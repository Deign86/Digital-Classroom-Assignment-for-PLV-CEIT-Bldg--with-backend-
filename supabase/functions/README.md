# Supabase Edge Functions

This directory contains Supabase Edge Functions that run on Deno runtime.

## ⚠️ VS Code TypeScript Errors - Normal!

You'll see TypeScript errors in these files like:
- `Cannot find module 'https://deno.land/...'`
- `Cannot find name 'Deno'`

**This is normal!** These files use Deno imports and APIs, which VS Code doesn't recognize because it's configured for Node.js.

The code will work perfectly when deployed to Supabase Edge Runtime (which uses Deno).

## Functions

### 1. login
Handles user authentication server-side.

**Endpoint**: `/functions/v1/login`

**Request**:
```json
{
  "email": "user@plv.edu.ph",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "faculty",
    "department": "..."
  },
  "session": { ... }
}
```

### 2. approve-signup
Creates user account when admin approves signup request.

**Endpoint**: `/functions/v1/approve-signup`

**Headers**: `Authorization: Bearer <admin-token>`

**Request**:
```json
{
  "signupRequestId": "uuid",
  "password": "temporary-password",
  "adminFeedback": "Welcome!"
}
```

**Response**:
```json
{
  "success": true,
  "user": { ... }
}
```

### 3. reset-password
Sends password reset email.

**Endpoint**: `/functions/v1/reset-password`

**Request**:
```json
{
  "email": "user@plv.edu.ph"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

## Deployment

See `DEPLOY_FUNCTIONS.md` in the root directory for deployment instructions.

## Local Development

```powershell
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Functions available at http://localhost:54321/functions/v1/*
```

## Logs

```powershell
# View logs
supabase functions logs <function-name>

# Stream live logs
supabase functions logs <function-name> --follow
```
