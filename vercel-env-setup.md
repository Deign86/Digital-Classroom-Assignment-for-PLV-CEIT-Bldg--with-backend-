# Vercel Environment Variable Setup Guide

This guide provides the Vercel CLI commands to securely set the necessary Firebase environment variables for your production and preview deployments.

## Prerequisites

1.  **Install Vercel CLI**: If you haven't already, install the Vercel CLI globally.
    ```bash
    npm install -g vercel
    ```

2.  **Login to Vercel**: Link your local project to your Vercel project.
    ```bash
    vercel login
    vercel link
    ```

## 1. Cleanup Existing Variables

Run these commands to remove any old or incorrect environment variables from your project's `production` and `preview` environments. The `-y` flag confirms the removal automatically.

### Production Cleanup
```bash
vercel env rm VITE_FIREBASE_API_KEY production -y
vercel env rm VITE_FIREBASE_AUTH_DOMAIN production -y
vercel env rm VITE_FIREBASE_PROJECT_ID production -y
vercel env rm VITE_FIREBASE_STORAGE_BUCKET production -y
vercel env rm VITE_FIREBASE_MESSAGING_SENDER_ID production -y
vercel env rm VITE_FIREBASE_APP_ID production -y
vercel env rm VITE_FIREBASE_MEASUREMENT_ID production -y
```

### Preview Cleanup
```bash
vercel env rm VITE_FIREBASE_API_KEY preview -y
vercel env rm VITE_FIREBASE_AUTH_DOMAIN preview -y
vercel env rm VITE_FIREBASE_PROJECT_ID preview -y
vercel env rm VITE_FIREBASE_STORAGE_BUCKET preview -y
vercel env rm VITE_FIREBASE_MESSAGING_SENDER_ID preview -y
vercel env rm VITE_FIREBASE_APP_ID preview -y
vercel env rm VITE_FIREBASE_MEASUREMENT_ID preview -y
```

## 2. Setup Commands

Run the following commands to add the Firebase credentials to your project's `production` and `preview` environments.

### Production Setup
```bash
vercel env add VITE_FIREBASE_API_KEY AIzaSyApNtEkpd38KXPSS60lAQE8dBjZBd8orPQ production
vercel env add VITE_FIREBASE_AUTH_DOMAIN plv-classroom-assigment.firebaseapp.com production
vercel env add VITE_FIREBASE_PROJECT_ID plv-classroom-assigment production
vercel env add VITE_FIREBASE_STORAGE_BUCKET plv-classroom-assigment.firebasestorage.app production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID 361326467083 production
vercel env add VITE_FIREBASE_APP_ID 1:361326467083:web:f83bf156d030dcf463cf0e production
vercel env add VITE_FIREBASE_MEASUREMENT_ID G-BQJCQ8B3H7 production
```

### Preview Setup
```bash
vercel env add VITE_FIREBASE_API_KEY AIzaSyApNtEkpd38KXPSS60lAQE8dBjZBd8orPQ preview
vercel env add VITE_FIREBASE_AUTH_DOMAIN plv-classroom-assigment.firebaseapp.com preview
vercel env add VITE_FIREBASE_PROJECT_ID plv-classroom-assigment preview
vercel env add VITE_FIREBASE_STORAGE_BUCKET plv-classroom-assigment.firebasestorage.app preview
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID 361326467083 preview
vercel env add VITE_FIREBASE_APP_ID 1:361326467083:web:f83bf156d030dcf463cf0e preview
vercel env add VITE_FIREBASE_MEASUREMENT_ID G-BQJCQ8B3H7 preview
```

## 3. Redeploy

After setting the environment variables, trigger new deployments for the changes to take effect.

### Deploy to Preview
To deploy your current branch for preview:
```bash
vercel
```

### Deploy to Production
To deploy to production (usually from the `main` or `master` branch):
```bash
vercel --prod
```

Your application should now be able to connect to Firebase correctly in all environments.
