/**
 * One-off migration script to mark pending bookingRequests whose start time is in the past
 * as rejected. Run locally with a service account or Application Default Credentials.
 *
 * Usage:
 *  - Install dependencies: npm install firebase-admin
 *  - Set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON (or ensure ADC works)
 *  - Run: node scripts/expire_pending_bookings.js
 */

const admin = require('firebase-admin');

async function main() {
  // Initialize admin SDK. Use ADC or GOOGLE_APPLICATION_CREDENTIALS
  try {
    admin.initializeApp();
  } catch (e) {
    // ignore if already initialized in some contexts
  }

  const db = admin.firestore();
  const nowMs = Date.now();

  console.log('Scanning for pending bookingRequests...');
  const snapshot = await db.collection('bookingRequests').where('status', '==', 'pending').get();

  if (snapshot.empty) {
    console.log('No pending requests found.');
    process.exit(0);
  }

  const batch = db.batch();
  let updated = 0;

  snapshot.forEach(doc => {
    const data = doc.data();

    // Try to determine the start time. Prefer explicit timestamp field `startAt`.
    let startMs = null;
    if (data.startAt && data.startAt.toMillis) {
      startMs = data.startAt.toMillis();
    } else if (data.date && data.startTime) {
      // Expect date 'YYYY-MM-DD' and time 'HH:MM' or 'HH:MM:SS'
      try {
        const iso = `${data.date}T${data.startTime}`;
        const parsed = new Date(iso);
        if (!isNaN(parsed.getTime())) startMs = parsed.getTime();
      } catch (e) {
        // ignore
      }
    }

    if (startMs && startMs < nowMs) {
      batch.update(doc.ref, {
        status: 'rejected',
        adminFeedback: 'Auto-rejected (migration): booking date/time has passed',
        resolvedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      updated++;
    }
  });

  if (updated === 0) {
    console.log('No expired pending requests to update.');
    process.exit(0);
  }

  console.log(`Committing updates for ${updated} requests...`);
  await batch.commit();
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
