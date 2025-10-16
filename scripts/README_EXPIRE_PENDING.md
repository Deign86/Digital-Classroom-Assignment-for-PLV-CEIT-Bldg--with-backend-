Expire pending bookings migration
=================================

This folder contains a one-off Node script to mark booking requests in `bookingRequests` with
`status === 'pending'` as `rejected` when their start time is already in the past.

How to run (locally):

1. Install dependencies (in the repo root or globally):

```powershell
cd .\scripts
npm install firebase-admin
```

2. Provide credentials:

- Set `GOOGLE_APPLICATION_CREDENTIALS` to point to your service account JSON file, or ensure
  Application Default Credentials are available in your environment.

3. Run the script:

```powershell
node .\expire_pending_bookings.js
```

The script will batch-update pending requests that are in the past and set `status` to `rejected`,
add `adminFeedback`, and set a `resolvedAt` timestamp.

Notes:
- This is a destructive migration in the sense it updates Firestore documents. Review and backup
  your data before running in production.
- Prefer using the scheduled Cloud Function for ongoing automatic cleanup.
