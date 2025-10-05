# 🚀 Vercel Environment Variables Update Guide

## URGENT: Update these in Vercel Dashboard

Go to: https://vercel.com/[your-username]/[project-name]/settings/environment-variables

Update these variables to match your new Firebase project:

```env
VITE_FIREBASE_API_KEY=AIzaSyApNtEkpd38KXPSS60lAQE8dBjZBd8orPQ
VITE_FIREBASE_AUTH_DOMAIN=plv-classroom-assigment.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=plv-classroom-assigment
VITE_FIREBASE_STORAGE_BUCKET=plv-classroom-assigment.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=361326467083
VITE_FIREBASE_APP_ID=1:361326467083:web:f83bf156d030dcf463cf0e
VITE_FIREBASE_USE_EMULATOR=false
```

## After updating:
1. Redeploy from Vercel dashboard
2. Or push a new commit to trigger auto-deployment

## ⚠️ WARNING:
Until you update Vercel env vars, your live site will still try to connect to the old Firebase project!